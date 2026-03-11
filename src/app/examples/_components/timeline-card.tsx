"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Map, useMap } from "@/registry/map";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronFirst,
  ChevronLast,
  Layers,
  Info,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Constants ───────────────────────────────────────────────────────
const START_DATE = new Date(2024, 6, 1);
const END_DATE = new Date(2024, 9, 31);
const DEFAULT_DATE = new Date(2024, 7, 20);
const SPEEDS = [0.5, 1, 2, 4] as const;
const SOURCE_ID = "disturbance-src";
const LAYER_IDS = { high: "dist-high", medium: "dist-medium", low: "dist-low" } as const;

interface LayerConfig {
  id: string;
  name: string;
  visible: boolean;
  color: string;
}

const INITIAL_LAYERS: LayerConfig[] = [
  { id: "high", name: "High disturbance", visible: true, color: "#ef4444" },
  { id: "medium", name: "Medium disturbance", visible: true, color: "#eab308" },
  { id: "low", name: "Low disturbance", visible: true, color: "#14b8a6" },
];

// ── Helpers ─────────────────────────────────────────────────────────
const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
const fmtShort = (d: Date) =>
  d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
const pctOf = (d: Date) =>
  ((d.getTime() - START_DATE.getTime()) / (END_DATE.getTime() - START_DATE.getTime())) * 100;

/** Deterministic pseudo-random from seed + coords */
function seededRand(seed: number, x: number, y: number) {
  const n = Math.sin(seed * 0.0001 + x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

/** Build GeoJSON points across the continental US, classified by date */
function buildDisturbanceGeoJSON(date: Date): GeoJSON.FeatureCollection {
  const seed = date.getTime();
  const features: GeoJSON.Feature[] = [];

  // Grid across continental US: lon -125 to -66, lat 25 to 49
  const lonStep = 1.2;
  const latStep = 0.9;
  for (let lon = -125; lon < -66; lon += lonStep) {
    for (let lat = 25; lat < 49; lat += latStep) {
      // Jitter positions so they don't look like a perfect grid
      const jLon = lon + seededRand(0, lon, lat) * lonStep * 0.8;
      const jLat = lat + seededRand(0, lat, lon) * latStep * 0.8;

      const v = seededRand(seed, lon, lat);
      const di = Math.sin(date.getMonth() * 0.5 + lon * 0.05) * 0.3 + 0.7;
      const val = v * di;

      let level: string | null = null;
      let opacity = 0;
      if (val > 0.7) {
        level = "high";
        opacity = v * 0.85;
      } else if (val > 0.5) {
        level = "medium";
        opacity = v * 0.75;
      } else if (val > 0.35) {
        level = "low";
        opacity = v * 0.6;
      }

      if (level) {
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [jLon, jLat] },
          properties: { level, opacity, radius: 4 + seededRand(seed, lat, lon) * 8 },
        });
      }
    }
  }
  return { type: "FeatureCollection", features };
}

// ── Map data layer (renders inside <Map>) ───────────────────────────
function DisturbanceLayer({
  currentDate,
  layers,
}: {
  currentDate: Date;
  layers: LayerConfig[];
}) {
  const { map, isLoaded } = useMap();
  const ready = useRef(false);

  // Add source + layers once
  useEffect(() => {
    if (!map || !isLoaded) return;

    const setup = () => {
      if (map.getSource(SOURCE_ID)) return;

      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: buildDisturbanceGeoJSON(DEFAULT_DATE),
      });

      // One circle layer per disturbance level
      const config: { id: string; level: string; color: string }[] = [
        { id: LAYER_IDS.low, level: "low", color: "#14b8a6" },
        { id: LAYER_IDS.medium, level: "medium", color: "#eab308" },
        { id: LAYER_IDS.high, level: "high", color: "#ef4444" },
      ];

      for (const { id, level, color } of config) {
        map.addLayer({
          id,
          type: "circle",
          source: SOURCE_ID,
          filter: ["==", ["get", "level"], level],
          paint: {
            "circle-radius": ["get", "radius"],
            "circle-color": color,
            "circle-opacity": ["get", "opacity"],
            "circle-blur": 0.6,
          },
        });
      }

      ready.current = true;
    };

    if (map.isStyleLoaded()) setup();
    else map.once("load", setup);

    return () => {
      ready.current = false;
      try {
        for (const id of Object.values(LAYER_IDS)) {
          if (map.getLayer(id)) map.removeLayer(id);
        }
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch { /* style may already be gone */ }
    };
  }, [map, isLoaded]);

  // Update GeoJSON data when date changes
  useEffect(() => {
    if (!map || !ready.current) return;
    try {
      const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      src?.setData(buildDisturbanceGeoJSON(currentDate));
    } catch { /* ignore */ }
  }, [map, currentDate]);

  // Toggle layer visibility
  useEffect(() => {
    if (!map || !ready.current) return;
    const visMap: Record<string, string> = {
      high: LAYER_IDS.high,
      medium: LAYER_IDS.medium,
      low: LAYER_IDS.low,
    };
    for (const layer of layers) {
      const layerId = visMap[layer.id];
      if (layerId && map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", layer.visible ? "visible" : "none");
      }
    }
  }, [map, layers]);

  return null;
}

// ── Main Card ───────────────────────────────────────────────────────
export function TimelineCard() {
  const [currentDate, setCurrentDate] = useState(DEFAULT_DATE);
  const [layers, setLayers] = useState(INITIAL_LAYERS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showLayers, setShowLayers] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const progress = pctOf(currentDate);

  const stepForward = useCallback(() => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 1);
      if (d > END_DATE) {
        setIsPlaying(false);
        return START_DATE;
      }
      return d;
    });
  }, []);

  const stepBackward = useCallback(() => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d >= START_DATE ? d : prev;
    });
  }, []);

  const seek = useCallback((p: number) => {
    const total = END_DATE.getTime() - START_DATE.getTime();
    setCurrentDate(new Date(START_DATE.getTime() + (total * p) / 100));
  }, []);

  const toggleLayer = useCallback((id: string) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const ms = 1000 / speed;
    const id = setInterval(stepForward, ms);
    return () => clearInterval(id);
  }, [isPlaying, speed, stepForward]);

  return (
    <div className="relative h-full w-full">
      <Map theme="dark" center={[-95.0, 40.0]} zoom={4} className="h-full w-full">
        <DisturbanceLayer currentDate={currentDate} layers={layers} />
      </Map>

      {/* Top-left: layer toggle + info */}
      <div className="absolute top-3 left-3 z-10 flex gap-2">
        <button
          onClick={() => { setShowLayers(!showLayers); setShowInfo(false); }}
          className={cn(
            "flex size-9 items-center justify-center rounded-lg border shadow-sm transition-colors cursor-pointer",
            showLayers
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border/50 bg-background/95 backdrop-blur-sm hover:bg-accent",
          )}
        >
          <Layers className="size-4" />
        </button>
        <button
          onClick={() => { setShowInfo(!showInfo); setShowLayers(false); }}
          className={cn(
            "flex size-9 items-center justify-center rounded-lg border shadow-sm transition-colors cursor-pointer",
            showInfo
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border/50 bg-background/95 backdrop-blur-sm hover:bg-accent",
          )}
        >
          <Info className="size-4" />
        </button>
      </div>

      {/* Layer panel */}
      {showLayers && (
        <div className="absolute top-14 left-3 z-10 w-64 rounded-xl bg-background/95 shadow-lg backdrop-blur-sm border border-border/50 p-4 animate-in fade-in slide-in-from-left-2 duration-150">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Disturbance Layers</h3>
            <button onClick={() => setShowLayers(false)} className="cursor-pointer text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
          <div className="space-y-2">
            {layers.map((layer) => (
              <button
                key={layer.id}
                onClick={() => toggleLayer(layer.id)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/50 cursor-pointer"
              >
                <div
                  className="size-3 shrink-0 rounded-sm border"
                  style={{
                    backgroundColor: layer.visible ? layer.color : "transparent",
                    borderColor: layer.color,
                  }}
                />
                <span className={cn("flex-1", !layer.visible && "text-muted-foreground")}>
                  {layer.name}
                </span>
                {layer.visible ? (
                  <Eye className="size-3.5 text-muted-foreground" />
                ) : (
                  <EyeOff className="size-3.5 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Info panel */}
      {showInfo && (
        <div className="absolute top-14 left-3 z-10 w-72 rounded-xl bg-background/95 shadow-lg backdrop-blur-sm border border-border/50 p-4 animate-in fade-in slide-in-from-left-2 duration-150">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Land Surface Disturbance</h3>
            <button onClick={() => setShowInfo(false)} className="cursor-pointer text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            Simulated disturbance data based on NASA&apos;s HLS imagery at 30m resolution.
            Data intensity varies by date across the timeline.
          </p>
          <div className="text-xs text-muted-foreground">
            Viewing:{" "}
            <span className="font-medium text-foreground">
              {currentDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
            {INITIAL_LAYERS.map((l) => (
              <div key={l.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="size-2.5 rounded-sm shrink-0" style={{ backgroundColor: l.color }} />
                {l.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom timeline controls */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <div className="rounded-xl bg-background/95 shadow-lg backdrop-blur-sm border border-border/50 p-4">
          {/* Controls row */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex gap-1">
              <button
                className="flex size-8 items-center justify-center rounded-md border border-border/50 transition-colors hover:bg-muted cursor-pointer"
                onClick={() => { setIsPlaying(false); setCurrentDate(START_DATE); }}
                title="Skip to start"
              >
                <ChevronFirst className="size-4" />
              </button>
              <button
                className="flex size-8 items-center justify-center rounded-md border border-border/50 transition-colors hover:bg-muted cursor-pointer"
                onClick={stepBackward}
                title="Step back"
              >
                <SkipBack className="size-3.5" />
              </button>
              <button
                className={cn(
                  "flex size-9 items-center justify-center rounded-full border transition-colors cursor-pointer",
                  isPlaying
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted",
                )}
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
              </button>
              <button
                className="flex size-8 items-center justify-center rounded-md border border-border/50 transition-colors hover:bg-muted cursor-pointer"
                onClick={stepForward}
                title="Step forward"
              >
                <SkipForward className="size-3.5" />
              </button>
              <button
                className="flex size-8 items-center justify-center rounded-md border border-border/50 transition-colors hover:bg-muted cursor-pointer"
                onClick={() => { setIsPlaying(false); setCurrentDate(END_DATE); }}
                title="Skip to end"
              >
                <ChevronLast className="size-4" />
              </button>
            </div>

            {/* Date badge */}
            <div className="rounded-md border border-primary/50 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              {fmtDate(currentDate)}
            </div>

            <div className="flex-1" />

            {/* Speed */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Speed:</span>
              <div className="flex gap-1">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    className={cn(
                      "rounded-md border px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer",
                      speed === s
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-muted",
                    )}
                    onClick={() => setSpeed(s)}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Slider */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground whitespace-nowrap min-w-[60px]">
              {fmtShort(START_DATE)}
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={progress}
              onChange={(e) => seek(Number(e.target.value))}
              className="w-full h-1.5 accent-primary cursor-pointer"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap min-w-[60px] text-right">
              {fmtShort(END_DATE)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
