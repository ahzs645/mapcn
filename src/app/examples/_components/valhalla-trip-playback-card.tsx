"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import MapLibreGL from "maplibre-gl";
import { Map, MapMarker, MarkerContent, useMap } from "@/registry/map";
import { Loader2, Play, Pause, Square, Clock, Ruler } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Polyline decoder ─────────────────────────────────────────────
function decodePolyline(encoded: string, precision = 6): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  const factor = Math.pow(10, precision);
  while (index < encoded.length) {
    let shift = 0, result = 0, byte: number;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coords.push([lng / factor, lat / factor]);
  }
  return coords;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

function formatDistance(km: number): string {
  return `${km.toFixed(1)} km`;
}

// ── Geometry helpers ─────────────────────────────────────────────
function segDist(a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  return Math.sqrt(dx * dx + dy * dy);
}

function computeSegmentDistances(coords: [number, number][]): number[] {
  const d: number[] = [];
  for (let i = 0; i < coords.length - 1; i++) d.push(segDist(coords[i], coords[i + 1]));
  return d;
}

/** Returns [subPath, interpolatedPosition] for a given 0–100 progress */
function getProgressData(
  coords: [number, number][],
  segDists: number[],
  totalDist: number,
  pct: number,
): { path: [number, number][]; position: [number, number] } {
  if (coords.length === 0) return { path: [], position: [0, 0] };
  if (pct <= 0) return { path: [coords[0]], position: coords[0] };
  if (pct >= 100) return { path: coords, position: coords[coords.length - 1] };

  const target = (pct / 100) * totalDist;
  let acc = 0;
  for (let i = 0; i < segDists.length; i++) {
    if (acc + segDists[i] >= target) {
      const t = (target - acc) / segDists[i];
      const p1 = coords[i], p2 = coords[i + 1];
      const pos: [number, number] = [p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t];
      return { path: [...coords.slice(0, i + 1), pos], position: pos };
    }
    acc += segDists[i];
  }
  return { path: coords, position: coords[coords.length - 1] };
}

// ── Constants ────────────────────────────────────────────────────
const ORIGIN: [number, number] = [-74.006, 40.7128];
const DESTINATION: [number, number] = [-73.8648, 40.7614];
const BASE_DURATION = 15; // seconds at 1x speed

// ── Hook: manages map layers + animation ─────────────────────────
function usePlaybackAnimation(
  routeCoords: [number, number][],
  segDists: number[],
  totalDist: number,
) {
  const { map, isLoaded } = useMap();
  const markerRef = useRef<MapLibreGL.Marker | null>(null);
  const animRef = useRef<number | null>(null);
  const lastTsRef = useRef(0);
  const progressRef = useRef(0);
  const playingRef = useRef(false);
  const speedRef = useRef(1);
  const layersReady = useRef(false);
  const [uiState, setUiState] = useState({ progress: 0, playing: false, speed: 1 });

  // Add layers + native marker once
  useEffect(() => {
    if (!map || !isLoaded || routeCoords.length < 2) return;

    const setup = () => {
      try {
        if (!map.getSource("pb-full-src")) {
          map.addSource("pb-full-src", {
            type: "geojson",
            data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: routeCoords } },
          });
          map.addLayer({
            id: "pb-full-line", type: "line", source: "pb-full-src",
            paint: { "line-color": "#94a3b8", "line-width": 6, "line-opacity": 0.5 },
            layout: { "line-cap": "round", "line-join": "round" },
          });
        }
        if (!map.getSource("pb-prog-src")) {
          map.addSource("pb-prog-src", {
            type: "geojson",
            data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [routeCoords[0], routeCoords[0]] } },
          });
          map.addLayer({
            id: "pb-prog-line", type: "line", source: "pb-prog-src",
            paint: { "line-color": "#3b82f6", "line-width": 6, "line-opacity": 1 },
            layout: { "line-cap": "round", "line-join": "round" },
          });
        }
        layersReady.current = true;
      } catch {}

      // Native MapLibre marker for the moving dot (no React re-renders)
      if (!markerRef.current) {
        const el = document.createElement("div");
        Object.assign(el.style, {
          width: "20px", height: "20px", borderRadius: "50%",
          background: "#3b82f6", border: "3px solid white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        });
        markerRef.current = new MapLibreGL.Marker({ element: el })
          .setLngLat(routeCoords[0])
          .addTo(map);
      }
    };

    if (map.isStyleLoaded()) setup();
    else map.once("load", setup);

    // Fit bounds
    const lngs = routeCoords.map((c) => c[0]);
    const lats = routeCoords.map((c) => c[1]);
    map.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: { top: 80, bottom: 140, left: 60, right: 60 }, maxZoom: 13 },
    );

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      layersReady.current = false;
      try {
        if (map.getLayer("pb-prog-line")) map.removeLayer("pb-prog-line");
        if (map.getLayer("pb-full-line")) map.removeLayer("pb-full-line");
        if (map.getSource("pb-prog-src")) map.removeSource("pb-prog-src");
        if (map.getSource("pb-full-src")) map.removeSource("pb-full-src");
      } catch {}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, routeCoords]);

  // Direct update (bypasses React)
  const updateMap = useCallback(
    (pct: number) => {
      if (!map || !layersReady.current) return;
      const { path, position } = getProgressData(routeCoords, segDists, totalDist, pct);
      try {
        const src = map.getSource("pb-prog-src") as maplibregl.GeoJSONSource | undefined;
        if (src && path.length >= 2) {
          src.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: path } });
        }
      } catch {}
      markerRef.current?.setLngLat(position);
    },
    [map, routeCoords, segDists, totalDist],
  );

  // Animation loop — only touches refs + native map API
  useEffect(() => {
    const tick = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;

      if (playingRef.current) {
        progressRef.current = Math.min(100, progressRef.current + (dt * speedRef.current * 100) / BASE_DURATION);
        updateMap(progressRef.current);
        if (progressRef.current >= 100) {
          playingRef.current = false;
          setUiState({ progress: 100, playing: false, speed: speedRef.current });
        }
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);

    // Throttled UI sync (10 fps, not 60)
    const uiTimer = setInterval(() => {
      if (playingRef.current) {
        setUiState({ progress: progressRef.current, playing: true, speed: speedRef.current });
      }
    }, 100);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      clearInterval(uiTimer);
    };
  }, [updateMap]);

  const play = useCallback(() => {
    if (progressRef.current >= 100) { progressRef.current = 0; updateMap(0); }
    lastTsRef.current = 0;
    playingRef.current = true;
    setUiState((s) => ({ ...s, playing: true }));
  }, [updateMap]);

  const pause = useCallback(() => {
    playingRef.current = false;
    setUiState((s) => ({ ...s, playing: false }));
  }, []);

  const stop = useCallback(() => {
    playingRef.current = false;
    progressRef.current = 0;
    lastTsRef.current = 0;
    updateMap(0);
    setUiState({ progress: 0, playing: false, speed: speedRef.current });
  }, [updateMap]);

  const seek = useCallback((p: number) => {
    progressRef.current = p;
    updateMap(p);
    setUiState((s) => ({ ...s, progress: p }));
  }, [updateMap]);

  const setSpeed = useCallback((s: number) => {
    speedRef.current = s;
    setUiState((prev) => ({ ...prev, speed: s }));
  }, []);

  return { uiState, play, pause, stop, seek, setSpeed };
}

// ── Playback UI (uses the hook) ──────────────────────────────────
function PlaybackUI({
  routeCoords,
  segDists,
  totalDist,
  routeInfo,
}: {
  routeCoords: [number, number][];
  segDists: number[];
  totalDist: number;
  routeInfo: { duration: number; distance: number };
}) {
  const { uiState, play, pause, stop, seek, setSpeed } = usePlaybackAnimation(routeCoords, segDists, totalDist);

  return (
    <>
      {/* Start marker */}
      <MapMarker longitude={routeCoords[0][0]} latitude={routeCoords[0][1]}>
        <MarkerContent>
          <div className="flex size-5 items-center justify-center rounded-full border-2 border-white bg-green-500 shadow-lg">
            <div className="size-1.5 rounded-full bg-white" />
          </div>
        </MarkerContent>
      </MapMarker>

      {/* End marker */}
      <MapMarker longitude={routeCoords[routeCoords.length - 1][0]} latitude={routeCoords[routeCoords.length - 1][1]}>
        <MarkerContent>
          <div className="flex size-5 items-center justify-center rounded-full border-2 border-white bg-red-500 shadow-lg">
            <div className="size-1.5 rounded-full bg-white" />
          </div>
        </MarkerContent>
      </MapMarker>

      {/* Control bar */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <div className="rounded-xl bg-background/95 shadow-lg backdrop-blur-sm border border-border/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                className={cn(
                  "flex size-9 items-center justify-center rounded-full border transition-colors cursor-pointer",
                  uiState.playing ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted",
                )}
                onClick={uiState.playing ? pause : play}
              >
                {uiState.playing ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
              </button>
              <button
                className="flex size-9 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted cursor-pointer"
                onClick={stop}
              >
                <Square className="size-3.5" />
              </button>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div>{Math.round(uiState.progress)}% complete</div>
              <div className="text-xs flex items-center gap-1 justify-end">
                <Clock className="size-3" />
                <span>{formatDuration(routeInfo.duration)}</span>
                <span className="mx-0.5">·</span>
                <Ruler className="size-3" />
                <span>{formatDistance(routeInfo.distance)}</span>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <input
              type="range" min={0} max={100} step={0.1}
              value={uiState.progress}
              onChange={(e) => seek(Number(e.target.value))}
              className="w-full h-1.5 accent-primary cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Speed:</span>
            <div className="flex gap-1">
              {[0.5, 1, 2, 4].map((s) => (
                <button
                  key={s}
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer",
                    uiState.speed === s ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted",
                  )}
                  onClick={() => setSpeed(s)}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main content (fetches route, then renders UI) ────────────────
function PlaybackContent() {
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [segDists, setSegDists] = useState<number[]>([]);
  const [totalDist, setTotalDist] = useState(0);
  const [routeInfo, setRouteInfo] = useState({ duration: 0, distance: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
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
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error("API error");
        const data = await res.json();
        if (controller.signal.aborted) return;

        const allCoords: [number, number][] = [];
        if (data.trip?.legs) {
          for (const leg of data.trip.legs) allCoords.push(...decodePolyline(leg.shape));
        }
        const sd = computeSegmentDistances(allCoords);
        setRouteCoords(allCoords);
        setSegDists(sd);
        setTotalDist(sd.reduce((a, b) => a + b, 0));
        setRouteInfo({ duration: data.trip?.summary?.time ?? 0, distance: data.trip?.summary?.length ?? 0 });
      } catch (e) {
        if (e instanceof Error && e.name !== "AbortError") console.error("Route fetch error:", e);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-sm">Loading route...</span>
      </div>
    );
  }

  if (routeCoords.length < 2) return null;

  return <PlaybackUI routeCoords={routeCoords} segDists={segDists} totalDist={totalDist} routeInfo={routeInfo} />;
}

// ── Exported card ────────────────────────────────────────────────
export function ValhallaTripPlaybackCard() {
  return (
    <div className="relative h-full w-full">
      <Map center={[-73.935, 40.74]} zoom={11}>
        <PlaybackContent />
      </Map>
    </div>
  );
}
