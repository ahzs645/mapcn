"use client";

import { Map } from "@/registry/map";
import { MapHeatmapLayer } from "@/registry/map-layers";

function generatePoints(): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const regions = [
    { center: [-122.4, 37.8], spread: 2, count: 40 },
    { center: [139.7, 35.7], spread: 3, count: 50 },
    { center: [-71.3, -33.4], spread: 2, count: 25 },
    { center: [121.5, 14.6], spread: 2, count: 35 },
    { center: [142.0, 38.3], spread: 2.5, count: 45 },
    { center: [106.8, -6.2], spread: 3, count: 40 },
    { center: [-150.0, 61.2], spread: 3, count: 30 },
    { center: [172.6, -43.5], spread: 2, count: 25 },
  ];
  const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
  let seed = 42;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const r of regions) {
    for (let i = 0; i < r.count; i++) {
      features.push({
        type: "Feature",
        properties: { mag: 2 + rand() * 5 },
        geometry: {
          type: "Point",
          coordinates: [
            r.center[0] + (rand() - 0.5) * r.spread * 2,
            r.center[1] + (rand() - 0.5) * r.spread * 2,
          ],
        },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

const data = generatePoints();

export function HeatmapCard() {
  return (
    <div className="h-full w-full">
      <Map center={[140, 25]} zoom={1.5}>
        <MapHeatmapLayer
          data={data}
          weight={["interpolate", ["linear"], ["get", "mag"], 2, 0.1, 7, 1]}
          radius={25}
          intensity={1}
          opacity={0.7}
        />
      </Map>
    </div>
  );
}
