"use client";

import { useEffect } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { PathLayer } from "@deck.gl/layers";

interface PathData {
  path: [number, number][];
  name: string;
  color: [number, number, number];
}

const DATA: PathData[] = [
  {
    name: "Route A",
    color: [255, 0, 0],
    path: [[-122.45, 37.78], [-122.43, 37.785], [-122.41, 37.79], [-122.39, 37.795]],
  },
  {
    name: "Route B",
    color: [0, 128, 255],
    path: [[-122.46, 37.77], [-122.44, 37.775], [-122.42, 37.78], [-122.40, 37.785], [-122.38, 37.79]],
  },
  {
    name: "Route C",
    color: [0, 200, 100],
    path: [[-122.47, 37.76], [-122.45, 37.77], [-122.43, 37.775], [-122.41, 37.78]],
  },
];

function PathOverlay() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new PathLayer<PathData>({
            id: "paths",
            data: DATA,
            getPath: (d) => d.path,
            getColor: (d) => d.color,
            getWidth: 4,
            widthMinPixels: 2,
            capRounded: true,
            jointRounded: true,
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

export function DeckglPathCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-122.42, 37.78]} zoom={12}>
        <PathOverlay />
      </Map>
    </div>
  );
}
