"use client";

import { useEffect } from "react";
import { Map, useMap } from "@/registry/map";
import { MapLegend, MapLegendItem } from "@/registry/map-ui";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { MVTLayer } from "@deck.gl/geo-layers";

const legendItems = [
  { label: "Building", color: "#4a5057" },
  { label: "Water", color: "#40a4df" },
  { label: "Park", color: "#4caf50" },
  { label: "Other", color: "#c8c8c8" },
];

type VectorTileFeature = {
  properties?: {
    layerName?: string;
  };
};

function MvtOverlay() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new MVTLayer({
            id: "mvt-layer",
            data: "https://tiles.openfreemap.org/planet/{z}/{x}/{y}.pbf",
            getFillColor: (f: VectorTileFeature) => {
              const layer = f.properties?.layerName;
              if (layer === "building") return [74, 80, 87, 200];
              if (layer === "water") return [64, 164, 223, 200];
              if (layer === "park") return [76, 175, 80, 200];
              return [200, 200, 200, 100];
            },
            getLineColor: () => [255, 255, 255],
            lineWidthMinPixels: 1,
            pickable: true,
          }),
        ],
      });
      map.addControl(overlay as unknown as maplibregl.IControl);
    };

    if (map.isStyleLoaded()) addOverlay();
    else map.once("load", addOverlay);

    return () => {
      map.off("load", addOverlay);
      if (overlay) {
        try {
          map.removeControl(overlay as unknown as maplibregl.IControl);
        } catch {}
      }
    };
  }, [map, isLoaded]);

  return null;
}

export function DeckglMvtCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-74.01, 40.707]} zoom={14} pitch={45} theme="dark">
        <MvtOverlay />
        <MapLegend title="Feature Type" position="bottom-left" collapsible>
          {legendItems.map((item) => (
            <MapLegendItem key={item.label} color={item.color} label={item.label} disabled />
          ))}
        </MapLegend>
      </Map>
    </div>
  );
}
