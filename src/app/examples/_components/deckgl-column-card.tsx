"use client";

import { useEffect, useRef } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ColumnLayer } from "@deck.gl/layers";

const cities = [
  { position: [-73.935, 40.731], value: 8336, name: "New York" },
  { position: [-118.244, 34.052], value: 3979, name: "Los Angeles" },
  { position: [-87.63, 41.878], value: 2694, name: "Chicago" },
  { position: [-95.358, 29.75], value: 2320, name: "Houston" },
  { position: [-112.074, 33.448], value: 1681, name: "Phoenix" },
  { position: [-75.165, 39.953], value: 1584, name: "Philadelphia" },
  { position: [-98.494, 29.424], value: 1547, name: "San Antonio" },
  { position: [-117.161, 32.716], value: 1424, name: "San Diego" },
  { position: [-96.797, 32.777], value: 1344, name: "Dallas" },
  { position: [-121.886, 37.338], value: 1022, name: "San Jose" },
];

function ColumnOverlay() {
  const { map, isLoaded } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;
    const maxVal = Math.max(...cities.map((c) => c.value));
    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new ColumnLayer({
            id: "columns",
            data: cities,
            getPosition: (d: (typeof cities)[0]) => d.position as [number, number],
            getElevation: (d: (typeof cities)[0]) => d.value,
            elevationScale: 100,
            radius: 30000,
            getFillColor: (d: (typeof cities)[0]) => {
              const t = d.value / maxVal;
              return [Math.floor(50 + t * 200), Math.floor(100 * (1 - t)), Math.floor(255 * (1 - t)), 200];
            },
            extruded: true,
            pickable: true,
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

export function DeckglColumnCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-96, 38]} zoom={3.5} pitch={45} bearing={-10}>
        <ColumnOverlay />
      </Map>
    </div>
  );
}
