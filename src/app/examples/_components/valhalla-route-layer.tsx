"use client";

import { useEffect } from "react";
import type { FitBoundsOptions, GeoJSONSource } from "maplibre-gl";

import { useMap } from "@/registry/map";
import type { LngLat } from "../_lib/valhalla";

type ValhallaRouteLayerProps = {
  coordinates: LngLat[];
  color: string;
  width: number;
  opacity?: number;
  id: string;
};

function ValhallaRouteLayer({
  coordinates,
  color,
  width,
  opacity = 1,
  id,
}: ValhallaRouteLayerProps) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded || coordinates.length < 2) return;

    const sourceId = `${id}-src`;
    const layerId = `${id}-line`;
    const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates },
    };

    const add = () => {
      try {
        const existingSource = map.getSource(sourceId) as
          | GeoJSONSource
          | undefined;

        if (existingSource) {
          existingSource.setData(geojson);
          return;
        }

        map.addSource(sourceId, { type: "geojson", data: geojson });
        map.addLayer({
          id: layerId,
          type: "line",
          source: sourceId,
          paint: {
            "line-color": color,
            "line-width": width,
            "line-opacity": opacity,
          },
          layout: { "line-cap": "round", "line-join": "round" },
        });
      } catch {}
    };

    if (map.isStyleLoaded()) add();
    else map.once("load", add);

    return () => {
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {}
    };
  }, [map, isLoaded, coordinates, color, width, opacity, id]);

  return null;
}

type ValhallaFitBoundsProps = {
  coordinates: LngLat[];
  options?: FitBoundsOptions;
};

function ValhallaFitBounds({ coordinates, options }: ValhallaFitBoundsProps) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded || coordinates.length < 2) return;

    const lngs = coordinates.map((coordinate) => coordinate[0]);
    const lats = coordinates.map((coordinate) => coordinate[1]);
    const bounds: [LngLat, LngLat] = [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ];

    map.fitBounds(bounds, {
      padding: { top: 60, bottom: 60, left: 60, right: 60 },
      maxZoom: 14,
      ...options,
    });
  }, [map, isLoaded, coordinates, options]);

  return null;
}

export { ValhallaFitBounds, ValhallaRouteLayer };
