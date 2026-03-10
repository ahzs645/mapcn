"use client";

import { useEffect } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { GreatCircleLayer } from "@deck.gl/geo-layers";

interface FlightData {
  from: [number, number];
  to: [number, number];
  name: string;
  color: [number, number, number];
}

const SFO: [number, number] = [-122.4194, 37.7749];

const DATA: FlightData[] = [
  { from: SFO, to: [139.6917, 35.6895], name: "Tokyo", color: [255, 0, 80] },
  { from: SFO, to: [-0.1276, 51.5074], name: "London", color: [0, 140, 255] },
  { from: SFO, to: [2.3522, 48.8566], name: "Paris", color: [0, 200, 120] },
  { from: SFO, to: [116.4074, 39.9042], name: "Beijing", color: [255, 180, 0] },
  { from: SFO, to: [151.2093, -33.8688], name: "Sydney", color: [200, 50, 255] },
  { from: SFO, to: [-43.1729, -22.9068], name: "Rio de Janeiro", color: [255, 100, 50] },
  { from: SFO, to: [77.1025, 28.7041], name: "Delhi", color: [50, 200, 200] },
];

function GreatCircleOverlay() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new GreatCircleLayer<FlightData>({
            id: "great-circles",
            data: DATA,
            getSourcePosition: (d) => d.from,
            getTargetPosition: (d) => d.to,
            getSourceColor: (d) => d.color,
            getTargetColor: (d) => d.color,
            getWidth: 3,
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
        try { map.removeControl(overlay as unknown as maplibregl.IControl); } catch {}
      }
    };
  }, [map, isLoaded]);

  return null;
}

export function DeckglGreatCircleCard() {
  return (
    <div className="h-full w-full">
      <Map center={[0, 30]} zoom={1.5} theme="dark">
        <GreatCircleOverlay />
      </Map>
    </div>
  );
}
