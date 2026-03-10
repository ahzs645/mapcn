"use client";

import { useEffect, useRef } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ScatterplotLayer } from "@deck.gl/layers";

function generatePoints(count: number) {
  let seed = 99;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  return Array.from({ length: count }, () => ({
    position: [-122.4 + (rand() - 0.5) * 0.3, 37.8 + (rand() - 0.5) * 0.2],
    radius: 20 + rand() * 80,
    color: [Math.floor(rand() * 200 + 55), Math.floor(rand() * 200 + 55), Math.floor(rand() * 200 + 55), 180] as [number, number, number, number],
  }));
}

const data = generatePoints(1000);

function ScatterplotOverlay() {
  const { map, isLoaded } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;
    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new ScatterplotLayer({
            id: "scatter",
            data,
            getPosition: (d: (typeof data)[0]) => d.position as [number, number],
            getRadius: (d: (typeof data)[0]) => d.radius,
            getFillColor: (d: (typeof data)[0]) => d.color,
            radiusMinPixels: 2,
            radiusMaxPixels: 20,
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

export function DeckglScatterplotCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-122.4, 37.8]} zoom={11}>
        <ScatterplotOverlay />
      </Map>
    </div>
  );
}
