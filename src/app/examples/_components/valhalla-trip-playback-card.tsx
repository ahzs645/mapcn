"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import MapLibreGL from "maplibre-gl";
import { Map, MapMarker, MarkerContent, useMap } from "@/registry/map";
import { Loader2, Play, Pause, Square, Clock, Ruler } from "lucide-react";
import {
  MapMarkerDot,
  MapPanel,
  MapStat,
  MapToolbarButton,
} from "@/registry/map-ui";
import { cn } from "@/lib/utils";
import {
  computeSegmentDistances,
  decodePolyline,
  formatDistance,
  formatDuration,
  getProgressData,
  type LngLat,
} from "../_lib/valhalla";

// ── Constants ────────────────────────────────────────────────────
const ORIGIN: LngLat = [-74.006, 40.7128];
const DESTINATION: LngLat = [-73.8648, 40.7614];
const BASE_DURATION = 15; // seconds at 1x speed

// ── Hook: manages map layers + animation ─────────────────────────
function usePlaybackAnimation(
  routeCoords: LngLat[],
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
  const [uiState, setUiState] = useState({
    progress: 0,
    playing: false,
    speed: 1,
  });

  // Add layers + native marker once
  useEffect(() => {
    if (!map || !isLoaded || routeCoords.length < 2) return;

    const setup = () => {
      try {
        if (!map.getSource("pb-full-src")) {
          map.addSource("pb-full-src", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: routeCoords },
            },
          });
          map.addLayer({
            id: "pb-full-line",
            type: "line",
            source: "pb-full-src",
            paint: {
              "line-color": "#94a3b8",
              "line-width": 6,
              "line-opacity": 0.5,
            },
            layout: { "line-cap": "round", "line-join": "round" },
          });
        }
        if (!map.getSource("pb-prog-src")) {
          map.addSource("pb-prog-src", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: [routeCoords[0], routeCoords[0]],
              },
            },
          });
          map.addLayer({
            id: "pb-prog-line",
            type: "line",
            source: "pb-prog-src",
            paint: {
              "line-color": "#3b82f6",
              "line-width": 6,
              "line-opacity": 1,
            },
            layout: { "line-cap": "round", "line-join": "round" },
          });
        }
        layersReady.current = true;
      } catch {}

      // Native MapLibre marker for the moving dot (no React re-renders)
      if (!markerRef.current) {
        const el = document.createElement("div");
        Object.assign(el.style, {
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          background: "#3b82f6",
          border: "3px solid white",
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
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
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
  }, [map, isLoaded, routeCoords]);

  // Direct update (bypasses React)
  const updateMap = useCallback(
    (pct: number) => {
      if (!map || !layersReady.current) return;
      const { path, position } = getProgressData(
        routeCoords,
        segDists,
        totalDist,
        pct,
      );
      try {
        const src = map.getSource("pb-prog-src") as
          | maplibregl.GeoJSONSource
          | undefined;
        if (src && path.length >= 2) {
          src.setData({
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: path },
          });
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
        progressRef.current = Math.min(
          100,
          progressRef.current + (dt * speedRef.current * 100) / BASE_DURATION,
        );
        updateMap(progressRef.current);
        if (progressRef.current >= 100) {
          playingRef.current = false;
          setUiState({
            progress: 100,
            playing: false,
            speed: speedRef.current,
          });
        }
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);

    // Throttled UI sync (10 fps, not 60)
    const uiTimer = setInterval(() => {
      if (playingRef.current) {
        setUiState({
          progress: progressRef.current,
          playing: true,
          speed: speedRef.current,
        });
      }
    }, 100);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      clearInterval(uiTimer);
    };
  }, [updateMap]);

  const play = useCallback(() => {
    if (progressRef.current >= 100) {
      progressRef.current = 0;
      updateMap(0);
    }
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

  const seek = useCallback(
    (p: number) => {
      progressRef.current = p;
      updateMap(p);
      setUiState((s) => ({ ...s, progress: p }));
    },
    [updateMap],
  );

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
  routeCoords: LngLat[];
  segDists: number[];
  totalDist: number;
  routeInfo: { duration: number; distance: number };
}) {
  const { uiState, play, pause, stop, seek, setSpeed } = usePlaybackAnimation(
    routeCoords,
    segDists,
    totalDist,
  );

  return (
    <>
      {/* Start marker */}
      <MapMarker longitude={routeCoords[0][0]} latitude={routeCoords[0][1]}>
        <MarkerContent>
          <MapMarkerDot color="#22c55e" className="size-5" />
        </MarkerContent>
      </MapMarker>

      {/* End marker */}
      <MapMarker
        longitude={routeCoords[routeCoords.length - 1][0]}
        latitude={routeCoords[routeCoords.length - 1][1]}
      >
        <MarkerContent>
          <MapMarkerDot color="#ef4444" className="size-5" />
        </MarkerContent>
      </MapMarker>

      {/* Control bar */}
      <div className="absolute right-4 bottom-4 left-4 z-10">
        <MapPanel className="border-border/50 border p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex gap-2">
              <MapToolbarButton
                active={uiState.playing}
                shape="circle"
                onClick={uiState.playing ? pause : play}
              >
                {uiState.playing ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="ml-0.5 size-4" />
                )}
              </MapToolbarButton>
              <MapToolbarButton shape="circle" onClick={stop}>
                <Square className="size-3.5" />
              </MapToolbarButton>
            </div>
            <div className="text-muted-foreground text-right text-sm">
              <div>{Math.round(uiState.progress)}% complete</div>
              <div className="flex items-center justify-end gap-1 text-xs">
                <MapStat
                  icon={<Clock className="size-3" />}
                  value={formatDuration(routeInfo.duration)}
                  inline
                />
                <span className="mx-0.5">·</span>
                <MapStat
                  icon={<Ruler className="size-3" />}
                  value={formatDistance(routeInfo.distance)}
                  inline
                />
              </div>
            </div>
          </div>

          <div className="mb-3">
            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={uiState.progress}
              onChange={(e) => seek(Number(e.target.value))}
              className="accent-primary h-1.5 w-full cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-xs">Speed:</span>
            <div className="flex gap-1">
              {[0.5, 1, 2, 4].map((s) => (
                <MapToolbarButton
                  key={s}
                  active={uiState.speed === s}
                  className={cn(
                    "h-auto w-auto px-2 py-0.5 text-xs font-medium",
                  )}
                  onClick={() => setSpeed(s)}
                >
                  {s}x
                </MapToolbarButton>
              ))}
            </div>
          </div>
        </MapPanel>
      </div>
    </>
  );
}

// ── Main content (fetches route, then renders UI) ────────────────
function PlaybackContent() {
  const [routeCoords, setRouteCoords] = useState<LngLat[]>([]);
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

        const allCoords: LngLat[] = [];
        if (data.trip?.legs) {
          for (const leg of data.trip.legs)
            allCoords.push(...decodePolyline(leg.shape));
        }
        const sd = computeSegmentDistances(allCoords);
        setRouteCoords(allCoords);
        setSegDists(sd);
        setTotalDist(sd.reduce((a, b) => a + b, 0));
        setRouteInfo({
          duration: data.trip?.summary?.time ?? 0,
          distance: data.trip?.summary?.length ?? 0,
        });
      } catch (e) {
        if (e instanceof Error && e.name !== "AbortError")
          console.error("Route fetch error:", e);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <div className="text-muted-foreground absolute top-1/2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-sm">Loading route...</span>
      </div>
    );
  }

  if (routeCoords.length < 2) return null;

  return (
    <PlaybackUI
      routeCoords={routeCoords}
      segDists={segDists}
      totalDist={totalDist}
      routeInfo={routeInfo}
    />
  );
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
