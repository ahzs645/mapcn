"use client";

import { useState } from "react";
import { Map } from "@/registry/map";
import { MapHeatmapLayer } from "@/registry/map-layers";

// Generate random earthquake-like data around the Pacific Ring of Fire
function generateEarthquakeData(): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const regions = [
    { center: [-122.4, 37.8], spread: 2, count: 40 },   // San Francisco
    { center: [-118.2, 34.1], spread: 1.5, count: 30 },  // LA
    { center: [139.7, 35.7], spread: 3, count: 50 },     // Tokyo
    { center: [-71.3, -33.4], spread: 2, count: 25 },    // Chile
    { center: [121.5, 14.6], spread: 2, count: 35 },     // Philippines
    { center: [142.0, 38.3], spread: 2.5, count: 45 },   // Japan coast
    { center: [-155.5, 19.5], spread: 1, count: 20 },    // Hawaii
    { center: [106.8, -6.2], spread: 3, count: 40 },     // Indonesia
    { center: [-150.0, 61.2], spread: 3, count: 30 },    // Alaska
    { center: [172.6, -43.5], spread: 2, count: 25 },    // New Zealand
  ];

  const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
  // Use a seeded-like approach for consistent results
  let seed = 42;
  const rand = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return seed / 2147483647;
  };

  for (const region of regions) {
    for (let i = 0; i < region.count; i++) {
      const lng = region.center[0] + (rand() - 0.5) * region.spread * 2;
      const lat = region.center[1] + (rand() - 0.5) * region.spread * 2;
      const magnitude = 2 + rand() * 5;
      features.push({
        type: "Feature",
        properties: { magnitude },
        geometry: { type: "Point", coordinates: [lng, lat] },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

const earthquakeData = generateEarthquakeData();

export function HeatmapExample() {
  const [radius, setRadius] = useState(25);
  const [intensity, setIntensity] = useState(1);

  return (
    <div className="relative h-[400px] w-full">
      <Map center={[140, 30]} zoom={2}>
        <MapHeatmapLayer
          data={earthquakeData}
          weight={["interpolate", ["linear"], ["get", "magnitude"], 2, 0.1, 7, 1]}
          intensity={intensity}
          radius={radius}
          opacity={0.7}
        />
      </Map>
      <div className="absolute bottom-3 left-3 z-10 rounded-md border bg-background/90 backdrop-blur-sm p-3 shadow-sm space-y-2">
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium w-16">Radius</label>
          <input
            type="range"
            min={5}
            max={50}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-24 accent-primary"
          />
          <span className="text-xs text-muted-foreground w-6">{radius}</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium w-16">Intensity</label>
          <input
            type="range"
            min={0.1}
            max={3}
            step={0.1}
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="w-24 accent-primary"
          />
          <span className="text-xs text-muted-foreground w-6">{intensity.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}
