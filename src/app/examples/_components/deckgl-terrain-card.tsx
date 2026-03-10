"use client";

import { useEffect } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { TerrainLayer } from "@deck.gl/geo-layers";

const TERRAIN_IMAGE =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
const SURFACE_IMAGE = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

function TerrainOverlay() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new TerrainLayer({
            id: "terrain-layer",
            elevationData: TERRAIN_IMAGE,
            texture: SURFACE_IMAGE,
            elevationDecoder: {
              rScaler: 256,
              gScaler: 1,
              bScaler: 1 / 256,
              offset: -32768,
            },
            bounds: [-122.5, 37.6, -122.2, 37.9] as [
              number,
              number,
              number,
              number,
            ],
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

export function DeckglTerrainCard() {
  return (
    <div className="h-full w-full">
      <Map
        center={[-122.4, 37.75]}
        zoom={11}
        pitch={60}
        bearing={-17}
        theme="dark"
      >
        <TerrainOverlay />
      </Map>
    </div>
  );
}
