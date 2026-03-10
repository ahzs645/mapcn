"use client";

import { useEffect, useRef } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { HeatmapLayer } from "@deck.gl/aggregation-layers";

function generateClusters() {
  let seed = 55;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const centers = [
    { pos: [-122.41, 37.79], weight: 3 },
    { pos: [-122.39, 37.77], weight: 2 },
    { pos: [-122.44, 37.76], weight: 4 },
    { pos: [-122.40, 37.80], weight: 1.5 },
  ];
  const points: { position: [number, number]; weight: number }[] = [];
  for (const c of centers) {
    for (let i = 0; i < 200; i++) {
      points.push({
        position: [c.pos[0] + (rand() - 0.5) * 0.03, c.pos[1] + (rand() - 0.5) * 0.03],
        weight: c.weight * (0.5 + rand()),
      });
    }
  }
  return points;
}

const data = generateClusters();

function HeatmapOverlay() {
  const { map, isLoaded } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;
    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new HeatmapLayer({
            id: "deckgl-heatmap",
            data,
            getPosition: (d: (typeof data)[0]) => d.position,
            getWeight: (d: (typeof data)[0]) => d.weight,
            radiusPixels: 30,
            intensity: 1,
            threshold: 0.03,
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

export function DeckglHeatmapCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-122.41, 37.78]} zoom={11.5}>
        <HeatmapOverlay />
      </Map>
    </div>
  );
}
