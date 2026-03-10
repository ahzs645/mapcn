"use client";

import { useEffect } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { QuadkeyLayer } from "@deck.gl/geo-layers";

interface QuadkeyData {
  quadkey: string;
  value: number;
}

const DATA: QuadkeyData[] = [
  { quadkey: "023010211030", value: 2500 },
  { quadkey: "023010211031", value: 1800 },
  { quadkey: "023010211032", value: 1200 },
  { quadkey: "023010211033", value: 900 },
  { quadkey: "023010211020", value: 2100 },
  { quadkey: "023010211021", value: 1500 },
  { quadkey: "023010211022", value: 700 },
  { quadkey: "023010211023", value: 1100 },
  { quadkey: "023010211010", value: 1900 },
  { quadkey: "023010211011", value: 800 },
];

function valueToColor(value: number): [number, number, number, number] {
  const t = (value - 700) / (2500 - 700);
  if (t < 0.33) {
    return [50, Math.round(180 + t * 200), 80, 180];
  }
  if (t < 0.66) {
    const s = (t - 0.33) / 0.33;
    return [Math.round(50 + s * 205), Math.round(230 - s * 30), Math.round(80 - s * 40), 180];
  }
  const s = (t - 0.66) / 0.34;
  return [255, Math.round(200 - s * 180), Math.round(40 - s * 30), 180];
}

function QuadkeyOverlay() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new QuadkeyLayer<QuadkeyData>({
            id: "quadkey-layer",
            data: DATA,
            getQuadkey: (d) => d.quadkey,
            getFillColor: (d) => valueToColor(d.value),
            getElevation: (d) => d.value,
            extruded: true,
            pickable: true,
            autoHighlight: true,
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

export function DeckglQuadkeyCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-121.5, 38.56]} zoom={11} pitch={45} theme="dark">
        <QuadkeyOverlay />
      </Map>
    </div>
  );
}
