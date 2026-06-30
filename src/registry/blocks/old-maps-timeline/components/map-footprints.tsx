"use client";

import { useEffect, useMemo } from "react";
import type MapLibreGL from "maplibre-gl";

import { useMap } from "@/registry/map";
import { footprintCollection, type HistoricalMapRecord } from "../data";

type MapFootprintsProps = {
  maps: HistoricalMapRecord[];
  selectedMapId: string;
  hoveredMapId: string | null;
  onSelectMap: (id: string) => void;
  onHoverMap: (id: string | null) => void;
};

const SOURCE_ID = "old-maps-footprints";
const FILL_ID = "old-maps-footprints-fill";
const LINE_ID = "old-maps-footprints-line";

// State-driven styling keeps fills subtle until a sheet is hovered/selected.
const fillColor: MapLibreGL.ExpressionSpecification = [
  "match",
  ["get", "state"],
  "selected",
  "#ab1000",
  "hovered",
  "#e7903a",
  "#675c44",
];
const fillOpacity: MapLibreGL.ExpressionSpecification = [
  "match",
  ["get", "state"],
  "selected",
  0.22,
  "hovered",
  0.16,
  0.05,
];
const lineWidth: MapLibreGL.ExpressionSpecification = [
  "match",
  ["get", "state"],
  "selected",
  2.5,
  "hovered",
  1.75,
  1,
];
const lineOpacity: MapLibreGL.ExpressionSpecification = [
  "match",
  ["get", "state"],
  "selected",
  1,
  "hovered",
  0.9,
  0.4,
];

/** Draws coverage rectangles for each historical map sheet on the basemap. */
export function MapFootprints({
  maps,
  selectedMapId,
  hoveredMapId,
  onSelectMap,
  onHoverMap,
}: MapFootprintsProps) {
  const { map, isLoaded } = useMap();

  const data = useMemo(
    () => footprintCollection(maps, selectedMapId, hoveredMapId),
    [maps, selectedMapId, hoveredMapId],
  );

  // Create the source + layers, and re-create them if the style reloads
  // (e.g. on a light/dark theme switch, which discards custom layers).
  useEffect(() => {
    if (!isLoaded || !map) return;

    const ensureLayers = () => {
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, { type: "geojson", data });
      }
      if (!map.getLayer(FILL_ID)) {
        map.addLayer({
          id: FILL_ID,
          type: "fill",
          source: SOURCE_ID,
          paint: { "fill-color": fillColor, "fill-opacity": fillOpacity },
        });
      }
      if (!map.getLayer(LINE_ID)) {
        map.addLayer({
          id: LINE_ID,
          type: "line",
          source: SOURCE_ID,
          layout: { "line-join": "round" },
          paint: {
            "line-color": fillColor,
            "line-width": lineWidth,
            "line-opacity": lineOpacity,
          },
        });
      }
    };

    ensureLayers();
    map.on("styledata", ensureLayers);

    return () => {
      map.off("styledata", ensureLayers);
      try {
        if (map.getLayer(LINE_ID)) map.removeLayer(LINE_ID);
        if (map.getLayer(FILL_ID)) map.removeLayer(FILL_ID);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        // style already torn down — nothing to clean up
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, map]);

  // Push fresh state into the source whenever selection / hover / set changes.
  useEffect(() => {
    if (!isLoaded || !map) return;
    const source = map.getSource(SOURCE_ID) as
      | MapLibreGL.GeoJSONSource
      | undefined;
    source?.setData(data);
  }, [isLoaded, map, data]);

  // Interactions: clicking a footprint selects it, hovering highlights it.
  useEffect(() => {
    if (!isLoaded || !map) return;

    const handleClick = (
      event: MapLibreGL.MapMouseEvent & {
        features?: MapLibreGL.MapGeoJSONFeature[];
      },
    ) => {
      const id = event.features?.[0]?.properties?.id;
      if (typeof id === "string") onSelectMap(id);
    };
    const handleMove = (
      event: MapLibreGL.MapMouseEvent & {
        features?: MapLibreGL.MapGeoJSONFeature[];
      },
    ) => {
      const id = event.features?.[0]?.properties?.id;
      map.getCanvas().style.cursor = "pointer";
      if (typeof id === "string") onHoverMap(id);
    };
    const handleLeave = () => {
      map.getCanvas().style.cursor = "";
      onHoverMap(null);
    };

    map.on("click", FILL_ID, handleClick);
    map.on("mousemove", FILL_ID, handleMove);
    map.on("mouseleave", FILL_ID, handleLeave);

    return () => {
      map.off("click", FILL_ID, handleClick);
      map.off("mousemove", FILL_ID, handleMove);
      map.off("mouseleave", FILL_ID, handleLeave);
    };
  }, [isLoaded, map, onSelectMap, onHoverMap]);

  return null;
}
