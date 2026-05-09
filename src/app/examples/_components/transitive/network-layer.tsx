"use client";

import { useEffect } from "react";
import type {
  DataDrivenPropertyValueSpecification,
  GeoJSONSource,
} from "maplibre-gl";

import { useMap } from "@/registry/map";

import type { FocusState } from "./focus";
import { LANE_GAP_PX, interpolateEdge, renderedEdges } from "./graph";
import { NOT_FOCUSED_COLOR } from "./styler";
import type { RenderedEdge } from "./types";

const WIDTH_STOPS: Array<[number, number]> = [
  [9, 2],
  [11, 4],
  [13, 7],
  [15, 11],
  [17, 14],
];

const SOURCE = (id: string) => `transitive-${id}-source`;
const LAYER = (id: string) => `transitive-${id}-layer`;

function isEdgeFocused(edge: RenderedEdge, focus: FocusState): boolean {
  if (edge.mode === "walk") return focus.walkIds.has(edge.edge_id);
  return focus.patternIds.has(edge.pattern_id);
}

function lineSortKey(edge: RenderedEdge, focused: boolean): number {
  if (!focused) return 0;
  if (edge.mode === "walk") return 5;
  if (edge.route_id === "RED") return 4;
  return 3;
}

function widthMultiplier(edge: RenderedEdge): number {
  return edge.mode === "walk" ? 0.6 : edge.width;
}

/** Zoom-interpolated line width in pixels. `edge.width` is a 0..1 multiplier. */
function lineWidthExpression(
  edge: RenderedEdge,
): DataDrivenPropertyValueSpecification<number> {
  const base = widthMultiplier(edge);
  const stops: (number | string | unknown[])[] = [];
  for (const [zoom, px] of WIDTH_STOPS) {
    stops.push(zoom, px * base);
  }
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    ...stops,
  ] as DataDrivenPropertyValueSpecification<number>;
}

/**
 * Lane offset scales with the line width at each zoom stop so adjacent
 * bundle members keep a constant `LANE_GAP_PX` gap regardless of zoom.
 * `edge.offset` is a lane index (±0.5 for two lanes, etc.), not a pixel.
 */
function lineOffsetExpression(
  edge: RenderedEdge,
): DataDrivenPropertyValueSpecification<number> {
  if (edge.offset === 0) return 0;
  const lane = edge.offset;
  const base = widthMultiplier(edge);
  const stops: (number | string | unknown[])[] = [];
  for (const [zoom, px] of WIDTH_STOPS) {
    stops.push(zoom, lane * (px * base + LANE_GAP_PX));
  }
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    ...stops,
  ] as DataDrivenPropertyValueSpecification<number>;
}

export function TransitiveNetworkLayer({
  progress,
  focus,
}: {
  progress: number;
  focus: FocusState;
}) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    const add = () => {
      for (const edge of renderedEdges) {
        const data: GeoJSON.Feature<GeoJSON.LineString> = {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: interpolateEdge(edge, progress),
          },
        };

        map.addSource(SOURCE(edge.edge_id), { type: "geojson", data });
        map.addLayer({
          id: LAYER(edge.edge_id),
          type: "line",
          source: SOURCE(edge.edge_id),
          layout: {
            "line-cap": "round",
            "line-join": "round",
            "line-sort-key": lineSortKey(edge, isEdgeFocused(edge, focus)),
          },
          paint: {
            "line-color": isEdgeFocused(edge, focus)
              ? edge.color
              : NOT_FOCUSED_COLOR,
            "line-width": lineWidthExpression(edge),
            "line-opacity":
              edge.mode === "walk"
                ? 0.95
                : isEdgeFocused(edge, focus)
                  ? 0.95
                  : 0.55,
            "line-offset": lineOffsetExpression(edge),
            ...(edge.dashArray && { "line-dasharray": edge.dashArray }),
          },
        });
      }
    };

    if (map.isStyleLoaded()) add();
    else map.once("load", add);

    return () => {
      for (const edge of [...renderedEdges].reverse()) {
        try {
          if (map.getLayer(LAYER(edge.edge_id))) {
            map.removeLayer(LAYER(edge.edge_id));
          }
          if (map.getSource(SOURCE(edge.edge_id))) {
            map.removeSource(SOURCE(edge.edge_id));
          }
        } catch {
          // tearing down on hot reload — ignore
        }
      }
    };
  }, [isLoaded, map]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!map || !isLoaded) return;
    for (const edge of renderedEdges) {
      const source = map.getSource(SOURCE(edge.edge_id)) as
        | GeoJSONSource
        | undefined;
      source?.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: interpolateEdge(edge, progress),
        },
      });
    }
  }, [isLoaded, map, progress]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    for (const edge of renderedEdges) {
      const layerId = LAYER(edge.edge_id);
      if (!map.getLayer(layerId)) continue;
      const focused = isEdgeFocused(edge, focus);
      map.setPaintProperty(
        layerId,
        "line-color",
        focused ? edge.color : NOT_FOCUSED_COLOR,
      );
      map.setPaintProperty(
        layerId,
        "line-opacity",
        edge.mode === "walk" ? 0.95 : focused ? 0.95 : 0.5,
      );
      map.setLayoutProperty(layerId, "line-sort-key", lineSortKey(edge, focused));
    }
  }, [isLoaded, map, focus]);

  return null;
}
