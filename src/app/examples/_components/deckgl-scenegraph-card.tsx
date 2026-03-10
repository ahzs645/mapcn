"use client";

import { useEffect } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ScenegraphLayer } from "@deck.gl/mesh-layers";

const MODEL_URL =
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BoxAnimated/glTF-Binary/BoxAnimated.glb";
const DATA_URL =
  "https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/bart-stations.json";

interface StationData {
  name: string;
  coordinates: [number, number];
}

function ScenegraphOverlay() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new ScenegraphLayer<StationData>({
            id: "scenegraph-layer",
            data: DATA_URL,
            scenegraph: MODEL_URL,
            getPosition: (d) => d.coordinates,
            getOrientation: () =>
              [0, Math.random() * 180, 90] as [number, number, number],
            sizeScale: 500,
            _animations: { "*": { speed: 5 } },
            _lighting: "pbr",
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

export function DeckglScenegraphCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-122.4, 37.74]} zoom={11} pitch={45} theme="dark">
        <ScenegraphOverlay />
      </Map>
    </div>
  );
}
