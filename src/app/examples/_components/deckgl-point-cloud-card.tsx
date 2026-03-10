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
  const cx = -122.4,
    cy = 37.78;
  for (let x = 0; x < 20; x++) {
    for (let y = 0; y < 20; y++) {
      for (let z = 0; z < 15; z++) {
        if (
          x === 0 ||
          x === 19 ||
          y === 0 ||
          y === 19 ||
          z === 0 ||
          z === 14
        ) {
          points.push({
            position: [
              cx + (x - 10) * 0.0001,
              cy + (y - 10) * 0.0001,
              z * 5,
            ],
            color: [
              Math.floor(50 + z * 10),
              Math.floor(100 + x * 7),
              Math.floor(150 + y * 5),
              255,
            ],
            normal: [0, 0, 1],
          });
        }
      }
    }
  }
  return points;
})();

function PointCloudOverlay() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new PointCloudLayer<PointData>({
            id: "point-cloud-layer",
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

export function DeckglPointCloudCard() {
  return (
    <div className="h-full w-full">
      <Map
        center={[-122.4, 37.78]}
        zoom={15}
        pitch={60}
        bearing={-17}
        theme="dark"
      >
        <PointCloudOverlay />
      </Map>
    </div>
  );
}
