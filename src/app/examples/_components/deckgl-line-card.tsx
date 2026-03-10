"use client";

import { useEffect } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { LineLayer } from "@deck.gl/layers";

interface LineData {
  from: [number, number];
  to: [number, number];
  color: [number, number, number];
  name: string;
}

const DATA: LineData[] = [
  { from: [-122.45, 37.78], to: [-122.41, 37.79], color: [255, 0, 0], name: "Market St" },
  { from: [-122.43, 37.77], to: [-122.39, 37.785], color: [0, 128, 255], name: "Mission St" },
  { from: [-122.44, 37.785], to: [-122.40, 37.80], color: [0, 200, 100], name: "Geary Blvd" },
  { from: [-122.42, 37.76], to: [-122.38, 37.775], color: [255, 165, 0], name: "Cesar Chavez" },
  { from: [-122.46, 37.775], to: [-122.42, 37.795], color: [148, 0, 211], name: "Fulton St" },
];

function LineOverlay() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new LineLayer<LineData>({
            id: "lines",
            data: DATA,
            getSourcePosition: (d) => d.from,
            getTargetPosition: (d) => d.to,
            getColor: (d) => d.color,
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

export function DeckglLineCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-122.42, 37.785]} zoom={12.5}>
        <LineOverlay />
      </Map>
    </div>
  );
}
