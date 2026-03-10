"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { TripsLayer } from "@deck.gl/geo-layers";
import { IconLayer } from "@deck.gl/layers";
import {
  Loader2,
  Play,
  Pause,
  RotateCcw,
  Route,
  Gauge,
  Mountain,
  Timer,
  PanelLeftClose,
  PanelLeftOpen,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────
interface DronePosition {
  lng: number;
  lat: number;
  bearing: number;
}

interface DroneTrip {
  path: [number, number][];
  timestamps: number[];
}

// ── Geo math ─────────────────────────────────────────────────────
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const EARTH_RADIUS_KM = 6371;

function toRad(deg: number) {
  return deg * DEG_TO_RAD;
}

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number) {
  const p1 = toRad(lat1), p2 = toRad(lat2), dl = toRad(lon2 - lon1);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) * RAD_TO_DEG + 360) % 360;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const p1 = toRad(lat1), p2 = toRad(lat2);
  const dp = toRad(lat2 - lat1), dl = toRad(lon2 - lon1);
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function interpolateArc(coords: [number, number][], numPoints: number): [number, number][] {
  if (coords.length < 2) return coords;
  const dists: number[] = [0];
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += haversine(coords[i - 1]![1], coords[i - 1]![0], coords[i]![1], coords[i]![0]);
    dists.push(total);
  }
  const result: [number, number][] = [];
  const step = total / (numPoints - 1);
  for (let i = 0; i < numPoints; i++) {
    const target = i * step;
    let seg = 0;
    for (let j = 1; j < dists.length; j++) {
      if (dists[j]! >= target) { seg = j - 1; break; }
      seg = j - 1;
    }
    const sStart = dists[seg]!, sEnd = dists[seg + 1] ?? sStart;
    const t = sEnd - sStart > 0 ? (target - sStart) / (sEnd - sStart) : 0;
    const [lon1, lat1] = coords[seg]!;
    const [lon2, lat2] = coords[Math.min(seg + 1, coords.length - 1)]!;
    result.push([lon1 + (lon2 - lon1) * t, lat1 + (lat2 - lat1) * t]);
  }
  return result;
}

function totalDistance(coords: [number, number][]) {
  let d = 0;
  for (let i = 1; i < coords.length; i++) {
    d += haversine(coords[i - 1]![1], coords[i - 1]![0], coords[i]![1], coords[i]![0]);
  }
  return d;
}

// ── Drone animation hook ─────────────────────────────────────────
const ARC_POINTS = 500;
const BASE_DURATION = 30;

function useDroneAnimation() {
  const [arcPoints, setArcPoints] = useState<[number, number][]>([]);
  const [tripData, setTripData] = useState<DroneTrip[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dist, setDist] = useState(0);

  const frameRef = useRef<number | null>(null);
  const lastTsRef = useRef(0);
  const stateRef = useRef({ isPlaying: false, speed: 1, currentTime: 0 });

  // Keep refs in sync
  useEffect(() => { stateRef.current.isPlaying = isPlaying; }, [isPlaying]);
  useEffect(() => { stateRef.current.speed = speed; }, [speed]);
  useEffect(() => { stateRef.current.currentTime = currentTime; }, [currentTime]);

  const dronePosition = useMemo((): DronePosition | null => {
    if (arcPoints.length < 2) return null;
    const t = currentTime;
    const maxIdx = arcPoints.length - 1;

    if (t >= maxIdx) {
      const last = arcPoints[maxIdx]!, prev = arcPoints[maxIdx - 1] ?? last;
      return { lng: last[0], lat: last[1], bearing: calculateBearing(prev[1], prev[0], last[1], last[0]) };
    }

    const idx = Math.floor(t), frac = t - idx;
    const p = arcPoints[idx]!, n = arcPoints[idx + 1]!;
    const lng = p[0] + (n[0] - p[0]) * frac;
    const lat = p[1] + (n[1] - p[1]) * frac;
    const bIdx = Math.min(idx + 3, maxIdx);
    const bp = arcPoints[bIdx]!;
    return { lng, lat, bearing: calculateBearing(lat, lng, bp[1], bp[0]) };
  }, [arcPoints, currentTime]);

  const animate = useCallback((ts: number) => {
    const s = stateRef.current;
    if (!lastTsRef.current) lastTsRef.current = ts;
    const delta = (ts - lastTsRef.current) / 1000;
    lastTsRef.current = ts;

    if (s.isPlaying) {
      const inc = (delta * s.speed * ARC_POINTS) / BASE_DURATION;
      const newTime = s.currentTime + inc;

      setCurrentTime((prev) => {
        const next = prev + inc;
        if (next >= ARC_POINTS - 1) {
          setIsPlaying(false);
          setProgress(100);
          return ARC_POINTS - 1;
        }
        setProgress((next / (ARC_POINTS - 1)) * 100);
        return next;
      });
      setElapsed((e) => e + delta);
    }

    frameRef.current = requestAnimationFrame(animate);
  }, []);

  const processCoords = useCallback((coords: [number, number][]) => {
    const d = totalDistance(coords);
    setDist(d);
    const arc = interpolateArc(coords, ARC_POINTS);
    setArcPoints(arc);
    setTripData([{ path: arc, timestamps: arc.map((_, i) => i) }]);
    setCurrentTime(0);
    setProgress(0);
    setElapsed(0);
    setIsPlaying(false);
  }, []);

  const loadGeoJSON = useCallback(async (url: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url);
      const geojson = await res.json();
      const feature = geojson.features?.[0];
      if (!feature?.geometry?.coordinates) throw new Error("Invalid GeoJSON");
      const raw: number[][] = feature.geometry.coordinates;
      processCoords(raw.map((c) => [c[0]!, c[1]!]));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load flight path");
    } finally {
      setLoading(false);
    }
  }, [processCoords]);

  const loadFromFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const geojson = JSON.parse(e.target?.result as string);
        const feature = geojson.features?.[0] ?? geojson;
        const raw: number[][] = feature.geometry?.coordinates ?? feature.coordinates;
        if (!raw || raw.length < 2) { setError("Need at least 2 coordinates"); return; }
        processCoords(raw.map((c) => [c[0]!, c[1]!]));
      } catch { setError("Failed to parse GeoJSON"); }
    };
    reader.readAsText(file);
  }, [processCoords]);

  const play = useCallback(() => {
    if (progress >= 100) {
      setCurrentTime(0);
      setProgress(0);
      setElapsed(0);
    }
    lastTsRef.current = 0;
    setIsPlaying(true);
    if (!frameRef.current) frameRef.current = requestAnimationFrame(animate);
  }, [progress, animate]);

  const pause = useCallback(() => setIsPlaying(false), []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setProgress(0);
    setElapsed(0);
    lastTsRef.current = 0;
  }, []);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [animate]);

  return {
    tripData, currentTime, dronePosition, isPlaying, speed, progress, elapsed,
    loading, error, dist, hasPath: arcPoints.length > 1,
    loadGeoJSON, loadFromFile, play, pause, reset, setSpeed,
  };
}

// ── deck.gl overlay ──────────────────────────────────────────────
function DroneLayers({
  tripData,
  currentTime,
  dronePosition,
  isPlaying,
}: {
  tripData: DroneTrip[];
  currentTime: number;
  dronePosition: DronePosition | null;
  isPlaying: boolean;
}) {
  const { map, isLoaded } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const bearingRef = useRef(0);

  // Camera follow
  useEffect(() => {
    if (!map || !dronePosition || !isPlaying) return;
    bearingRef.current = dronePosition.bearing;
    map.jumpTo({
      center: [dronePosition.lng, dronePosition.lat],
      bearing: dronePosition.bearing,
      pitch: 50,
      zoom: 14,
    });
  }, [map, dronePosition, isPlaying]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({ layers: [] });
      overlayRef.current = overlay;
      map.addControl(overlay as unknown as maplibregl.IControl);
    };

    if (map.isStyleLoaded()) addOverlay();
    else map.once("load", addOverlay);

    return () => {
      map.off("load", addOverlay);
      if (overlay) {
        try { map.removeControl(overlay as unknown as maplibregl.IControl); } catch {}
      }
      overlayRef.current = null;
    };
  }, [map, isLoaded]);

  // Update layers
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay || !tripData.length) return;

    const mapBearing = bearingRef.current;

    const layers: (TripsLayer | IconLayer)[] = [
      new TripsLayer({
        id: "drone-shadow",
        data: tripData,
        getPath: (d: DroneTrip) => d.path,
        getTimestamps: (d: DroneTrip) => d.timestamps,
        getColor: () => [0, 60, 130] as [number, number, number],
        currentTime,
        trailLength: 120,
        fadeTrail: true,
        widthMinPixels: 10,
        capRounded: true,
        jointRounded: true,
        opacity: 0.3,
      }),
      new TripsLayer({
        id: "drone-trail",
        data: tripData,
        getPath: (d: DroneTrip) => d.path,
        getTimestamps: (d: DroneTrip) => d.timestamps,
        getColor: () => [0, 200, 255] as [number, number, number],
        currentTime,
        trailLength: 80,
        fadeTrail: true,
        widthMinPixels: 4,
        capRounded: true,
        jointRounded: true,
        opacity: 0.8,
      }),
    ];

    if (dronePosition) {
      layers.push(
        new IconLayer({
          id: "drone-icon",
          data: [dronePosition],
          getIcon: () => ({
            url: "/drone-icon.svg",
            width: 128,
            height: 128,
            anchorX: 64,
            anchorY: 64,
            mask: false,
          }),
          getPosition: (d: DronePosition) => [d.lng, d.lat],
          getAngle: (d: DronePosition) => d.bearing - mapBearing,
          getSize: 96,
          sizeUnits: "pixels" as const,
          billboard: true,
          pickable: false,
        })
      );
    }

    try { overlay.setProps({ layers }); } catch {}
  }, [tripData, currentTime, dronePosition]);

  return null;
}

// ── Control panel ────────────────────────────────────────────────
function ControlPanel({
  isPlaying,
  speed,
  progress,
  hasPath,
  onPlay,
  onPause,
  onReset,
  onSpeed,
  onUpload,
}: {
  isPlaying: boolean;
  speed: number;
  progress: number;
  hasPath: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onSpeed: (s: number) => void;
  onUpload: (f: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Flight Path</h3>
        <button
          className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/50 px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="size-4" />
          Upload GeoJSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".geojson,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) { onUpload(f); e.target.value = ""; }
          }}
        />
        <p className="text-xs text-muted-foreground">
          LineString GeoJSON with flight coordinates
        </p>
      </div>

      {hasPath && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Playback</h3>
          <div className="space-y-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-right text-xs text-muted-foreground">
              {Math.round(progress)}%
            </p>
          </div>

          <div className="flex items-center justify-center gap-2">
            <button
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
              onClick={onReset}
            >
              <RotateCcw className="size-4" />
            </button>
            <button
              className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 cursor-pointer"
              onClick={isPlaying ? onPause : onPlay}
            >
              {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
          </div>

          <div className="space-y-1">
            <h4 className="text-xs font-medium text-muted-foreground">Speed</h4>
            <div className="flex gap-1">
              {[0.5, 1, 2, 4].map((s) => (
                <button
                  key={s}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors cursor-pointer",
                    speed === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  )}
                  onClick={() => onSpeed(s)}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-muted/50 p-3">
        <p className="text-xs text-muted-foreground">
          <strong>Sample path:</strong> Manhattan scenic flight loaded by default.
          Upload your own GeoJSON LineString for a custom route.
        </p>
      </div>
    </div>
  );
}

// ── Flight stats bar ─────────────────────────────────────────────
function FlightStats({
  dist,
  speed,
  elapsed,
}: {
  dist: number;
  speed: number;
  elapsed: number;
}) {
  const mins = Math.floor(elapsed / 60);
  const secs = Math.floor(elapsed % 60);
  const time = `${mins}:${secs.toString().padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/90 px-3 py-2 text-xs backdrop-blur-sm">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Route className="size-3.5" />
        <span>{dist.toFixed(1)} km</span>
      </div>
      <div className="h-3 w-px bg-border" />
      <div className="flex items-center gap-1 text-muted-foreground">
        <Gauge className="size-3.5" />
        <span>{speed * 60} km/h</span>
      </div>
      <div className="h-3 w-px bg-border" />
      <div className="flex items-center gap-1 text-muted-foreground">
        <Mountain className="size-3.5" />
        <span>120m</span>
      </div>
      <div className="h-3 w-px bg-border" />
      <div className="flex items-center gap-1 text-muted-foreground">
        <Timer className="size-3.5" />
        <span>{time}</span>
      </div>
    </div>
  );
}

// ── Exported card ────────────────────────────────────────────────
export function DroneFlightCard() {
  const {
    tripData, currentTime, dronePosition, isPlaying, speed, progress, elapsed,
    loading, error, dist, hasPath,
    loadGeoJSON, loadFromFile, play, pause, reset, setSpeed,
  } = useDroneAnimation();
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => {
    loadGeoJSON("/sample-drone-path.geojson");
  }, [loadGeoJSON]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <span>Loading flight path...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <div className="text-center text-destructive">
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <Map center={[-74.006, 40.7128]} zoom={13} pitch={50} bearing={-20} theme="dark">
        <DroneLayers
          tripData={tripData}
          currentTime={currentTime}
          dronePosition={dronePosition}
          isPlaying={isPlaying}
        />
      </Map>

      {hasPath && (
        <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
          <FlightStats dist={dist} speed={speed} elapsed={elapsed} />
        </div>
      )}

      <button
        className={cn(
          "absolute top-4 left-4 z-10 flex size-9 items-center justify-center rounded-lg border border-border/50 shadow-sm backdrop-blur-sm transition-colors cursor-pointer",
          panelOpen
            ? "bg-background/95 hover:bg-accent"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
        onClick={() => setPanelOpen((o) => !o)}
      >
        {panelOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
      </button>

      {panelOpen && (
        <div className="absolute top-16 left-4 z-10 w-64 max-h-[calc(100%-5rem)] overflow-auto rounded-xl bg-background/95 shadow-lg backdrop-blur-sm">
          <ControlPanel
            isPlaying={isPlaying}
            speed={speed}
            progress={progress}
            hasPath={hasPath}
            onPlay={play}
            onPause={pause}
            onReset={reset}
            onSpeed={setSpeed}
            onUpload={loadFromFile}
          />
        </div>
      )}
    </div>
  );
}
