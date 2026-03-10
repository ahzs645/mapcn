"use client";

import { useEffect, useRef } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ContourLayer } from "@deck.gl/aggregation-layers";

function generatePoints() {
  let seed = 42;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const points: { position: [number, number] }[] = [];
  const clusters = [
    [-122.41, 37.78], [-122.39, 37.77], [-122.43, 37.76],
    [-122.40, 37.80], [-122.38, 37.79],
  ];
  for (const c of clusters) {
    const count = 100 + Math.floor(rand() * 200);
    for (let i = 0; i < count; i++) {
      points.push({
        position: [c[0] + (rand() - 0.5) * 0.03, c[1] + (rand() - 0.5) * 0.03],
      });
    }
  }
  return points;
}

const data = generatePoints();

function ContourOverlay() {
  const { map, isLoaded } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;
    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new ContourLayer({
            id: "contour",
            data,
            getPosition: (d: { position: [number, number] }) => d.position,
            contours: [
              { threshold: 1, color: [0, 128, 255, 100], strokeWidth: 1 },
              { threshold: 5, color: [0, 200, 150, 150], strokeWidth: 2 },
              { threshold: 15, color: [255, 200, 0, 180], strokeWidth: 3 },
              { threshold: 30, color: [255, 80, 50, 200], strokeWidth: 4 },
            ],
            cellSize: 200,
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

export function DeckglContourCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-122.41, 37.78]} zoom={12}>
        <ContourOverlay />
      </Map>
    </div>
  );
}
