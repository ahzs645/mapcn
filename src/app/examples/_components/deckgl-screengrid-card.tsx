"use client";

import { useEffect, useRef } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ScreenGridLayer } from "@deck.gl/aggregation-layers";

function generatePoints() {
  let seed = 63;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const points: [number, number][] = [];
  const clusters = [
    [-122.42, 37.79], [-122.39, 37.77], [-122.44, 37.76],
    [-122.40, 37.80], [-122.37, 37.79],
  ];
  for (const c of clusters) {
    for (let i = 0; i < 300; i++) {
      points.push([c[0] + (rand() - 0.5) * 0.05, c[1] + (rand() - 0.5) * 0.04]);
    }
  }
  return points;
}

const data = generatePoints();

function ScreenGridOverlay() {
  const { map, isLoaded } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;
    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new ScreenGridLayer({
            id: "screengrid",
            data,
            getPosition: (d: [number, number]) => d,
            cellSizePixels: 20,
            colorRange: [
              [0, 25, 0, 25], [0, 85, 0, 100], [0, 127, 0, 150],
              [0, 170, 0, 180], [0, 190, 0, 200], [0, 255, 0, 230],
            ],
            opacity: 0.8,
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

export function DeckglScreenGridCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-122.41, 37.78]} zoom={11.5}>
        <ScreenGridOverlay />
      </Map>
    </div>
  );
}
