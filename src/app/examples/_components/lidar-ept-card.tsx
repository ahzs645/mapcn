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
  const cx = -6.26,
    cy = 53.34;

  // Ground plane
  for (let i = 0; i < 40; i++) {
    for (let j = 0; j < 40; j++) {
      points.push({
        position: [
          cx + (i - 20) * 0.0002,
          cy + (j - 20) * 0.0002,
          Math.random() * 2,
        ],
        color: [140, 120, 90, 255],
        normal: [0, 0, 1],
      });
    }
  }

  // Buildings (3 buildings)
  const buildings = [
    { x: -6.262, y: 53.342, w: 8, h: 8, z: 40 },
    { x: -6.258, y: 53.338, w: 6, h: 10, z: 60 },
    { x: -6.256, y: 53.342, w: 10, h: 6, z: 30 },
  ];

  buildings.forEach((b) => {
    for (let i = 0; i < b.w; i++) {
      for (let j = 0; j < b.h; j++) {
        for (let z = 0; z < b.z; z += 3) {
          if (
            i === 0 ||
            i === b.w - 1 ||
            j === 0 ||
            j === b.h - 1 ||
            z === 0 ||
            z >= b.z - 3
          ) {
            points.push({
              position: [b.x + i * 0.00005, b.y + j * 0.00005, z],
              color: [80 + z * 2, 100 + z, 180 - z, 255],
              normal: [0, 0, 1],
            });
          }
        }
      }
    }
  });

  return points;
})();

function EptOverlay() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new PointCloudLayer<PointData>({
            id: "ept-layer",
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

export function LidarEptCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-6.26, 53.34]} zoom={14} pitch={60} theme="dark">
        <EptOverlay />
      </Map>
    </div>
  );
}
