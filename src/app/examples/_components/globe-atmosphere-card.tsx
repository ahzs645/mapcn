"use client";

import { useEffect, useState, useCallback } from "react";
import { Map, useMap } from "@/registry/map";
import { cn } from "@/lib/utils";

type AtmosphereMode = "dawn" | "day" | "dusk" | "night";

interface SkyPreset {
  skyColor: string;
  horizonColor: string;
  fogColor: string;
  atmosphereBlend: number;
  skyHorizonBlend: number;
}

const SKY_PRESETS: Record<AtmosphereMode, SkyPreset> = {
  dawn: { skyColor: "#ffb347", horizonColor: "#ffd4a0", fogColor: "#ffe0b0", atmosphereBlend: 0.8, skyHorizonBlend: 0.5 },
  day: { skyColor: "#87ceeb", horizonColor: "#ffffff", fogColor: "#ffffff", atmosphereBlend: 1.0, skyHorizonBlend: 0.8 },
  dusk: { skyColor: "#c46b8a", horizonColor: "#e8a0b0", fogColor: "#d08090", atmosphereBlend: 0.7, skyHorizonBlend: 0.5 },
  night: { skyColor: "#0a0a2e", horizonColor: "#0d0d3a", fogColor: "#050520", atmosphereBlend: 0.3, skyHorizonBlend: 0.3 },
};

function GlobeAtmosphereInner({ mode }: { mode: AtmosphereMode }) {
  const { map, isLoaded } = useMap();

  const applyPreset = useCallback(
    (m: AtmosphereMode) => {
      if (!map) return;
      const preset = SKY_PRESETS[m];

      map.setSky({
        "sky-color": preset.skyColor,
        "horizon-color": preset.horizonColor,
        "fog-color": preset.fogColor,
        "atmosphere-blend": preset.atmosphereBlend,
        "sky-horizon-blend": preset.skyHorizonBlend,
      });
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
