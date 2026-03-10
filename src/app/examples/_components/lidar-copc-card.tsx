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
  const cx = -123.075,
    cy = 44.05;
  for (let i = 0; i < 50; i++) {
    for (let j = 0; j < 50; j++) {
      const x = cx + (i - 25) * 0.0002;
      const y = cy + (j - 25) * 0.0002;
      const z =
        Math.sin(i * 0.3) * Math.cos(j * 0.3) * 50 +
        50 +
        Math.random() * 10;
      const t = z / 120;
      points.push({
        position: [x, y, z],
        color: [
          Math.floor(68 + t * 187),
          Math.floor(1 + t * 148 + (1 - t) * 100),
          Math.floor(84 + (1 - t) * 171),
          255,
        ],
        normal: [0, 0, 1],
      });
    }
  }
  return points;
})();

function CopcOverlay() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new PointCloudLayer<PointData>({
            id: "copc-layer",
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

export function LidarCopcCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-123.075, 44.05]} zoom={14} pitch={60} theme="dark">
        <CopcOverlay />
      </Map>
    </div>
  );
}
