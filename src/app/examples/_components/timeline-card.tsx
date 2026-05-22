"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Map, useMap } from "@/registry/map";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
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
const SOURCE_ID = "disturbance-src";
const LAYER_IDS = { high: "dist-high", medium: "dist-medium", low: "dist-low" } as const;
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const TIMELINE_MAP_STYLES = {
  light: {
    name: "Light",
    styles: {
      light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      dark: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    },
  },
  topographic: {
    name: "Topographic",
    styles: {
      light: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
      dark: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
    },
  },
  dark: {
    name: "Dark",
    styles: {
      light: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    },
  },
} as const;

export type TimelineMapStyleKey = keyof typeof TIMELINE_MAP_STYLES;

export const TIMELINE_CONTROL_STYLES = {
  classic: {
    name: "Classic",
    description: "Single scrubber with start and end labels.",
  },
  activity: {
    name: "Activity bars",
    description: "PGMaps-style intensity bars above the scrubber.",
  },
  compact: {
    name: "Compact ticks",
    description: "Dense tick strip with month markers.",
  },
} as const;

export type TimelineControlStyleKey = keyof typeof TIMELINE_CONTROL_STYLES;

export const TIMELINE_GRANULARITY_OPTIONS = {
  week: "Week",
  month: "Month",
  year: "Year",
} as const;

export type TimelineGranularity = keyof typeof TIMELINE_GRANULARITY_OPTIONS;

export const TIMELINE_WINDOW_OPTIONS = [
  { value: 1, label: "1 period" },
  { value: 2, label: "2 periods" },
  { value: 3, label: "3 periods" },
  { value: 4, label: "4 periods" },
  { value: 6, label: "6 periods" },
  { value: -1, label: "Cumulative" },
] as const;

export type TimelineWindowSize = (typeof TIMELINE_WINDOW_OPTIONS)[number]["value"];
export type TimelineWindowAnchor = "start" | "end";

const TIMELINE_SPEED_OPTIONS = [
  { value: 0.5, label: "0.5x" },
  { value: 1, label: "1x" },
  { value: 2, label: "2x" },
  { value: 4, label: "4x" },
] as const;

interface TimelineBucket {
  key: string;
  date: Date;
  label: string;
  shortLabel: string;
  intensity: number;
}

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
const fmtShort = (d: Date) =>
  d.toLocaleDateString("en-US", { year: "numeric", month: "short" });

function getWindowOptions(granularity: TimelineGranularity) {
  const values: TimelineWindowSize[] = granularity === "week" ? [1, 2, 4, -1] : [1, 3, 6, -1];
  const unit = granularity === "week" ? "wk" : granularity === "month" ? "mo" : "yr";

  return values.map((value) => ({
    value,
    label: value === -1 ? "Cumul." : `${value} ${unit}`,
  }));
}

function snapToBucket(date: Date, granularity: TimelineGranularity) {
  if (granularity === "year") return new Date(date.getFullYear(), 0, 1);
  if (granularity === "month") return new Date(date.getFullYear(), date.getMonth(), 1);

  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function bucketKey(date: Date, granularity: TimelineGranularity) {
  if (granularity === "year") return String(date.getFullYear());
  if (granularity === "month") return `${date.getFullYear()}-${String(date.getMonth()).padStart(2, "0")}`;
  return snapToBucket(date, "week").toISOString().slice(0, 10);
}

function buildTimelineBuckets(granularity: TimelineGranularity): TimelineBucket[] {
  const buckets: TimelineBucket[] = [];
  const cursor = snapToBucket(START_DATE, granularity);
  let index = 0;

  while (cursor <= END_DATE) {
    const date = new Date(cursor);
    const key = bucketKey(date, granularity);
    const label =
      granularity === "year"
        ? String(date.getFullYear())
        : granularity === "month"
          ? date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
          : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const shortLabel =
      granularity === "year"
        ? String(date.getFullYear())
        : granularity === "month"
          ? `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`
          : date.getDate() <= 7
            ? `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`
            : String(date.getDate());
    const seasonalPulse = Math.sin((index / 16) * Math.PI * 2 - 0.8) * 0.35 + 0.55;
    const weatherPulse = seededRand(date.getTime(), index, date.getMonth()) * 0.45;

    buckets.push({
      key,
      date,
      label,
      shortLabel,
      intensity: Math.max(0.1, Math.min(1, seasonalPulse + weatherPulse)),
    });

    if (granularity === "year") cursor.setFullYear(cursor.getFullYear() + 1);
    else if (granularity === "month") cursor.setMonth(cursor.getMonth() + 1);
    else cursor.setDate(cursor.getDate() + 7);
    index += 1;
  }

  return buckets;
}

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
export function TimelineCard({
  timelineStyle = "dark",
  timelineControlStyle = "activity",
  timelineGranularity = "week",
  timelineWindowSize = 1,
  timelineWindowAnchor = "start",
  onTimelineWindowSizeChange,
  showRangeControl = true,
  showSpeedControl = true,
  showBucketCounts = true,
  showStats = true,
  showCloseControl = true,
}: {
  timelineStyle?: TimelineMapStyleKey;
  timelineControlStyle?: TimelineControlStyleKey;
  timelineGranularity?: TimelineGranularity;
  timelineWindowSize?: TimelineWindowSize;
  timelineWindowAnchor?: TimelineWindowAnchor;
  showRangeControl?: boolean;
  showSpeedControl?: boolean;
  showBucketCounts?: boolean;
  showStats?: boolean;
  showCloseControl?: boolean;
  onTimelineWindowSizeChange?: (size: TimelineWindowSize) => void;
}) {
  const [currentDate, setCurrentDate] = useState(DEFAULT_DATE);
  const [layers, setLayers] = useState(INITIAL_LAYERS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [internalWindowSize, setInternalWindowSize] =
    useState<TimelineWindowSize>(timelineWindowSize);
  const [showLayers, setShowLayers] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(true);
  const selectedStyle = TIMELINE_MAP_STYLES[timelineStyle];
  const activeWindowSize = timelineWindowSize ?? internalWindowSize;
  const windowOptions = getWindowOptions(timelineGranularity);
  const timelineBuckets = useMemo(
    () => buildTimelineBuckets(timelineGranularity),
    [timelineGranularity],
  );
  const currentBucketIndex = Math.max(
    0,
    timelineBuckets.findIndex((bucket) => bucket.key === bucketKey(currentDate, timelineGranularity)),
  );
  const isCumulative = activeWindowSize === -1;
  const maxPosition =
    !isCumulative && timelineWindowAnchor === "start"
      ? Math.max(0, timelineBuckets.length - activeWindowSize)
      : Math.max(0, timelineBuckets.length - 1);
  const boundedIndex = Math.min(currentBucketIndex, maxPosition);
  const windowStart =
    isCumulative
      ? 0
      : timelineWindowAnchor === "end"
        ? Math.max(0, boundedIndex - activeWindowSize + 1)
        : boundedIndex;
  const windowEnd =
    isCumulative
      ? boundedIndex
      : timelineWindowAnchor === "end"
        ? boundedIndex
        : Math.min(timelineBuckets.length - 1, boundedIndex + activeWindowSize - 1);
  const formattedTimelineDate =
    isCumulative
      ? `Through ${timelineBuckets[boundedIndex]?.label ?? ""}`
      : windowStart === windowEnd
        ? timelineBuckets[boundedIndex]?.label ?? ""
        : `${timelineBuckets[windowStart]?.label ?? ""} - ${timelineBuckets[windowEnd]?.label ?? ""}`;
  const statsLabel = `${windowEnd - windowStart + 1} ${timelineGranularity}${windowEnd === windowStart ? "" : "s"} active`;
  const unitLabel =
    timelineGranularity === "year" ? "year" : timelineGranularity === "month" ? "month" : "week";

  const stepForward = useCallback(() => {
    setCurrentDate((prev) => {
      const idx = timelineBuckets.findIndex((bucket) => bucket.key === bucketKey(prev, timelineGranularity));
      const nextBucket = timelineBuckets[Math.min(idx + 1, maxPosition)];

      if (!nextBucket || idx >= maxPosition) {
        setIsPlaying(false);
        return START_DATE;
      }

      return nextBucket.date;
    });
  }, [maxPosition, timelineBuckets, timelineGranularity]);

  const stepBackward = useCallback(() => {
    setCurrentDate((prev) => {
      const idx = timelineBuckets.findIndex((bucket) => bucket.key === bucketKey(prev, timelineGranularity));
      return timelineBuckets[Math.max(0, idx - 1)]?.date ?? prev;
    });
  }, [timelineBuckets, timelineGranularity]);

  const seek = useCallback(
    (index: number) => {
      const bucket = timelineBuckets[Math.min(Math.max(0, index), maxPosition)];
      if (bucket) setCurrentDate(bucket.date);
    },
    [maxPosition, timelineBuckets],
  );

  const toggleLayer = useCallback((id: string) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
  }, []);

  const handleWindowSizeChange = useCallback((size: TimelineWindowSize) => {
    setInternalWindowSize(size);
    onTimelineWindowSizeChange?.(size);
  }, [onTimelineWindowSizeChange]);

  useEffect(() => {
    if (!isPlaying) return;
    const ms = 1000 / speed;
    const id = setInterval(stepForward, ms);
    return () => clearInterval(id);
  }, [isPlaying, speed, stepForward]);

  return (
    <div className="relative h-full w-full">
      <Map
        theme="dark"
        center={[-95.0, 40.0]}
        zoom={4}
        styles={selectedStyle.styles}
        className="h-full w-full"
      >
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
      {!timelineOpen ? (
        <div className="absolute bottom-4 left-4 z-10">
          <button
            type="button"
            onClick={() => setTimelineOpen(true)}
            className="rounded-md border border-border/50 bg-background/95 px-3 py-2 text-xs font-medium shadow-lg backdrop-blur-sm transition-colors hover:bg-muted cursor-pointer"
          >
            Show timeline
          </button>
        </div>
      ) : (
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <div className="rounded-xl bg-background/95 shadow-lg backdrop-blur-sm border border-border/50 p-4">
          {/* Controls row */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex gap-1">
              <button
                className="flex size-8 items-center justify-center rounded-md border border-border/50 transition-colors hover:bg-muted cursor-pointer"
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentDate(timelineBuckets[0]?.date ?? START_DATE);
                }}
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
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentDate(timelineBuckets[maxPosition]?.date ?? END_DATE);
                }}
                title="Skip to end"
              >
                <ChevronLast className="size-4" />
              </button>
            </div>

            {/* Date badge */}
            <div className="rounded-md border border-primary/50 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              {formattedTimelineDate}
            </div>

            {showStats && (
              <div className="hidden text-xs text-muted-foreground lg:block">
                {statsLabel}
              </div>
            )}

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

            {showCloseControl && (
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-md border border-border/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                onClick={() => {
                  setTimelineOpen(false);
                  setIsPlaying(false);
                }}
                title="Close timeline"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {timelineControlStyle === "activity" && showBucketCounts && (
            <div className="mb-2 hidden h-10 items-end gap-px sm:flex">
              {timelineBuckets.map((bucket, index) => {
                const isActive = index >= windowStart && index <= windowEnd;
                return (
                  <button
                    key={bucket.key}
                    type="button"
                    className="flex-1 cursor-pointer transition-opacity"
                    style={{
                      height: `${Math.max(3, bucket.intensity * 100)}%`,
                      backgroundColor: "var(--color-primary)",
                      opacity: isActive ? 0.95 : 0.22,
                      borderRadius: "1px 1px 0 0",
                      minWidth: "2px",
                    }}
                    title={`${bucket.label} intensity`}
                    onClick={() => {
                      setCurrentDate(bucket.date);
                      setIsPlaying(false);
                    }}
                  />
                );
              })}
            </div>
          )}

          {timelineControlStyle === "compact" && (
            <div className="mb-2 flex h-6 items-end">
              {timelineBuckets.map((bucket, index) => {
                const isCurrent = index === boundedIndex;
                const isPeriodStart =
                  timelineGranularity === "week"
                    ? bucket.date.getDate() <= 7
                    : timelineGranularity === "month"
                      ? bucket.date.getMonth() === 0
                      : true;
                const isActive = index >= windowStart && index <= windowEnd;

                return (
                  <button
                    key={bucket.key}
                    type="button"
                    className="flex flex-1 cursor-pointer flex-col items-center"
                    title={bucket.label}
                    onClick={() => {
                      setCurrentDate(bucket.date);
                      setIsPlaying(false);
                    }}
                  >
                    {isPeriodStart && (
                      <span className="hidden text-[9px] leading-none text-muted-foreground sm:block">
                        {bucket.shortLabel}
                      </span>
                    )}
                    <span
                      className={cn(
                        "block w-full transition-colors",
                        isCurrent
                          ? "h-4 bg-primary"
                          : isActive
                            ? "h-2.5 bg-primary/70"
                            : isPeriodStart
                              ? "h-2 bg-muted-foreground/30"
                              : "h-1 bg-muted-foreground/15",
                      )}
                      style={{ borderRadius: "1px 1px 0 0", minWidth: "2px" }}
                    />
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground whitespace-nowrap min-w-[60px]">
              {timelineBuckets[0]?.shortLabel ?? fmtShort(START_DATE)}
            </span>
            <input
              type="range"
              min={0}
              max={maxPosition}
              step={1}
              value={boundedIndex}
              onChange={(e) => {
                seek(Number(e.target.value));
                setIsPlaying(false);
              }}
              className="w-full h-1.5 accent-primary cursor-pointer"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap min-w-[60px] text-right">
              {timelineBuckets[maxPosition]?.shortLabel ?? fmtShort(END_DATE)}
            </span>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
