"use client";

import { useEffect } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { PointCloudLayer } from "@deck.gl/layers";

interface PointData {
  position: [number, number, number];
  color: [number, number, number, number];
  normal: [number, number, number];
}

const DATA: PointData[] = (() => {
  const points: PointData[] = [];

  // Dataset 1: Mountain ridge (red-orange)
  for (let i = 0; i < 30; i++) {
    for (let j = 0; j < 30; j++) {
      const x = -105.6 + i * 0.003;
      const y = 39.65 + j * 0.003;
      const z =
        Math.sin(i * 0.5) * Math.cos(j * 0.4) * 200 +
        300 +
        Math.random() * 20;
      const t = (z - 100) / 500;
      points.push({
        position: [x, y, z],
        color: [
          Math.floor(200 + t * 55),
          Math.floor(100 + t * 50),
          Math.floor(50),
          255,
        ],
        normal: [0, 0, 1],
      });
    }
  }

  // Dataset 2: Valley (blue-green)
  for (let i = 0; i < 30; i++) {
    for (let j = 0; j < 30; j++) {
      const x = -105.4 + i * 0.003;
      const y = 39.75 + j * 0.003;
      const z =
        Math.cos(i * 0.3) * Math.sin(j * 0.5) * 150 +
        200 +
        Math.random() * 15;
      const t = (z - 50) / 400;
      points.push({
        position: [x, y, z],
        color: [
          Math.floor(50),
          Math.floor(100 + t * 100),
          Math.floor(150 + t * 105),
          255,
        ],
        normal: [0, 0, 1],
      });
    }
  }

  return points;
})();

function MultipleOverlay() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new PointCloudLayer<PointData>({
            id: "multiple-layer",
            data: DATA,
            getPosition: (d) => d.position,
            getColor: (d) => d.color,
            getNormal: (d) => d.normal,
            pointSize: 3,
            sizeUnits: "pixels",
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

export function LidarMultipleCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-105.5, 39.75]} zoom={11} pitch={45} theme="dark">
        <MultipleOverlay />
      </Map>
    </div>
  );
}
