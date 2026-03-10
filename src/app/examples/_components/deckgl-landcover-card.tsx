"use client";

import { useEffect } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ColumnLayer } from "@deck.gl/layers";

interface LandCoverData {
  position: [number, number];
  type: string;
  color: [number, number, number, number];
  value: number;
}

const LAND_TYPES = [
  {
    type: "Forest",
    color: [30, 100, 40, 200] as [number, number, number, number],
  },
  {
    type: "Cropland",
    color: [170, 110, 40, 200] as [number, number, number, number],
  },
  {
    type: "Urban",
    color: [155, 155, 155, 200] as [number, number, number, number],
  },
  {
    type: "Water",
    color: [30, 100, 180, 200] as [number, number, number, number],
  },
  {
    type: "Grassland",
    color: [190, 200, 160, 200] as [number, number, number, number],
  },
  {
    type: "Shrub",
    color: [200, 185, 120, 200] as [number, number, number, number],
  },
];

const DATA: LandCoverData[] = (() => {
  const cells: LandCoverData[] = [];
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 6; j++) {
      const lt = LAND_TYPES[Math.floor(Math.random() * LAND_TYPES.length)];
      cells.push({
        position: [-120 + i * 6, 30 + j * 3],
        type: lt.type,
        color: lt.color,
        value: 200 + Math.random() * 800,
      });
    }
  }
  return cells;
})();

function LandcoverOverlay() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new ColumnLayer<LandCoverData>({
            id: "landcover-layer",
            data: DATA,
            getPosition: (d) => d.position,
            getFillColor: (d) => d.color,
            getElevation: (d) => d.value,
            diskResolution: 6,
            radius: 100000,
            extruded: true,
            pickable: true,
            elevationScale: 100,
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

export function DeckglLandcoverCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-98.5, 39.8]} zoom={4} pitch={30} theme="dark">
        <LandcoverOverlay />
      </Map>
    </div>
  );
}
