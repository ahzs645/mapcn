"use client";

import { useEffect } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { SimpleMeshLayer } from "@deck.gl/mesh-layers";
import { CubeGeometry } from "@luma.gl/engine";

interface CubeData {
  position: [number, number, number];
  color: [number, number, number, number];
  scale: number;
  orientation: [number, number, number];
}

const DATA: CubeData[] = [
  {
    position: [-122.405, 37.785, 0],
    color: [64, 192, 255, 255],
    scale: 100,
    orientation: [0, 0, 0],
  },
  {
    position: [-122.4, 37.78, 0],
    color: [255, 140, 64, 255],
    scale: 150,
    orientation: [0, 0, 45],
  },
  {
    position: [-122.395, 37.775, 0],
    color: [128, 255, 128, 255],
    scale: 80,
    orientation: [0, 0, 90],
  },
  {
    position: [-122.41, 37.782, 0],
    color: [255, 64, 128, 255],
    scale: 120,
    orientation: [0, 0, 135],
  },
  {
    position: [-122.398, 37.788, 0],
    color: [192, 128, 255, 255],
    scale: 90,
    orientation: [0, 0, 180],
  },
];

function SimpleMeshOverlay() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      const mesh = new CubeGeometry();

      overlay = new MapboxOverlay({
        layers: [
          new SimpleMeshLayer<CubeData>({
            id: "simple-mesh-layer",
            data: DATA,
            mesh: mesh,
            getPosition: (d) => d.position,
            getColor: (d) => d.color,
            getScale: (d) => [d.scale, d.scale, d.scale],
            getOrientation: (d) => d.orientation,
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
        try {
          map.removeControl(overlay as unknown as maplibregl.IControl);
        } catch {}
      }
    };
  }, [map, isLoaded]);

  return null;
}

export function DeckglSimpleMeshCard() {
  return (
    <div className="h-full w-full">
      <Map
        center={[-122.4, 37.78]}
        zoom={13}
        pitch={45}
        bearing={30}
        theme="dark"
      >
        <SimpleMeshOverlay />
      </Map>
    </div>
  );
}
