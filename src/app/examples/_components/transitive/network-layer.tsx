"use client";

import { useEffect } from "react";
import type {
  DataDrivenPropertyValueSpecification,
  GeoJSONSource,
} from "maplibre-gl";

import { useMap } from "@/registry/map";

import type { FocusState } from "./focus";
import {
  CORNER_RADIUS_M,
  LANE_GAP_PX,
  dotPosition,
  dotVertices,
  interpolateEdge,
  renderedEdges,
  roundCorners,
} from "./graph";
import { offsetPolyline } from "./engine/bundle";
import { NOT_FOCUSED_COLOR, metersPerPixel, zoomToProgress } from "./styler";
import type { RenderedEdge } from "./types";

const LAT0 = 38.9;

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

/** Rail line width in px at a zoom (the lane-spacing reference). */
function railWidthPx(zoom: number): number {
  if (zoom <= WIDTH_STOPS[0][0]) return WIDTH_STOPS[0][1];
  const last = WIDTH_STOPS[WIDTH_STOPS.length - 1];
  if (zoom >= last[0]) return last[1];
  for (let i = 1; i < WIDTH_STOPS.length; i++) {
    const [z0, w0] = WIDTH_STOPS[i - 1];
    const [z1, w1] = WIDTH_STOPS[i];
    if (zoom <= z1) return w0 + (w1 - w0) * ((zoom - z0) / (z1 - z0));
  }
  return last[1];
}

/** Metres per lane at the current zoom, so baked offsets stay pixel-constant. */
function laneWidthMetres(zoom: number): number {
  return (railWidthPx(zoom) + LANE_GAP_PX) * metersPerPixel(LAT0, zoom);
}

function lineWidthExpression(
  edge: RenderedEdge,
): DataDrivenPropertyValueSpecification<number> {
  const stops: (number | string | unknown[])[] = [];
  for (const [zoom, px] of WIDTH_STOPS) stops.push(zoom, px * edge.width);
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    ...stops,
  ] as DataDrivenPropertyValueSpecification<number>;
}

/**
 * Walk opacity — combined: hidden at the schematic, revealed as the network
 * morphs toward geographic (see graph.ts); unfocused walks hidden entirely.
 */
function walkOpacity(focused: boolean, progress: number): number {
  if (!focused) return 0;
  const gate = Math.max(0, Math.min(1, (progress - 0.05) / 0.4));
  return 0.95 * gate;
}

/**
 * The rendered geometry for an edge: morph schematic↔geo, fillet the elbows,
 * then BAKE the alignment-bundle lane offset (per-end, metres → pixel-constant)
 * perpendicular into the geometry. Pure data layers (line-offset) can't do the
 * per-end taper, so this is computed here and re-baked whenever the zoom changes.
 */
function featureFor(
  edge: RenderedEdge,
  progress: number,
  zoom: number,
): GeoJSON.Feature<GeoJSON.LineString> {
  const morphed = interpolateEdge(edge, progress);
  let coords: import("./types").LngLat[];
  if (edge.mode === "walk") {
    coords = morphed;
  } else {
    const rounded = roundCorners(morphed, CORNER_RADIUS_M * (1 - progress));
    const lw = laneWidthMetres(zoom);
    coords = offsetPolyline(
      rounded,
      (edge.fromLane ?? 0) * lw,
      (edge.toLane ?? 0) * lw,
    );
  }
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates: coords },
  };
}

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

export function TransitiveNetworkLayer({
  progress,
  focus,
}: {
  progress: number;
  focus: FocusState;
}) {
  const { map } = useMap();

  // Mount sources/layers + drive the per-frame geometry rebake. We rebake on
  // every zoom change (not just `progress`) because the baked lane offset is
  // pixel-constant and so depends on the live zoom, not only the morph.
  useEffect(() => {
    if (!map) return;

    const zoom0 = map.getZoom();
    const progress0 = zoomToProgress(zoom0);

    const add = () => {
      for (const edge of renderedEdges) {
        if (map.getSource(SOURCE(edge.edge_id))) continue;
        map.addSource(SOURCE(edge.edge_id), {
          type: "geojson",
          data: featureFor(edge, progress0, zoom0),
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
              edge.mode === "walk"
                ? walkOpacity(isEdgeFocused(edge, focus), progress0)
                : isEdgeFocused(edge, focus)
                  ? 0.95
                  : 0.55,
            ...(edge.dashArray && { "line-dasharray": edge.dashArray }),
          },
        });
      }
      if (!map.getSource(DOTS_SOURCE)) {
        map.addSource(DOTS_SOURCE, { type: "geojson", data: dotsFeature(progress0) });
        map.addLayer({
          id: DOTS_LAYER,
          type: "circle",
          source: DOTS_SOURCE,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 2, 13, 3, 15, 4.5],
            "circle-color": "#ffffff",
            "circle-stroke-color": "#8b9097",
            "circle-stroke-width": 1,
          },
        });
      }
    };

    let lastZoom = NaN;
    const rebake = () => {
      const zoom = map.getZoom();
      if (zoom === lastZoom) return; // offset only depends on zoom, not pan
      lastZoom = zoom;
      const p = zoomToProgress(zoom);
      for (const edge of renderedEdges) {
        const src = map.getSource(SOURCE(edge.edge_id)) as GeoJSONSource | undefined;
        src?.setData(featureFor(edge, p, zoom));
      }
      const dsrc = map.getSource(DOTS_SOURCE) as GeoJSONSource | undefined;
      dsrc?.setData(dotsFeature(p));
    };

    if (map.isStyleLoaded()) add();
    map.on("styledata", add);
    map.on("move", rebake);

    return () => {
      map.off("styledata", add);
      map.off("move", rebake);
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

  // walk opacity depends on progress + focus
  useEffect(() => {
    if (!map) return;
    for (const edge of renderedEdges) {
      if (edge.mode !== "walk") continue;
      const layerId = LAYER(edge.edge_id);
      if (!map.getLayer(layerId)) continue;
      map.setPaintProperty(
        layerId,
        "line-opacity",
        walkOpacity(isEdgeFocused(edge, focus), progress),
      );
    }
  }, [map, progress, focus]);

  // recolor / restyle on focus change
  useEffect(() => {
    if (!map) return;
    for (const edge of renderedEdges) {
      const layerId = LAYER(edge.edge_id);
      if (!map.getLayer(layerId)) continue;
      const focused = isEdgeFocused(edge, focus);
      map.setPaintProperty(layerId, "line-color", focused ? edge.color : NOT_FOCUSED_COLOR);
      if (edge.mode !== "walk") {
        map.setPaintProperty(layerId, "line-opacity", focused ? 0.95 : 0.5);
      }
      map.setLayoutProperty(layerId, "line-sort-key", lineSortKey(edge, focused));
    }
  }, [map, focus]);

  return null;
}
