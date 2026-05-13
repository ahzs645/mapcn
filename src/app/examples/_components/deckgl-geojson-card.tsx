"use client";

import { useEffect, useRef } from "react";
import { Map, useMap } from "@/registry/map";
import { MapLegend, MapLegendItem } from "@/registry/map-ui";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { GeoJsonLayer } from "@deck.gl/layers";

const geojsonData: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Zone A", height: 500, color: [255, 140, 0] },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-122.42, 37.78], [-122.40, 37.78], [-122.40, 37.80], [-122.42, 37.80], [-122.42, 37.78],
        ]],
      },
    },
    {
      type: "Feature",
      properties: { name: "Zone B", height: 800, color: [0, 200, 150] },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-122.44, 37.76], [-122.42, 37.76], [-122.42, 37.78], [-122.44, 37.78], [-122.44, 37.76],
        ]],
      },
    },
    {
      type: "Feature",
      properties: { name: "Zone C", height: 600, color: [138, 43, 226] },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-122.40, 37.76], [-122.38, 37.76], [-122.38, 37.78], [-122.40, 37.78], [-122.40, 37.76],
        ]],
      },
    },
    {
      type: "Feature",
      properties: { name: "Route", color: [255, 255, 255] },
      geometry: {
        type: "LineString",
        coordinates: [
          [-122.45, 37.76],
          [-122.42, 37.78],
          [-122.39, 37.77],
          [-122.36, 37.79],
        ],
      },
    },
  ],
};

const legendItems = [
  { label: "Zone A", color: "#ff8c00", shape: "square" },
  { label: "Zone B", color: "#00c896", shape: "square" },
  { label: "Zone C", color: "#8a2be2", shape: "square" },
  { label: "Route", color: "#ffffff", shape: "line" },
] as const;

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
            getLineColor: (f: GeoJSON.Feature) => (f.properties?.color ?? [255, 255, 255]) as [number, number, number],
            lineWidthMinPixels: 2,
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
        <MapLegend title="GeoJSON Features" position="bottom-left" collapsible>
          {legendItems.map((item) => (
            <MapLegendItem
              key={item.label}
              color={item.color}
              label={item.label}
              swatchShape={item.shape}
              disabled
            />
          ))}
        </MapLegend>
      </Map>
    </div>
  );
}
