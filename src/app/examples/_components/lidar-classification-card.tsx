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

const CLASS_COLORS: Record<string, [number, number, number, number]> = {
  ground: [168, 120, 50, 255],
  lowVeg: [76, 175, 80, 255],
  medVeg: [139, 195, 74, 255],
  highVeg: [46, 125, 50, 255],
  building: [244, 67, 54, 255],
  water: [33, 150, 243, 255],
};

const DATA: PointData[] = (() => {
  const points: PointData[] = [];
  const cx = -123.075,
    cy = 44.05;

  for (let i = 0; i < 40; i++) {
    for (let j = 0; j < 40; j++) {
      const x = cx + (i - 20) * 0.00015;
      const y = cy + (j - 20) * 0.00015;

      // Ground
      points.push({
        position: [x, y, Math.random() * 2],
        color: CLASS_COLORS.ground,
        normal: [0, 0, 1],
      });

      // Vegetation (random spots)
      if (Math.random() > 0.6) {
        const vegType =
          Math.random() > 0.5
            ? "highVeg"
            : Math.random() > 0.5
              ? "medVeg"
              : "lowVeg";
        const h =
          vegType === "highVeg"
            ? 15 + Math.random() * 10
            : vegType === "medVeg"
              ? 5 + Math.random() * 5
              : 1 + Math.random() * 3;
        points.push({
          position: [x, y, h],
          color: CLASS_COLORS[vegType],
          normal: [0, 0, 1],
        });
      }

      // Buildings (specific areas)
      if (i > 15 && i < 25 && j > 10 && j < 20) {
        for (let z = 2; z < 20; z += 2) {
          points.push({
            position: [x, y, z],
            color: CLASS_COLORS.building,
            normal: [0, 0, 1],
          });
        }
      }

      // Water (bottom area)
      if (j < 5) {
        points.push({
          position: [x, y, 0],
          color: CLASS_COLORS.water,
          normal: [0, 0, 1],
        });
      }
    }
  }
  return points;
})();

function ClassificationOverlay() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new PointCloudLayer<PointData>({
            id: "classification-layer",
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

export function LidarClassificationCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-123.075, 44.05]} zoom={14} pitch={60} theme="dark">
        <ClassificationOverlay />
      </Map>
    </div>
  );
}
