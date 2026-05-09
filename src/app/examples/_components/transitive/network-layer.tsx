"use client";

import { useEffect } from "react";
import type {
  DataDrivenPropertyValueSpecification,
  GeoJSONSource,
} from "maplibre-gl";

import { useMap } from "@/registry/map";

import type { FocusState } from "./focus";
import { interpolateEdge, renderedEdges } from "./graph";
import { NOT_FOCUSED_COLOR } from "./styler";
import type { RenderedEdge } from "./types";

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

/** Zoom-interpolated line width in pixels. `edge.width` is a 0..1 multiplier. */
function lineWidthExpression(
  edge: RenderedEdge,
): DataDrivenPropertyValueSpecification<number> {
  const base = edge.mode === "walk" ? 1 : edge.width;
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    10,
    1.5 * base,
    12,
    3 * base,
    14,
    6 * base,
    16,
    10 * base,
  ];
}

/** Zoom-interpolated lane offset so bundles don't fly apart at low zoom. */
function lineOffsetExpression(
  edge: RenderedEdge,
): DataDrivenPropertyValueSpecification<number> {
  if (edge.offset === 0) return 0;
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    10,
    edge.offset * 0.35,
    13,
    edge.offset * 0.7,
    15,
    edge.offset,
  ];
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
