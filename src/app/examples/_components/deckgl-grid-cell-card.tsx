"use client";

import { useEffect } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { GridCellLayer } from "@deck.gl/layers";

interface CellData {
  centroid: [number, number];
  value: number;
}

// Generate a 10x10 grid of cells around SF
const DATA: CellData[] = (() => {
  const cells: CellData[] = [];
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      cells.push({
        centroid: [-122.5 + j * 0.02, 37.7 + i * 0.02],
        value: 500 + Math.random() * 5000,
      });
    }
  }
  return cells;
})();

function valueToColor(v: number): [number, number, number, number] {
  const t = (v - 500) / 5000;
  const r = Math.round(50 + t * 205);
  const g = Math.round(50 + (1 - Math.abs(t - 0.5) * 2) * 150);
  const b = Math.round(255 - t * 205);
  return [r, g, b, 200];
}

function GridCellOverlay() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new GridCellLayer<CellData>({
            id: "grid-cells",
            data: DATA,
            getPosition: (d) => d.centroid,
            getFillColor: (d) => valueToColor(d.value),
            getElevation: (d) => d.value,
            cellSize: 2000,
            extruded: true,
            coverage: 0.9,
            elevationScale: 1,
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

export function DeckglGridCellCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-122.4, 37.8]} zoom={11} pitch={45} theme="dark">
        <GridCellOverlay />
      </Map>
    </div>
  );
}
