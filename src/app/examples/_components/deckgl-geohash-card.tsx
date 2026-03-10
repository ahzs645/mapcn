"use client";

import { useEffect } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { GeohashLayer } from "@deck.gl/geo-layers";

interface GeohashData {
  geohash: string;
  value: number;
}

const DATA: GeohashData[] = [
  { geohash: "9q8yu", value: 1500 },
  { geohash: "9q8yv", value: 2200 },
  { geohash: "9q8yt", value: 800 },
  { geohash: "9q8ys", value: 1200 },
  { geohash: "9q8yk", value: 600 },
  { geohash: "9q8yh", value: 900 },
  { geohash: "9q8yj", value: 1800 },
  { geohash: "9q8yn", value: 1100 },
  { geohash: "9q8yq", value: 700 },
  { geohash: "9q8ym", value: 1400 },
];

function valueToColor(value: number): [number, number, number, number] {
  const t = (value - 600) / (2200 - 600);
  const r = Math.round(0 + t * 255);
  const g = Math.round(220 - t * 120);
  const b = Math.round(255 - t * 55);
  return [r, g, b, 180];
}

function GeohashOverlay() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new GeohashLayer<GeohashData>({
            id: "geohash-layer",
            data: DATA,
            getGeohash: (d) => d.geohash,
            getFillColor: (d) => valueToColor(d.value),
            getElevation: (d) => d.value,
            extruded: true,
            pickable: true,
            autoHighlight: true,
            elevationScale: 1,
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

export function DeckglGeohashCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-122.4, 37.78]} zoom={10} pitch={45} theme="dark">
        <GeohashOverlay />
      </Map>
    </div>
  );
}
