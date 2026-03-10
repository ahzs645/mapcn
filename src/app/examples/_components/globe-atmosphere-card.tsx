"use client";

import { useEffect, useState, useCallback } from "react";
import { Map, useMap } from "@/registry/map";
import { cn } from "@/lib/utils";

type AtmosphereMode = "dawn" | "day" | "dusk" | "night";

interface SkyPreset {
  skyColor: string;
  fogColor: string;
  starIntensity: number;
  horizonBlend: number;
}

const SKY_PRESETS: Record<AtmosphereMode, SkyPreset> = {
  dawn: { skyColor: "#ffb347", fogColor: "#ffd4a0", starIntensity: 0.2, horizonBlend: 0.08 },
  day: { skyColor: "#87ceeb", fogColor: "#ffffff", starIntensity: 0.0, horizonBlend: 0.03 },
  dusk: { skyColor: "#c46b8a", fogColor: "#e8a0b0", starIntensity: 0.3, horizonBlend: 0.08 },
  night: { skyColor: "#0a0a2e", fogColor: "#0d0d3a", starIntensity: 1.0, horizonBlend: 0.1 },
};

function GlobeAtmosphereInner({ mode }: { mode: AtmosphereMode }) {
  const { map, isLoaded } = useMap();

  const applyPreset = useCallback(
    (m: AtmosphereMode) => {
      if (!map) return;
      const preset = SKY_PRESETS[m];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (map as any).setFog({
        color: preset.fogColor,
        "horizon-blend": preset.horizonBlend,
        "high-color": preset.skyColor,
        "space-color": preset.skyColor,
        "star-intensity": preset.starIntensity,
      });

      if (!map.getLayer("sky-layer")) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.addLayer({
          id: "sky-layer",
          type: "sky" as any,
          paint: {
            "sky-type": "atmosphere",
            "sky-atmosphere-sun": [0, 90],
            "sky-atmosphere-sun-intensity": 5,
          } as any,
        });
      }
    },
    [map],
  );

  // Apply preset when mode changes
  useEffect(() => {
    if (!map || !isLoaded) return;

    const apply = () => applyPreset(mode);

    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once("load", apply);
    }

    return () => {
      map.off("load", apply);
    };
  }, [map, isLoaded, mode, applyPreset]);

  // Auto-rotation
  useEffect(() => {
    if (!map || !isLoaded) return;
    let animating = true;

    function rotate() {
      if (!animating || !map) return;
      map.easeTo({ bearing: map.getBearing() + 0.3, duration: 50, easing: (t) => t });
      requestAnimationFrame(rotate);
    }

    const timeout = setTimeout(rotate, 500);
    const pause = () => { animating = false; };
    const resume = () => { animating = true; rotate(); };

    map.on("mousedown", pause);
    map.on("touchstart", pause);
    map.on("mouseup", resume);
    map.on("touchend", resume);

    return () => {
      animating = false;
      clearTimeout(timeout);
      map.off("mousedown", pause);
      map.off("touchstart", pause);
      map.off("mouseup", resume);
      map.off("touchend", resume);
    };
  }, [map, isLoaded]);

  return null;
}

export function GlobeAtmosphereCard() {
  const [mode, setMode] = useState<AtmosphereMode>("day");

  return (
    <div className="relative h-full w-full">
      <Map
        center={[30, 15]}
        zoom={1.5}
        projection={{ type: "globe" }}
        styles={{
          light: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
          dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
        }}
      >
        <GlobeAtmosphereInner mode={mode} />
      </Map>
      <div className="absolute bottom-3 left-3 z-10 flex gap-1">
        {(["dawn", "day", "dusk", "night"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "rounded-md border px-2 py-1 text-[10px] font-medium capitalize transition-colors shadow-sm backdrop-blur-sm",
              mode === m
                ? "bg-foreground text-background border-foreground"
                : "bg-background/80 text-foreground border-border hover:bg-accent",
            )}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}
