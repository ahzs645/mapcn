"use client";

import { useEffect } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { SolidPolygonLayer } from "@deck.gl/layers";

interface BuildingData {
  polygon: [number, number][];
  height: number;
  color: [number, number, number, number];
  name: string;
}

const DATA: BuildingData[] = [
  { name: "Tower A", height: 250, color: [255, 80, 80, 200], polygon: [[-74.014, 40.7025], [-74.012, 40.7025], [-74.012, 40.704], [-74.014, 40.704]] },
  { name: "Tower B", height: 200, color: [80, 130, 255, 200], polygon: [[-74.011, 40.7025], [-74.009, 40.7025], [-74.009, 40.704], [-74.011, 40.704]] },
  { name: "Tower C", height: 180, color: [80, 200, 120, 200], polygon: [[-74.014, 40.705], [-74.012, 40.705], [-74.012, 40.7065], [-74.014, 40.7065]] },
  { name: "Tower D", height: 150, color: [255, 180, 50, 200], polygon: [[-74.011, 40.705], [-74.009, 40.705], [-74.009, 40.7065], [-74.011, 40.7065]] },
  { name: "Tower E", height: 100, color: [180, 80, 255, 200], polygon: [[-74.008, 40.7025], [-74.006, 40.7025], [-74.006, 40.704], [-74.008, 40.704]] },
];

function SolidPolygonOverlay() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new SolidPolygonLayer<BuildingData>({
            id: "solid-polygons",
            data: DATA,
            getPolygon: (d) => d.polygon,
            getFillColor: (d) => d.color,
            getElevation: (d) => d.height,
            extruded: true,
            wireframe: true,
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

export function DeckglSolidPolygonCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-74.01, 40.704]} zoom={15} pitch={45}>
        <SolidPolygonOverlay />
      </Map>
    </div>
  );
}
