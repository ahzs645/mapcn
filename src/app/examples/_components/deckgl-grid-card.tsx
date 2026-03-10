"use client";

import { useEffect, useRef } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { GridLayer } from "@deck.gl/aggregation-layers";

function generatePoints() {
  let seed = 31;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const points: [number, number][] = [];
  const clusters = [
    [-122.42, 37.79], [-122.39, 37.77], [-122.44, 37.76],
    [-122.40, 37.81], [-122.37, 37.78],
  ];
  for (const c of clusters) {
    for (let i = 0; i < 150; i++) {
      points.push([c[0] + (rand() - 0.5) * 0.04, c[1] + (rand() - 0.5) * 0.04]);
    }
  }
  return points;
}

const data = generatePoints();

function GridOverlay() {
  const { map, isLoaded } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;
    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new GridLayer({
            id: "grid",
            data,
            getPosition: (d: [number, number]) => d,
            cellSize: 200,
            elevationScale: 4,
            extruded: true,
            colorRange: [
              [1, 152, 189], [73, 227, 206], [216, 254, 181],
              [254, 237, 177], [254, 173, 84], [209, 55, 78],
            ],
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

export function DeckglGridCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-122.41, 37.78]} zoom={11.5} pitch={45} bearing={-17}>
        <GridOverlay />
      </Map>
    </div>
  );
}
