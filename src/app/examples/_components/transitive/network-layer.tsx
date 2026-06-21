"use client";

import { useEffect } from "react";
import type { DataDrivenPropertyValueSpecification } from "maplibre-gl";

import { useMap } from "@/registry/map";

import type { LayoutEdge, TransitiveLayout } from "./engine/layout";
import type { FocusState } from "./focus";
import { NOT_FOCUSED_COLOR } from "./styler";

/** Gap (px) between sibling lines on top of their stroke width. */
const LANE_GAP_PX = 4;

const WIDTH_STOPS: Array<[number, number]> = [
  [9, 2],
  [11, 4],
  [13, 7],
  [15, 11],
  [17, 14],
];

const idFor = (edge: LayoutEdge) => edge.id.replace(/[^a-zA-Z0-9_-]/g, "-");
const SOURCE = (edge: LayoutEdge) => `transitive-${idFor(edge)}-source`;
const LAYER = (edge: LayoutEdge) => `transitive-${idFor(edge)}-layer`;

function isEdgeFocused(edge: LayoutEdge, focus: FocusState): boolean {
  if (edge.mode === "walk") return focus.walkIds.has(edge.patternId);
  return focus.patternIds.has(edge.patternId);
}

function lineSortKey(edge: LayoutEdge, focused: boolean): number {
  if (!focused) return 0;
  if (edge.mode === "walk") return 5;
  if (edge.routeId === "RED") return 4;
  return 3;
}

/** Zoom-interpolated line width in px. `edge.width` is a 0..1 multiplier. */
function lineWidthExpression(
  edge: LayoutEdge,
): DataDrivenPropertyValueSpecification<number> {
  const stops: (number | string | unknown[])[] = [];
  for (const [zoom, px] of WIDTH_STOPS) stops.push(zoom, px * edge.width);
  return ["interpolate", ["linear"], ["zoom"], ...stops] as DataDrivenPropertyValueSpecification<number>;
}

/**
 * Lane offset scales with the line width at each zoom stop so adjacent bundle
 * members keep a constant gap. `edge.laneOffset` is a lane index (±0.5 for two
 * lanes), not a pixel.
 */
function lineOffsetExpression(
  edge: LayoutEdge,
): DataDrivenPropertyValueSpecification<number> {
  if (edge.laneOffset === 0) return 0;
  const lane = edge.laneOffset;
  const stops: (number | string | unknown[])[] = [];
  for (const [zoom, px] of WIDTH_STOPS) {
    stops.push(zoom, lane * (px * edge.width + LANE_GAP_PX));
  }
  return ["interpolate", ["linear"], ["zoom"], ...stops] as DataDrivenPropertyValueSpecification<number>;
}

export function TransitiveNetworkLayer({
  layout,
  focus,
}: {
  layout: TransitiveLayout;
  focus: FocusState;
}) {
  const { map, isLoaded } = useMap();

  // Add / remove the line layers. Re-runs when the layout (partition) swaps —
  // the cleanup removes exactly the edges this run added.
  useEffect(() => {
    if (!map || !isLoaded) return;

    const add = () => {
      for (const edge of layout.edges) {
        const data: GeoJSON.Feature<GeoJSON.LineString> = {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: edge.coords },
        };
        if (map.getSource(SOURCE(edge))) continue;
        map.addSource(SOURCE(edge), { type: "geojson", data });
        map.addLayer({
          id: LAYER(edge),
          type: "line",
          source: SOURCE(edge),
          layout: {
            "line-cap": "round",
            "line-join": "round",
            "line-sort-key": lineSortKey(edge, isEdgeFocused(edge, focus)),
          },
          paint: {
            "line-color": isEdgeFocused(edge, focus) ? edge.color : NOT_FOCUSED_COLOR,
            "line-width": lineWidthExpression(edge),
            "line-opacity":
              edge.mode === "walk" ? 0.95 : isEdgeFocused(edge, focus) ? 0.95 : 0.55,
            "line-offset": lineOffsetExpression(edge),
            ...(edge.dashArray && { "line-dasharray": edge.dashArray }),
          },
        });
      }
    };

    // `isLoaded` (from the map context) already gates on the style being ready,
    // so add directly — mirrors the registry's own layer components. We avoid
    // `map.isStyleLoaded()` here because it can report false even when the map
    // is fully ready to accept sources/layers.
    add();

    return () => {
      for (const edge of [...layout.edges].reverse()) {
        try {
          if (map.getLayer(LAYER(edge))) map.removeLayer(LAYER(edge));
          if (map.getSource(SOURCE(edge))) map.removeSource(SOURCE(edge));
        } catch {
          // tearing down on hot reload / partition swap — ignore
        }
      }
    };
  }, [isLoaded, map, layout]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recolor / restyle on focus change (no layout rebuild).
  useEffect(() => {
    if (!map || !isLoaded) return;
    for (const edge of layout.edges) {
      const layerId = LAYER(edge);
      if (!map.getLayer(layerId)) continue;
      const focused = isEdgeFocused(edge, focus);
      map.setPaintProperty(layerId, "line-color", focused ? edge.color : NOT_FOCUSED_COLOR);
      map.setPaintProperty(
        layerId,
        "line-opacity",
        edge.mode === "walk" ? 0.95 : focused ? 0.95 : 0.5,
      );
      map.setLayoutProperty(layerId, "line-sort-key", lineSortKey(edge, focused));
    }
  }, [isLoaded, map, layout, focus]);

  return null;
}
