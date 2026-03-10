"use client";

import { useState, useCallback } from "react";
import { Map } from "@/registry/map";

const presets = [
  { name: "Top", pitch: 0, bearing: 0, zoom: 15 },
  { name: "3D", pitch: 60, bearing: -30, zoom: 16 },
  { name: "Bird's Eye", pitch: 80, bearing: 45, zoom: 17 },
];

export function PitchBearingExample() {
  const [viewport, setViewport] = useState({
    center: [-74.006, 40.7128] as [number, number],
    zoom: 15,
    bearing: 0,
    pitch: 45,
  });

  const applyPreset = useCallback(
    (preset: (typeof presets)[number]) => {
      setViewport((prev) => ({
        ...prev,
        pitch: preset.pitch,
        bearing: preset.bearing,
        zoom: preset.zoom,
      }));
    },
    []
  );

  return (
    <div className="relative h-full w-full min-h-[300px]">
      <Map
        viewport={viewport}
        onViewportChange={setViewport}
      />
      <div className="absolute top-3 left-3 z-10 rounded-md border bg-background/90 backdrop-blur-sm p-2 shadow-sm space-y-2 text-[11px]">
        <div className="flex gap-1">
          {presets.map((p) => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              className="px-1.5 py-0.5 rounded border bg-background hover:bg-accent transition-colors"
            >
              {p.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-10 text-muted-foreground">Pitch</span>
          <input
            type="range"
            min={0}
            max={85}
            value={viewport.pitch}
            onChange={(e) =>
              setViewport((v) => ({ ...v, pitch: Number(e.target.value) }))
            }
            className="w-20 accent-primary"
          />
          <span className="w-6 text-muted-foreground">{Math.round(viewport.pitch)}°</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-10 text-muted-foreground">Bear</span>
          <input
            type="range"
            min={-180}
            max={180}
            value={viewport.bearing}
            onChange={(e) =>
              setViewport((v) => ({ ...v, bearing: Number(e.target.value) }))
            }
            className="w-20 accent-primary"
          />
          <span className="w-6 text-muted-foreground">{Math.round(viewport.bearing)}°</span>
        </div>
      </div>
    </div>
  );
}
