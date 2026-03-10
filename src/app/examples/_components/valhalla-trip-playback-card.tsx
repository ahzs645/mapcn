"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Map, MapMarker, MarkerContent, useMap } from "@/registry/map";
import {
  Loader2,
  Play,
  Pause,
  Square,
  Clock,
  Ruler,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Polyline decoder ─────────────────────────────────────────────
function decodePolyline(encoded: string, precision = 6): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const factor = Math.pow(10, precision);

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push([lng / factor, lat / factor]);
  }
  return coords;
}

// ── Format helpers ───────────────────────────────────────────────
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

function formatDistance(km: number): string {
  return `${km.toFixed(1)} km`;
}

// ── Route layer ──────────────────────────────────────────────────
function RouteLayer({
  coordinates,
  color,
  width,
  opacity,
  id,
}: {
  coordinates: [number, number][];
  color: string;
  width: number;
  opacity: number;
  id: string;
}) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded || coordinates.length < 2) return;

    const sourceId = `${id}-src`;
    const layerId = `${id}-line`;
    const geojson: GeoJSON.Feature = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates },
    };

    const add = () => {
      try {
        if (map.getSource(sourceId)) {
          (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson);
          return;
        }
        map.addSource(sourceId, { type: "geojson", data: geojson });
        map.addLayer({
          id: layerId,
          type: "line",
          source: sourceId,
          paint: {
            "line-color": color,
            "line-width": width,
            "line-opacity": opacity,
          },
          layout: { "line-cap": "round", "line-join": "round" },
        });
      } catch {}
    };

    if (map.isStyleLoaded()) add();
    else map.once("load", add);

    return () => {
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {}
    };
  }, [map, isLoaded, coordinates, color, width, opacity, id]);

  return null;
}

// ── FitBounds helper ─────────────────────────────────────────────
function FitBounds({ coordinates }: { coordinates: [number, number][] }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded || coordinates.length < 2) return;
    const lngs = coordinates.map((c) => c[0]);
    const lats = coordinates.map((c) => c[1]);
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ];
    map.fitBounds(bounds, {
      padding: { top: 80, bottom: 100, left: 60, right: 60 },
      maxZoom: 13,
    });
  }, [map, isLoaded, coordinates]);

  return null;
}

// ── Constants ────────────────────────────────────────────────────
const ORIGIN: [number, number] = [-74.006, 40.7128];
const DESTINATION: [number, number] = [-73.8648, 40.7614];
const ANIMATION_BASE_DURATION = 20; // seconds for 1x speed

// ── Playback control bar ─────────────────────────────────────────
function PlaybackBar({
  isPlaying,
  progress,
  speed,
  duration,
  distance,
  onPlay,
  onPause,
  onStop,
  onSpeedChange,
  onSeek,
}: {
  isPlaying: boolean;
  progress: number;
  speed: number;
  duration: number;
  distance: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSpeedChange: (s: number) => void;
  onSeek: (p: number) => void;
}) {
  return (
    <div className="rounded-xl bg-background/95 shadow-lg backdrop-blur-sm border border-border/50 px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Play/Pause */}
        <button
          className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 cursor-pointer"
          onClick={isPlaying ? onPause : onPlay}
        >
          {isPlaying ? (
            <Pause className="size-4" />
          ) : (
            <Play className="size-4 ml-0.5" />
          )}
        </button>

        {/* Stop */}
        <button
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
          onClick={onStop}
        >
          <Square className="size-3.5" />
        </button>

        {/* Progress % */}
        <span className="text-xs font-medium tabular-nums w-10 text-center">
          {Math.round(progress)}%
        </span>

        {/* Route info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="size-3" />
          <span>{formatDuration(duration)}</span>
          <div className="h-3 w-px bg-border" />
          <Ruler className="size-3" />
          <span>{formatDistance(distance)}</span>
        </div>

        {/* Timeline slider */}
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={progress}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="flex-1 h-1.5 accent-primary cursor-pointer"
        />

        {/* Speed buttons */}
        <div className="flex gap-0.5">
          {[0.5, 1, 2, 4].map((s) => (
            <button
              key={s}
              className={cn(
                "rounded-md px-2 py-1 text-[10px] font-medium transition-colors cursor-pointer",
                speed === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
              onClick={() => onSpeedChange(s)}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main map content ─────────────────────────────────────────────
function PlaybackMapContent() {
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [loading, setLoading] = useState(false);

  // Animation state
  const [progress, setProgress] = useState(0); // 0-100
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const abortRef = useRef<AbortController | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastTsRef = useRef(0);
  const stateRef = useRef({ isPlaying: false, speed: 1, progress: 0 });

  // Keep refs in sync
  useEffect(() => {
    stateRef.current.isPlaying = isPlaying;
  }, [isPlaying]);
  useEffect(() => {
    stateRef.current.speed = speed;
  }, [speed]);
  useEffect(() => {
    stateRef.current.progress = progress;
  }, [progress]);

  // Fetch route
  const fetchRoute = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    const params = {
      locations: [
        { lat: ORIGIN[1], lon: ORIGIN[0], type: "break" },
        { lat: DESTINATION[1], lon: DESTINATION[0], type: "break" },
      ],
      costing: "auto",
      directions_options: { units: "kilometers" },
    };

    try {
      const res = await fetch(
        `/api/valhalla?endpoint=route&json=${encodeURIComponent(JSON.stringify(params))}`,
        { signal: controller.signal }
      );
      if (!res.ok) throw new Error("API error");
      const data = await res.json();

      if (controller.signal.aborted) return;

      const allCoords: [number, number][] = [];
      if (data.trip?.legs) {
        for (const leg of data.trip.legs) {
          allCoords.push(...decodePolyline(leg.shape));
        }
      }

      setRouteCoords(allCoords);
      setDuration(data.trip?.summary?.time ?? 0);
      setDistance(data.trip?.summary?.length ?? 0);
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") {
        console.error("Playback route fetch error:", e);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoute();
    return () => abortRef.current?.abort();
  }, [fetchRoute]);

  // Animation loop
  const animate = useCallback((ts: number) => {
    const s = stateRef.current;
    if (!lastTsRef.current) lastTsRef.current = ts;
    const delta = (ts - lastTsRef.current) / 1000;
    lastTsRef.current = ts;

    if (s.isPlaying) {
      const increment = (delta * s.speed * 100) / ANIMATION_BASE_DURATION;
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          setIsPlaying(false);
          return 100;
        }
        return next;
      });
    }

    frameRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [animate]);

  // Compute derived values
  const currentIndex = Math.min(
    Math.floor((progress / 100) * (routeCoords.length - 1)),
    routeCoords.length - 1
  );
  const traveledCoords =
    routeCoords.length > 1
      ? routeCoords.slice(0, currentIndex + 1)
      : [];
  const currentPos =
    routeCoords.length > 0 ? routeCoords[currentIndex] : null;

  const handlePlay = useCallback(() => {
    if (progress >= 100) {
      setProgress(0);
    }
    lastTsRef.current = 0;
    setIsPlaying(true);
  }, [progress]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setProgress(0);
    lastTsRef.current = 0;
  }, []);

  const handleSeek = useCallback((p: number) => {
    setProgress(p);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span>Loading route...</span>
      </div>
    );
  }

  return (
    <>
      <FitBounds coordinates={[ORIGIN, DESTINATION]} />

      {/* Full route (gray, behind) */}
      {routeCoords.length > 1 && (
        <RouteLayer
          id="playback-full"
          coordinates={routeCoords}
          color="#94a3b8"
          width={4}
          opacity={0.5}
        />
      )}

      {/* Traveled portion (blue, on top) */}
      {traveledCoords.length > 1 && (
        <RouteLayer
          id="playback-traveled"
          coordinates={traveledCoords}
          color="#3b82f6"
          width={5}
          opacity={1}
        />
      )}

      {/* Start marker - green */}
      {routeCoords.length > 0 && (
        <MapMarker
          longitude={routeCoords[0][0]}
          latitude={routeCoords[0][1]}
        >
          <MarkerContent>
            <div className="flex size-5 items-center justify-center rounded-full border-2 border-white bg-green-500 shadow-lg">
              <div className="size-1.5 rounded-full bg-white" />
            </div>
          </MarkerContent>
        </MapMarker>
      )}

      {/* End marker - red */}
      {routeCoords.length > 1 && (
        <MapMarker
          longitude={routeCoords[routeCoords.length - 1][0]}
          latitude={routeCoords[routeCoords.length - 1][1]}
        >
          <MarkerContent>
            <div className="flex size-5 items-center justify-center rounded-full border-2 border-white bg-red-500 shadow-lg">
              <div className="size-1.5 rounded-full bg-white" />
            </div>
          </MarkerContent>
        </MapMarker>
      )}

      {/* Moving marker - blue */}
      {currentPos && progress > 0 && progress < 100 && (
        <MapMarker longitude={currentPos[0]} latitude={currentPos[1]}>
          <MarkerContent>
            <div className="flex size-6 items-center justify-center rounded-full border-2 border-white bg-blue-500 shadow-lg animate-pulse">
              <div className="size-2 rounded-full bg-white" />
            </div>
          </MarkerContent>
        </MapMarker>
      )}

      {/* Bottom control bar */}
      {routeCoords.length > 1 && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <PlaybackBar
            isPlaying={isPlaying}
            progress={progress}
            speed={speed}
            duration={duration}
            distance={distance}
            onPlay={handlePlay}
            onPause={handlePause}
            onStop={handleStop}
            onSpeedChange={setSpeed}
            onSeek={handleSeek}
          />
        </div>
      )}
    </>
  );
}

// ── Exported card ────────────────────────────────────────────────
export function ValhallaTripPlaybackCard() {
  return (
    <div className="relative h-full w-full">
      <Map center={[-73.935, 40.74]} zoom={11}>
        <PlaybackMapContent />
      </Map>
    </div>
  );
}
