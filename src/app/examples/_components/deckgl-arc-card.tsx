"use client";

import { useEffect, useRef } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ArcLayer } from "@deck.gl/layers";

const connections = [
  { from: [-74.006, 40.713], to: [-0.118, 51.509], name: "NYC → London" },
  { from: [-74.006, 40.713], to: [2.349, 48.864], name: "NYC → Paris" },
  { from: [-74.006, 40.713], to: [139.692, 35.69], name: "NYC → Tokyo" },
  { from: [-118.244, 34.052], to: [151.209, -33.869], name: "LA → Sydney" },
  { from: [-118.244, 34.052], to: [121.474, 31.23], name: "LA → Shanghai" },
  { from: [0, 51.509], to: [55.296, 25.276], name: "London → Dubai" },
  { from: [0, 51.509], to: [77.209, 28.614], name: "London → Delhi" },
  { from: [139.692, 35.69], to: [103.82, 1.352], name: "Tokyo → Singapore" },
  { from: [-46.636, -23.548], to: [31.236, 30.044], name: "São Paulo → Cairo" },
  { from: [37.618, 55.751], to: [116.397, 39.904], name: "Moscow → Beijing" },
];

function ArcOverlay() {
  const { map, isLoaded } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;
    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new ArcLayer({
            id: "arcs",
            data: connections,
            getSourcePosition: (d: (typeof connections)[0]) => d.from as [number, number],
            getTargetPosition: (d: (typeof connections)[0]) => d.to as [number, number],
            getSourceColor: [0, 128, 255, 200],
            getTargetColor: [255, 100, 50, 200],
            getWidth: 2,
            greatCircle: true,
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

export function DeckglArcCard() {
  return (
    <div className="h-full w-full">
      <Map center={[0, 25]} zoom={1.2}>
        <ArcOverlay />
      </Map>
    </div>
  );
}
