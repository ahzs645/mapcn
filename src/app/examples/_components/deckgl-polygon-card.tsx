"use client";

import { useEffect } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { PolygonLayer } from "@deck.gl/layers";

interface PolyData {
  polygon: [number, number][];
  name: string;
  fillColor: [number, number, number, number];
  lineColor: [number, number, number];
}

const DATA: PolyData[] = [
  {
    name: "Zone A",
    fillColor: [255, 0, 0, 100],
    lineColor: [255, 0, 0],
    polygon: [[-122.45, 37.78], [-122.43, 37.78], [-122.43, 37.80], [-122.45, 37.80]],
  },
  {
    name: "Zone B",
    fillColor: [0, 128, 255, 100],
    lineColor: [0, 128, 255],
    polygon: [[-122.43, 37.77], [-122.41, 37.77], [-122.41, 37.79], [-122.43, 37.79]],
  },
  {
    name: "Zone C",
    fillColor: [0, 200, 100, 100],
    lineColor: [0, 200, 100],
    polygon: [[-122.41, 37.785], [-122.39, 37.785], [-122.39, 37.80], [-122.41, 37.80]],
  },
];

function PolygonOverlay() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new PolygonLayer<PolyData>({
            id: "polygons",
            data: DATA,
            getPolygon: (d) => d.polygon,
            getFillColor: (d) => d.fillColor,
            getLineColor: (d) => d.lineColor,
            getLineWidth: 2,
            stroked: true,
            filled: true,
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

export function DeckglPolygonCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-122.42, 37.79]} zoom={12.5}>
        <PolygonOverlay />
      </Map>
    </div>
  );
}
