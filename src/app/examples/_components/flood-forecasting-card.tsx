"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CalendarRange,
  ExternalLink,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { Map as MapCanvas, MapPopup, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { HeatmapLayer } from "@deck.gl/aggregation-layers";
import { ScatterplotLayer } from "@deck.gl/layers";
import { cn } from "@/lib/utils";

type FloodPoint = [number, number, number, number]; // [lon, lat, areaKm2, year]
type FloodSeverity = "major" | "significant" | "moderate" | "localized";

interface SelectedFloodPoint {
  coordinates: [number, number];
  areaKm2: number;
  severity: FloodSeverity;
  year: number;
}

const MIN_YEAR = 2000;
const MAX_YEAR = 2026;
const ZOOM_THRESHOLD = 12;

const AREA_MAJOR = 500;
const AREA_SIGNIFICANT = 100;
const AREA_MODERATE = 10;

function getSeverity(areaKm2: number): FloodSeverity {
  if (areaKm2 > AREA_MAJOR) return "major";
  if (areaKm2 > AREA_SIGNIFICANT) return "significant";
  if (areaKm2 > AREA_MODERATE) return "moderate";
  return "localized";
}

function getAreaColor(areaKm2: number): [number, number, number, number] {
  if (areaKm2 > AREA_MAJOR) return [220, 38, 38, 255];
  if (areaKm2 > AREA_SIGNIFICANT) return [249, 115, 22, 230];
  if (areaKm2 > AREA_MODERATE) return [59, 130, 246, 200];
  return [56, 189, 248, 160];
}

function getAreaRadius(areaKm2: number): number {
  if (areaKm2 > AREA_MAJOR) return 25000;
  if (areaKm2 > AREA_SIGNIFICANT) return 18000;
  if (areaKm2 > AREA_MODERATE) return 12000;
  return 8000;
}

const SEVERITY_DOT: Record<FloodSeverity, string> = {
  major: "bg-red-500",
  significant: "bg-orange-500",
  moderate: "bg-blue-500",
  localized: "bg-cyan-400",
};

const SEVERITY_LABEL: Record<FloodSeverity, string> = {
  major: "Major",
  significant: "Significant",
  moderate: "Moderate",
  localized: "Localized",
};

const HEATMAP_COLOR_RANGE: [number, number, number][] = [
  [56, 189, 248],
  [59, 130, 246],
  [139, 92, 246],
  [249, 115, 22],
  [220, 38, 38],
  [153, 27, 27],
];

const GRADIENT_LEGEND = [
  "#38bdf8",
  "#3b82f6",
  "#8b5cf6",
  "#f97316",
  "#dc2626",
  "#991b1b",
];

const CATEGORY_LEGEND: { color: string; label: string }[] = [
  { color: "#dc2626", label: "Major (>500 km²)" },
  { color: "#f97316", label: "Significant (>100 km²)" },
  { color: "#3b82f6", label: "Moderate (>10 km²)" },
  { color: "#38bdf8", label: "Localized (≤10 km²)" },
];

// Hotspot regions weighted by flood frequency — used to seed a representative synthetic dataset
const HOTSPOTS: { center: [number, number]; spread: number; weight: number }[] = [
  { center: [90, 23], spread: 8, weight: 0.18 }, // South Asia / Bay of Bengal
  { center: [105, 15], spread: 10, weight: 0.12 }, // SE Asia
  { center: [115, -2], spread: 12, weight: 0.1 }, // Indonesia
  { center: [-90, 35], spread: 14, weight: 0.1 }, // US Mississippi
  { center: [-60, -10], spread: 14, weight: 0.08 }, // Amazon
  { center: [30, 0], spread: 12, weight: 0.07 }, // Central Africa
  { center: [10, 50], spread: 10, weight: 0.07 }, // Europe
  { center: [115, 30], spread: 12, weight: 0.1 }, // China
  { center: [35, -15], spread: 10, weight: 0.05 }, // Mozambique / SE Africa
  { center: [-80, 8], spread: 10, weight: 0.06 }, // Central America
  { center: [150, -25], spread: 12, weight: 0.04 }, // Australia
  { center: [-75, 45], spread: 12, weight: 0.03 }, // North America NE
];

function makeRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function gaussian(rand: () => number) {
  // Box-Muller
  const u1 = Math.max(rand(), 1e-9);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function generateFloodPoints(count: number): FloodPoint[] {
  const rand = makeRand(1337);
  const points: FloodPoint[] = [];
  const cumWeights: number[] = [];
  let acc = 0;
  for (const h of HOTSPOTS) {
    acc += h.weight;
    cumWeights.push(acc);
  }
  const totalWeight = acc;

  for (let i = 0; i < count; i++) {
    const r = rand() * totalWeight;
    let idx = 0;
    while (idx < cumWeights.length - 1 && r > cumWeights[idx]) idx++;
    const hotspot = HOTSPOTS[idx];

    const lon = hotspot.center[0] + gaussian(rand) * hotspot.spread;
    const lat = Math.max(
      -65,
      Math.min(75, hotspot.center[1] + gaussian(rand) * hotspot.spread * 0.55),
    );

    // Heavy-tailed area distribution: rare large floods, many small ones
    const u = rand();
    const areaKm2 =
      u > 0.985
        ? 600 + rand() * 800
        : u > 0.93
          ? 120 + rand() * 380
          : u > 0.75
            ? 11 + rand() * 90
            : 0.2 + rand() * 10;

    // Year distribution skews recent
    const yearRoll = rand();
    const yearOffset = Math.floor(yearRoll * yearRoll * (MAX_YEAR - MIN_YEAR + 1));
    const year = MIN_YEAR + (MAX_YEAR - MIN_YEAR) - yearOffset;

    points.push([lon, lat, areaKm2, year]);
  }
  return points;
}

interface FloodLayersProps {
  points: FloodPoint[];
  showHeatmap: boolean;
  onPick: (point: FloodPoint) => void;
}

function FloodLayers({ points, showHeatmap, onPick }: FloodLayersProps) {
  const { map, isLoaded } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const dataRef = useRef(points);
  const onPickRef = useRef(onPick);
  const showHeatmapRef = useRef(showHeatmap);

  useEffect(() => {
    dataRef.current = points;
  }, [points]);
  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);
  useEffect(() => {
    showHeatmapRef.current = showHeatmap;
  }, [showHeatmap]);

  const buildLayers = useCallback(() => {
    const data = dataRef.current;
    const isHeat = showHeatmapRef.current;
    return [
      new HeatmapLayer({
        id: "floods-heat",
        data,
        getPosition: (d: FloodPoint) => [d[0], d[1]],
        getWeight: (d: FloodPoint) => d[2],
        radiusPixels: 40,
        intensity: 1.5,
        threshold: 0.03,
        colorRange: HEATMAP_COLOR_RANGE,
        aggregation: "SUM",
        opacity: 0.9,
        visible: isHeat,
      }),
      new ScatterplotLayer({
        id: "floods",
        data,
        getPosition: (d: FloodPoint) => [d[0], d[1]],
        getRadius: (d: FloodPoint) => getAreaRadius(d[2]),
        getFillColor: (d: FloodPoint) => getAreaColor(d[2]),
        radiusMinPixels: 3,
        radiusMaxPixels: 25,
        opacity: 0.85,
        pickable: true,
        stroked: true,
        getLineColor: [255, 255, 255, 50],
        lineWidthMinPixels: 1,
        antialiasing: true,
        visible: !isHeat,
        onClick: (info) => {
          if (info.object) onPickRef.current(info.object as FloodPoint);
        },
      }),
    ];
  }, []);

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({ layers: buildLayers() });
      overlayRef.current = overlay;
      map.addControl(overlay as unknown as maplibregl.IControl);
    };

    if (map.isStyleLoaded()) {
      addOverlay();
    } else {
      map.once("load", addOverlay);
    }

    return () => {
      map.off("load", addOverlay);
      if (overlay) {
        try {
          map.removeControl(overlay as unknown as maplibregl.IControl);
        } catch {}
      }
      overlayRef.current = null;
    };
  }, [map, isLoaded, buildLayers]);

  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.setProps({ layers: buildLayers() });
    }
  }, [points, showHeatmap, buildLayers]);

  return null;
}

function ZoomWatcher({ onZoom }: { onZoom: (z: number) => void }) {
  const { map, isLoaded } = useMap();
  const cbRef = useRef(onZoom);

  useEffect(() => {
    cbRef.current = onZoom;
  }, [onZoom]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    cbRef.current(map.getZoom());
    const handler = () => cbRef.current(map.getZoom());
    map.on("zoomend", handler);
    return () => {
      map.off("zoomend", handler);
    };
  }, [map, isLoaded]);

  return null;
}

interface TimeSliderProps {
  value: [number, number];
  onChange: (v: [number, number]) => void;
  yearCounts: number[];
}

const SPEED_OPTIONS = [0.5, 1, 2, 4];
const TICK_BASE_MS = 500;
const MIN_SPAN = 2;
const MAX_SPAN = 5;

function TimeSlider({ value, onChange, yearCounts }: TimeSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const peak = useMemo(
    () => Math.max(1, ...yearCounts),
    [yearCounts],
  );

  const rangeLabel = value[0] === value[1] ? `${value[0]}` : `${value[0]} – ${value[1]}`;
  const isFiltered = value[0] !== MIN_YEAR || value[1] !== MAX_YEAR;
  const playbackProgress = Math.round(
    ((value[1] - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100,
  );

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopPlay = useCallback(() => {
    setIsPlaying(false);
    clearTimer();
  }, []);

  const startPlay = useCallback(() => {
    setIsPlaying(true);
    const [start, end] = valueRef.current;
    if (end >= MAX_YEAR) {
      const span = end - start;
      onChange([MIN_YEAR, MIN_YEAR + span]);
    }
    clearTimer();
    timerRef.current = setInterval(() => {
      const [s, e] = valueRef.current;
      if (e >= MAX_YEAR) {
        stopPlay();
        return;
      }
      onChange([s + 1, e + 1]);
    }, TICK_BASE_MS / speed);
  }, [onChange, speed, stopPlay]);

  useEffect(() => {
    if (!isPlaying) return;
    clearTimer();
    timerRef.current = setInterval(() => {
      const [s, e] = valueRef.current;
      if (e >= MAX_YEAR) {
        setIsPlaying(false);
        return;
      }
      onChange([s + 1, e + 1]);
    }, TICK_BASE_MS / speed);
    return clearTimer;
  }, [speed, isPlaying, onChange]);

  useEffect(() => clearTimer, []);

  const reset = () => {
    stopPlay();
    const defaultEnd = Math.min(new Date().getFullYear(), MAX_YEAR);
    const defaultStart = Math.max(defaultEnd - MIN_SPAN, MIN_YEAR);
    onChange([defaultStart, defaultEnd]);
  };

  const togglePlay = () => {
    if (isPlaying) stopPlay();
    else startPlay();
  };

  const handleStart = (next: number) => {
    if (isPlaying) stopPlay();
    const s = Math.max(MIN_YEAR, Math.min(next, value[1] - MIN_SPAN));
    let e = value[1];
    if (e - s > MAX_SPAN) e = s + MAX_SPAN;
    onChange([s, e]);
  };

  const handleEnd = (next: number) => {
    if (isPlaying) stopPlay();
    const e = Math.min(MAX_YEAR, Math.max(next, value[0] + MIN_SPAN));
    let s = value[0];
    if (e - s > MAX_SPAN) s = e - MAX_SPAN;
    onChange([s, e]);
  };

  return (
    <div className="rounded-lg border border-border bg-card/90 px-4 py-3 backdrop-blur-sm">
      <div className="mb-2.5 flex items-center justify-between text-xs">
        <span className="font-mono text-foreground">{rangeLabel}</span>
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <>
              <span className="text-primary">Playing</span>
              <span className="font-mono text-muted-foreground">
                {playbackProgress}%
              </span>
            </>
          ) : isFiltered ? (
            <span className="text-primary">Filtered</span>
          ) : null}
          <CalendarRange className="size-3.5 text-muted-foreground" />
        </div>
      </div>

      <div className="relative">
        <svg
          className="pointer-events-none h-10 w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {yearCounts.map((count, i) => {
            const year = MIN_YEAR + i;
            const n = yearCounts.length;
            const barWidth = 100 / n;
            const gap = barWidth * 0.12;
            const h = (count / peak) * 100;
            const selected = year >= value[0] && year <= value[1];
            return (
              <rect
                key={i}
                x={i * barWidth + gap / 2}
                y={100 - h}
                width={barWidth - gap}
                height={h}
                className={
                  selected ? "fill-primary/40" : "fill-muted-foreground/20"
                }
              />
            );
          })}
        </svg>

        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
          <label className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Start</span>
            <input
              type="range"
              min={MIN_YEAR}
              max={MAX_YEAR}
              step={1}
              value={value[0]}
              onChange={(e) => handleStart(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <span className="w-9 text-right font-mono">{value[0]}</span>
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-muted-foreground">End</span>
            <input
              type="range"
              min={MIN_YEAR}
              max={MAX_YEAR}
              step={1}
              value={value[1]}
              onChange={(e) => handleEnd(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <span className="w-9 text-right font-mono">{value[1]}</span>
          </label>
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <button
          title="Reset"
          onClick={reset}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <RotateCcw className="size-3.5" />
        </button>
        <button
          title={isPlaying ? "Pause" : "Play"}
          onClick={togglePlay}
          className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/80"
        >
          {isPlaying ? (
            <Pause className="size-3.5" />
          ) : (
            <Play className="size-3.5" />
          )}
        </button>
        <div className="flex gap-0.5">
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                speed === s
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
        <span>{MIN_YEAR}</span>
        <span>{MAX_YEAR}</span>
      </div>
    </div>
  );
}

function FloodLegend({ showHeatmap }: { showHeatmap: boolean }) {
  return (
    <div className="absolute bottom-3 left-3 z-10 rounded-md border bg-background/90 backdrop-blur-sm px-3 py-2 text-xs shadow-sm space-y-1.5">
      {showHeatmap ? (
        <>
          <p className="font-medium text-[11px]">Flood Density</p>
          <div
            className="h-2 w-32 rounded-full"
            style={{
              background: `linear-gradient(to right, ${GRADIENT_LEGEND.join(", ")})`,
            }}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Low</span>
            <span>High</span>
          </div>
        </>
      ) : (
        <>
          <p className="font-medium text-[11px]">Flood Area</p>
          <div className="space-y-1">
            {CATEGORY_LEGEND.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[10px] text-muted-foreground">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const FLOOD_POINTS = generateFloodPoints(6000);

function FloodForecastingInner() {
  const currentYear = new Date().getFullYear();
  const defaultEnd = Math.min(currentYear, MAX_YEAR);
  const defaultStart = Math.max(defaultEnd - 2, MIN_YEAR);

  const [yearRange, setYearRange] = useState<[number, number]>([
    defaultStart,
    defaultEnd,
  ]);
  const [zoom, setZoom] = useState(2);
  const [selected, setSelected] = useState<SelectedFloodPoint | null>(null);

  const yearBuckets = useMemo(() => {
    const buckets = new Map<number, FloodPoint[]>();
    for (const p of FLOOD_POINTS) {
      const arr = buckets.get(p[3]);
      if (arr) arr.push(p);
      else buckets.set(p[3], [p]);
    }
    return buckets;
  }, []);

  const yearCounts = useMemo(() => {
    const counts: number[] = [];
    for (let y = MIN_YEAR; y <= MAX_YEAR; y++) {
      counts.push(yearBuckets.get(y)?.length ?? 0);
    }
    return counts;
  }, [yearBuckets]);

  const filtered = useMemo(() => {
    const [minY, maxY] = yearRange;
    if (minY <= MIN_YEAR && maxY >= MAX_YEAR) return FLOOD_POINTS;
    let out: FloodPoint[] = [];
    for (let y = minY; y <= maxY; y++) {
      const bucket = yearBuckets.get(y);
      if (bucket) out = out.concat(bucket);
    }
    return out;
  }, [yearRange, yearBuckets]);

  const showHeatmap = zoom < ZOOM_THRESHOLD;

  const handlePick = useCallback((p: FloodPoint) => {
    setSelected({
      coordinates: [p[0], p[1]],
      areaKm2: p[2],
      severity: getSeverity(p[2]),
      year: p[3],
    });
  }, []);

  const formattedArea = selected
    ? selected.areaKm2 >= 1
      ? `${selected.areaKm2.toFixed(1)} km²`
      : `${(selected.areaKm2 * 1_000_000).toFixed(0)} m²`
    : "";

  return (
    <>
      <ZoomWatcher onZoom={setZoom} />
      <FloodLayers
        points={filtered}
        showHeatmap={showHeatmap}
        onPick={handlePick}
      />

      {selected && (
        <MapPopup
          longitude={selected.coordinates[0]}
          latitude={selected.coordinates[1]}
          onClose={() => setSelected(null)}
          closeButton
          offset={14}
        >
          <div className="space-y-2 p-1 w-[240px]">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "size-2.5 shrink-0 rounded-full",
                  SEVERITY_DOT[selected.severity],
                )}
              />
              <span className="text-sm font-semibold text-popover-foreground">
                {SEVERITY_LABEL[selected.severity]} flood
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {selected.coordinates[1].toFixed(4)}°,{" "}
              {selected.coordinates[0].toFixed(4)}°
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Area</p>
                <p className="font-medium text-popover-foreground">
                  {formattedArea}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Severity</p>
                <p className="font-medium text-popover-foreground">
                  {SEVERITY_LABEL[selected.severity]}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Year</p>
                <p className="font-medium text-popover-foreground">
                  {selected.year}
                </p>
              </div>
            </div>
            <div className="border-t border-border pt-1.5">
              <a
                href="https://sites.research.google/floods/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-primary transition-colors hover:text-primary/80"
              >
                <ExternalLink className="size-3" />
                Google Flood Hub
              </a>
            </div>
          </div>
        </MapPopup>
      )}

      <div className="absolute left-3 top-3 z-10 rounded-lg border border-border bg-card/80 px-3 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-3 text-xs">
          <span className="font-mono text-foreground">
            {filtered.length.toLocaleString()}
          </span>
          <span className="text-muted-foreground">events</span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-muted-foreground">
            {showHeatmap ? "Density heatmap" : "Individual events"}
          </span>
        </div>
      </div>

      <FloodLegend showHeatmap={showHeatmap} />

      <div className="absolute bottom-4 left-1/2 z-10 w-[min(90%,420px)] -translate-x-1/2">
        <TimeSlider
          value={yearRange}
          onChange={setYearRange}
          yearCounts={yearCounts}
        />
      </div>
    </>
  );
}

export function FloodForecastingCard() {
  return (
    <div className="relative h-full w-full min-h-[300px]">
      <MapCanvas center={[20, 10]} zoom={2}>
        <FloodForecastingInner />
      </MapCanvas>
    </div>
  );
}

