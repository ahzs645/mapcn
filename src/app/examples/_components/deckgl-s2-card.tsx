"use client";

import { useEffect } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { S2Layer } from "@deck.gl/geo-layers";

interface S2Data {
  token: string;
  value: number;
}

const DATA: S2Data[] = [
  { token: "80858c4", value: 2800 },
  { token: "80858cc", value: 2100 },
  { token: "80858d4", value: 1500 },
  { token: "80858dc", value: 900 },
  { token: "80858e4", value: 1800 },
  { token: "80858ec", value: 1200 },
  { token: "80858f4", value: 600 },
  { token: "80858fc", value: 2400 },
  { token: "8085904", value: 1100 },
  { token: "808590c", value: 700 },
];

function valueToColor(value: number): [number, number, number, number] {
  const t = (value - 600) / (2800 - 600);
  if (t < 0.33) {
    const s = t / 0.33;
    return [Math.round(50 + s * 50), Math.round(100 + s * 50), Math.round(200 - s * 50), 180];
  }
  if (t < 0.66) {
    const s = (t - 0.33) / 0.33;
    return [Math.round(100 + s * 155), Math.round(150 + s * 50), Math.round(150 - s * 100), 180];
  }
  const s = (t - 0.66) / 0.34;
  return [Math.round(255 - s * 30), Math.round(200 - s * 100), Math.round(50 + s * 100), 180];
}

function S2Overlay() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new S2Layer<S2Data>({
            id: "s2-layer",
            data: DATA,
            getS2Token: (d) => d.token,
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

export function DeckglS2Card() {
  return (
    <div className="h-full w-full">
      <Map center={[-122.4, 37.78]} zoom={10} pitch={45} theme="dark">
        <S2Overlay />
      </Map>
    </div>
  );
}
