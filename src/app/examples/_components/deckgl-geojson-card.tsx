"use client";

import { useEffect, useRef } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { GeoJsonLayer } from "@deck.gl/layers";

const geojsonData: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Zone A", height: 500, color: [0, 128, 255] },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-122.42, 37.78], [-122.40, 37.78], [-122.40, 37.80], [-122.42, 37.80], [-122.42, 37.78],
        ]],
      },
    },
    {
      type: "Feature",
      properties: { name: "Zone B", height: 800, color: [255, 100, 50] },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-122.44, 37.76], [-122.42, 37.76], [-122.42, 37.78], [-122.44, 37.78], [-122.44, 37.76],
        ]],
      },
    },
    {
      type: "Feature",
      properties: { name: "Zone C", height: 300, color: [50, 200, 100] },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-122.40, 37.76], [-122.38, 37.76], [-122.38, 37.78], [-122.40, 37.78], [-122.40, 37.76],
        ]],
      },
    },
  ],
};

function GeoJsonOverlay() {
  const { map, isLoaded } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;
    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new GeoJsonLayer({
            id: "geojson-3d",
            data: geojsonData,
            extruded: true,
            wireframe: true,
            getElevation: (f: GeoJSON.Feature) => (f.properties?.height ?? 100) as number,
            getFillColor: (f: GeoJSON.Feature) => (f.properties?.color ?? [128, 128, 128]) as [number, number, number],
            getLineColor: [255, 255, 255, 100],
            lineWidthMinPixels: 1,
            opacity: 0.7,
          }),
        ],
      });
      overlayRef.current = overlay;
      map.addControl(overlay as unknown as maplibregl.IControl);
    };
    if (map.isStyleLoaded()) {
      addOverlay();
    } else {
      map.once("load", addOverlay);
    }
    return () => {
      map.off("load", addOverlay);
      if (overlay) {
        try { map.removeControl(overlay as unknown as maplibregl.IControl); } catch {}
      }
    };
  }, [map, isLoaded]);

  return null;
}

export function DeckglGeoJsonCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-122.41, 37.78]} zoom={12} pitch={45} bearing={-17}>
        <GeoJsonOverlay />
      </Map>
    </div>
  );
}
