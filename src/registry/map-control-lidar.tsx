"use client";

 

import { useEffect, useState } from "react";
import type MapLibreGL from "maplibre-gl";

import { useMap } from "@/registry/map";

type ColorScheme =
  | "elevation"
  | "intensity"
  | "classification"
  | "rgb"
  | "single";

type LidarControlOptions = {
  /** Start collapsed (default true) */
  collapsed?: boolean;
  /** Particle size in pixels (default 2) */
  pointSize?: number;
  /** How points are colored (default "elevation") */
  colorScheme?: ColorScheme;
  /** Whether the points respond to mouse picks (default true) */
  pickable?: boolean;
  /** Automatically zoom to the dataset on load */
  autoZoom?: boolean;
  /** Any additional options forwarded to the underlying control */
  [key: string]: unknown;
};

type LidarLoadInfo = {
  pointCount: number;
  bounds?: [number, number, number, number];
  [key: string]: unknown;
};

type MapControlLidarProps = {
  /** Position on the map (default "top-right") */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Options object forwarded to the underlying lidar control */
  options?: LidarControlOptions;
  /** URL of a default LAS/LAZ/COPC file to load on mount */
  defaultUrl?: string;
  /** Start collapsed (default true) */
  collapsed?: boolean;
  /** Point size in pixels (default 2) */
  pointSize?: number;
  /** How points are colored (default "elevation") */
  colorScheme?: ColorScheme;
  /** Whether the points respond to mouse picks (default true) */
  pickable?: boolean;
  /** Fires when a dataset has finished loading */
  onLoad?: (info: LidarLoadInfo) => void;
  /** Fires when a load begins */
  onLoadStart?: () => void;
  /** Fires when a load fails */
  onLoadError?: (error: Error) => void;
  /** Fires when the current dataset is removed */
  onUnload?: () => void;
  /** Fires when internal state changes */
  onStateChange?: () => void;
  /** Fires when the map style changes and the control reattaches */
  onStyleChange?: () => void;
  /** Fires when the panel collapses */
  onCollapse?: () => void;
  /** Fires when the panel expands */
  onExpand?: () => void;
  /** Fires when chunked streaming begins */
  onStreamingStart?: () => void;
  /** Fires when chunked streaming ends */
  onStreamingStop?: () => void;
  /** Fires periodically while streaming */
  onStreamingProgress?: () => void;
  /** Fires when the GPU point budget is reached */
  onBudgetReached?: () => void;
};

type LidarControlCtor = new (
  options: LidarControlOptions & {
    defaultUrl?: string;
  },
) => MapLibreGL.IControl & {
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  off?: (event: string, handler: (...args: unknown[]) => void) => void;
};

let cachedLidarCtor: LidarControlCtor | null | undefined;

async function loadLidarControlCtor(): Promise<LidarControlCtor | null> {
  if (cachedLidarCtor !== undefined) return cachedLidarCtor;
  try {
    const mod = (await import(
      // @ts-expect-error - optional dependency
      /* @vite-ignore */ "maplibre-gl-lidar"
    )) as unknown as { LidarControl?: LidarControlCtor };
    cachedLidarCtor = mod.LidarControl ?? null;
  } catch {
    cachedLidarCtor = null;
  }
  return cachedLidarCtor;
}

/**
 * MapControlLidar — a faithful port of the Vue `MapControlLidar` component.
 *
 * The underlying `@geoql/v-maplibre` library wraps a `LidarControl` from
 * `maplibre-gl-lidar`. That dependency is not installed in this project,
 * so this component lazy-loads the constructor when available and otherwise
 * renders a placeholder badge that links the user to the install instructions.
 */
function MapControlLidar({
  position = "top-right",
  options,
  defaultUrl,
  collapsed = true,
  pointSize = 2,
  colorScheme = "elevation",
  pickable = true,
  onLoad,
  onLoadStart,
  onLoadError,
  onUnload,
  onStateChange,
  onStyleChange,
  onCollapse,
  onExpand,
  onStreamingStart,
  onStreamingStop,
  onStreamingProgress,
  onBudgetReached,
}: MapControlLidarProps) {
  const { map, isLoaded } = useMap();
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!map || !isLoaded) return;
    let cancelled = false;
    let control: InstanceType<LidarControlCtor> | null = null;

    const handlers: Record<string, ((...args: unknown[]) => void) | undefined> = {
      load: onLoad as (...args: unknown[]) => void,
      loadstart: onLoadStart as (...args: unknown[]) => void,
      loaderror: onLoadError as (...args: unknown[]) => void,
      unload: onUnload as (...args: unknown[]) => void,
      statechange: onStateChange as (...args: unknown[]) => void,
      stylechange: onStyleChange as (...args: unknown[]) => void,
      collapse: onCollapse as (...args: unknown[]) => void,
      expand: onExpand as (...args: unknown[]) => void,
      streamingstart: onStreamingStart as (...args: unknown[]) => void,
      streamingstop: onStreamingStop as (...args: unknown[]) => void,
      streamingprogress: onStreamingProgress as (...args: unknown[]) => void,
      budgetreached: onBudgetReached as (...args: unknown[]) => void,
    };

    loadLidarControlCtor().then((Ctor) => {
      if (cancelled) return;
      if (!Ctor) {
        setMissing(true);
        if (typeof console !== "undefined") {
          console.warn(
            "[MapControlLidar] 'maplibre-gl-lidar' is not installed. " +
              "Install it to enable the LiDAR control.",
          );
        }
        return;
      }
      const merged: LidarControlOptions & { defaultUrl?: string } = {
        collapsed,
        pointSize,
        colorScheme,
        pickable,
        autoZoom: true,
        ...options,
        defaultUrl,
      };
      control = new Ctor(merged);
      map.addControl(control, position);

      for (const [event, handler] of Object.entries(handlers)) {
        if (handler && control?.on) {
          control.on(event, handler);
        }
      }
    });

    return () => {
      cancelled = true;
      if (control) {
        for (const [event, handler] of Object.entries(handlers)) {
          if (handler && control?.off) {
            control.off(event, handler);
          }
        }
        try {
          map.removeControl(control);
        } catch {
          // ignore
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, position]);

  if (!missing) return null;

  const cornerClass = {
    "top-left": "top-2 left-2",
    "top-right": "top-2 right-2",
    "bottom-left": "bottom-2 left-2",
    "bottom-right": "bottom-2 right-2",
  }[position];

  return (
    <div
      className={`absolute z-10 ${cornerClass} text-muted-foreground bg-background/90 border-border pointer-events-auto rounded-md border px-2 py-1 text-[10px] shadow-sm backdrop-blur-sm`}
    >
      LiDAR control unavailable — install <code>maplibre-gl-lidar</code>
    </div>
  );
}

export { MapControlLidar };
export type {
  MapControlLidarProps,
  LidarControlOptions,
  ColorScheme,
  LidarLoadInfo,
};
