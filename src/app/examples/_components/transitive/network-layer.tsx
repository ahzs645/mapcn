"use client";

import { useEffect } from "react";
import type {
  DataDrivenPropertyValueSpecification,
  GeoJSONSource,
} from "maplibre-gl";

import { useMap } from "@/registry/map";

import type { FocusState } from "./focus";
import {
  LANE_GAP_PX,
  dotPosition,
  dotVertices,
  interpolateEdge,
  renderedEdges,
} from "./graph";
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
const DOTS_SOURCE = "transitive-dots-source";
const DOTS_LAYER = "transitive-dots-layer";

function dotsFeature(progress: number): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: dotVertices.map((d) => ({
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: dotPosition(d, progress) },
    })),
  };
}

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
  const base = edge.width;
  const stops: (number | string | unknown[])[] = [];
  for (const [zoom, px] of WIDTH_STOPS) stops.push(zoom, px * base);
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    ...stops,
  ] as DataDrivenPropertyValueSpecification<number>;
}

/**
 * Lane offset scales with line width at each zoom stop so adjacent bundle
 * members keep a constant `LANE_GAP_PX` gap. `edge.offset` is a lane index
 * (±0.5 for two lanes), not a pixel — this is the ONLY lane separation, applied
 * identically in the schematic and geographic regimes.
 */
function lineOffsetExpression(
  edge: RenderedEdge,
): DataDrivenPropertyValueSpecification<number> {
  if (edge.offset === 0) return 0;
  const lane = edge.offset;
  const base = edge.width;
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

function featureFor(
  edge: RenderedEdge,
  progress: number,
): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: interpolateEdge(edge, progress),
    },
  };
}

export function TransitiveNetworkLayer({
  progress,
  focus,
}: {
  progress: number;
  focus: FocusState;
}) {
  const { map } = useMap();

  // Mount sources/layers. We do NOT gate on the context `isLoaded` flag —
  // maplibre's `loaded()` / `isStyleLoaded()` can report false negatives even
  // when the map is fully ready, which would leave the lines unmounted. Instead
  // add as soon as the style is ready and re-add on every `styledata` (idempotent
  // because we skip already-present sources), so a style/theme reload re-mounts.
  useEffect(() => {
    if (!map) return;

    const add = () => {
      for (const edge of renderedEdges) {
        if (map.getSource(SOURCE(edge.edge_id))) continue;
        map.addSource(SOURCE(edge.edge_id), {
          type: "geojson",
          data: featureFor(edge, progress),
        });
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
              edge.mode === "walk" ? 0.95 : isEdgeFocused(edge, focus) ? 0.95 : 0.55,
            "line-offset": lineOffsetExpression(edge),
            ...(edge.dashArray && { "line-dasharray": edge.dashArray }),
          },
        });
      }

      // station dots strung along the lines, drawn on top
      if (!map.getSource(DOTS_SOURCE)) {
        map.addSource(DOTS_SOURCE, {
          type: "geojson",
          data: dotsFeature(progress),
        });
        map.addLayer({
          id: DOTS_LAYER,
          type: "circle",
          source: DOTS_SOURCE,
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              11,
              2,
              13,
              3,
              15,
              4.5,
            ],
            "circle-color": "#ffffff",
            "circle-stroke-color": "#8b9097",
            "circle-stroke-width": 1,
          },
        });
      }
    };

    if (map.isStyleLoaded()) add();
    map.on("styledata", add);

    return () => {
      map.off("styledata", add);
      try {
        if (map.getLayer(DOTS_LAYER)) map.removeLayer(DOTS_LAYER);
        if (map.getSource(DOTS_SOURCE)) map.removeSource(DOTS_SOURCE);
      } catch {
        // ignore teardown races
      }
      for (const edge of [...renderedEdges].reverse()) {
        try {
          if (map.getLayer(LAYER(edge.edge_id))) map.removeLayer(LAYER(edge.edge_id));
          if (map.getSource(SOURCE(edge.edge_id))) map.removeSource(SOURCE(edge.edge_id));
        } catch {
          // tearing down on hot reload — ignore
        }
      }
    };
  }, [map]); // eslint-disable-line react-hooks/exhaustive-deps

  // re-morph geometry as progress changes
  useEffect(() => {
    if (!map) return;
    for (const edge of renderedEdges) {
      const source = map.getSource(SOURCE(edge.edge_id)) as
        | GeoJSONSource
        | undefined;
      source?.setData(featureFor(edge, progress));
    }
    const dotsSrc = map.getSource(DOTS_SOURCE) as GeoJSONSource | undefined;
    dotsSrc?.setData(dotsFeature(progress));
  }, [map, progress]);

  // recolor on focus change
  useEffect(() => {
    if (!map) return;
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
  }, [map, focus]);

  return null;
}
