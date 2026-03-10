"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Map, MapMarker, MarkerContent, useMap } from "@/registry/map";
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
  Ruler,
  Navigation,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────
interface RouteOption {
  coordinates: [number, number][];
  duration: number;
  distance: number;
}

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
      padding: { top: 60, bottom: 60, left: 60, right: 60 },
      maxZoom: 12,
    });
  }, [map, isLoaded, coordinates]);

  return null;
}

// ── Constants ────────────────────────────────────────────────────
const ORIGIN: [number, number] = [4.4777, 51.9244];
const DESTINATION: [number, number] = [4.9041, 52.3676];

// ── Route panel ──────────────────────────────────────────────────
function RoutePanel({
  routes,
  selected,
  loading,
  onSelect,
}: {
  routes: RouteOption[];
  selected: number;
  loading: boolean;
  onSelect: (idx: number) => void;
}) {
  return (
    <div className="w-72 max-h-[calc(100%-5rem)] overflow-auto rounded-xl bg-background/95 shadow-lg backdrop-blur-sm">
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Navigation className="size-4 text-indigo-500" />
          <h2 className="text-sm font-semibold">Route Options</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Rotterdam → Amsterdam
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 p-4 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-xs">Finding routes...</span>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {routes.map((route, idx) => (
            <button
              key={idx}
              className={cn(
                "flex w-full items-start gap-3 p-3 text-left transition-colors cursor-pointer",
                selected === idx
                  ? "bg-indigo-500/10"
                  : "hover:bg-muted/50"
              )}
              onClick={() => onSelect(idx)}
            >
              <div
                className={cn(
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  selected === idx
                    ? "bg-indigo-500 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    Route {idx + 1}
                  </span>
                  {idx === 0 && (
                    <span className="rounded-full bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                      Fastest
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatDuration(route.duration)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Ruler className="size-3" />
                    {formatDistance(route.distance)}
                  </span>
                </div>
              </div>
              <div
                className={cn(
                  "mt-1 size-3 shrink-0 rounded-full border-2",
                  selected === idx
                    ? "border-indigo-500 bg-indigo-500"
                    : "border-muted-foreground/40"
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main map content ─────────────────────────────────────────────
function RoutePlanningMapContent() {
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetchRoutes = useCallback(async () => {
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
      alternates: 2,
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

      const parsed: RouteOption[] = [];

      // Main route
      if (data.trip?.legs) {
        const allCoords: [number, number][] = [];
        for (const leg of data.trip.legs) {
          allCoords.push(...decodePolyline(leg.shape));
        }
        parsed.push({
          coordinates: allCoords,
          duration: data.trip.summary?.time ?? 0,
          distance: data.trip.summary?.length ?? 0,
        });
      }

      // Alternates
      if (data.alternates) {
        for (const alt of data.alternates) {
          if (alt.trip?.legs) {
            const altCoords: [number, number][] = [];
            for (const leg of alt.trip.legs) {
              altCoords.push(...decodePolyline(leg.shape));
            }
            parsed.push({
              coordinates: altCoords,
              duration: alt.trip.summary?.time ?? 0,
              distance: alt.trip.summary?.length ?? 0,
            });
          }
        }
      }

      setRoutes(parsed);
      setSelected(0);
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") {
        console.error("Route fetch error:", e);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoutes();
    return () => abortRef.current?.abort();
  }, [fetchRoutes]);

  return (
    <>
      <FitBounds coordinates={[ORIGIN, DESTINATION]} />

      {/* Render non-selected (alternate) routes first, behind */}
      {routes.map((route, idx) =>
        idx !== selected ? (
          <RouteLayer
            key={`route-alt-${idx}`}
            id={`valhalla-route-alt-${idx}`}
            coordinates={route.coordinates}
            color="#9ca3af"
            width={4}
            opacity={0.5}
          />
        ) : null
      )}

      {/* Render selected route on top */}
      {routes[selected] && (
        <RouteLayer
          key={`route-selected-${selected}`}
          id="valhalla-route-selected"
          coordinates={routes[selected].coordinates}
          color="#6366f1"
          width={5}
          opacity={1}
        />
      )}

      {/* Origin marker - Rotterdam */}
      <MapMarker longitude={ORIGIN[0]} latitude={ORIGIN[1]}>
        <MarkerContent>
          <div className="flex size-6 items-center justify-center rounded-full border-2 border-white bg-red-500 shadow-lg">
            <div className="size-2 rounded-full bg-white" />
          </div>
        </MarkerContent>
      </MapMarker>

      {/* Destination marker - Amsterdam */}
      <MapMarker longitude={DESTINATION[0]} latitude={DESTINATION[1]}>
        <MarkerContent>
          <div className="flex size-6 items-center justify-center rounded-full border-2 border-white bg-green-500 shadow-lg">
            <div className="size-2 rounded-full bg-white" />
          </div>
        </MarkerContent>
      </MapMarker>

      {/* Panel toggle */}
      <button
        className={cn(
          "absolute top-4 left-4 z-10 flex size-9 items-center justify-center rounded-lg shadow-lg backdrop-blur-sm transition-colors cursor-pointer",
          panelOpen
            ? "bg-background/95 hover:bg-accent"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
        onClick={() => setPanelOpen((o) => !o)}
      >
        {panelOpen ? (
          <PanelLeftClose className="size-4" />
        ) : (
          <PanelLeftOpen className="size-4" />
        )}
      </button>

      {panelOpen && (
        <div className="absolute top-16 left-4 z-10">
          <RoutePanel
            routes={routes}
            selected={selected}
            loading={loading}
            onSelect={setSelected}
          />
        </div>
      )}
    </>
  );
}

// ── Exported card ────────────────────────────────────────────────
export function ValhallaRoutePlanningCard() {
  return (
    <div className="relative h-full w-full">
      <Map center={[4.69, 52.15]} zoom={9}>
        <RoutePlanningMapContent />
      </Map>
    </div>
  );
}
