"use client";

import { useState } from "react";
import { Map, MapControls } from "@/registry/map";
import { MapImageLayer } from "@/registry/map-layers";

export function ImageLayerExample() {
  const [opacity, setOpacity] = useState(0.85);

  return (
    <div className="relative h-[400px] w-full">
      <Map center={[-73.96, 40.80]} zoom={13}>
        <MapImageLayer
          url="https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Blanck_map_of_Central_Park.png/800px-Blanck_map_of_Central_Park.png"
          coordinates={[
            [-73.9812, 40.8009],
            [-73.9490, 40.8009],
            [-73.9490, 40.7643],
            [-73.9812, 40.7643],
          ]}
          opacity={opacity}
        />
        <MapControls />
      </Map>
      <div className="absolute bottom-3 left-3 z-10 rounded-md border bg-background/90 backdrop-blur-sm px-3 py-2 shadow-sm">
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium">Opacity</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="w-24 accent-primary"
          />
          <span className="text-xs text-muted-foreground">{(opacity * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}
