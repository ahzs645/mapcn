"use client";

import { useEffect, useRef, useState, useCallback, useId } from "react";
import { Map, MapMarker, MarkerContent, MapRoute, useMap } from "@/registry/map";
import {
  ChevronDown,
  Loader2,
  RefreshCw,
  MapPin,
  Landmark,
  Utensils,
  Bed,
  ArrowRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────
type ActivityType = "Attraction" | "Dining";

interface TripActivity {
  name: string;
  type: ActivityType;
  time: string;
  coordinates: [number, number];
}

interface TripDayPlan {
  day: number;
  title: string;
  activities: TripActivity[];
  stay: { name: string; price: string; coordinates: [number, number] };
}

interface TripHighlight {
  name: string;
  coordinates: [number, number];
}

interface TripData {
  title: string;
  duration: string;
  budget: string;
  highlights: TripHighlight[];
  days: TripDayPlan[];
  routeWaypoints: [number, number][];
}

interface ValhallaLeg {
  shape: string;
  summary: { length: number; time: number };
}

interface ValhallaResponse {
  trip: { legs: ValhallaLeg[]; summary: { length: number; time: number } };
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

// ── Route layer using raw GeoJSON ────────────────────────────────
function TripRouteLayer({ coordinates }: { coordinates: [number, number][] }) {
  const { map, isLoaded } = useMap();
  const idBase = useId();
  const sourceId = `trip-route-src-${idBase}`;
  const layerId = `trip-route-line-${idBase}`;

  useEffect(() => {
    if (!map || !isLoaded || coordinates.length < 2) return;

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
            "line-color": "#6366f1",
            "line-width": 4,
            "line-opacity": 0.85,
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
  }, [map, isLoaded, coordinates, sourceId, layerId]);

  return null;
}

// ── Fit bounds helper ────────────────────────────────────────────
function useFitBounds(coordinates: [number, number][]) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded || coordinates.length < 2) return;
    const lngs = coordinates.map((c) => c[0]);
    const lats = coordinates.map((c) => c[1]);
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ];
    map.fitBounds(bounds, { padding: { top: 50, bottom: 50, left: 50, right: 50 }, maxZoom: 8 });
  }, [map, isLoaded, coordinates]);
}

function FitBounds({ coordinates }: { coordinates: [number, number][] }) {
  useFitBounds(coordinates);
  return null;
}

// ── Activity badge ───────────────────────────────────────────────
function ActivityBadge({ type }: { type: ActivityType }) {
  const isAttraction = type === "Attraction";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
        isAttraction
          ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
          : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
      )}
    >
      {isAttraction ? <Landmark className="size-2.5" /> : <Utensils className="size-2.5" />}
      {type}
    </span>
  );
}

// ── Trip panel ───────────────────────────────────────────────────
function TripPanel({
  data,
  loading,
  onRegenerate,
}: {
  data: TripData;
  loading: boolean;
  onRegenerate: () => void;
}) {
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));

  const toggleDay = (day: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  return (
    <div className="w-80 max-h-[calc(100%-5rem)] overflow-auto rounded-xl bg-background/95 shadow-lg backdrop-blur-sm">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">{data.title}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {data.duration} &bull; {data.budget} budget
            </p>
          </div>
          <button
            disabled={loading}
            onClick={onRegenerate}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={cn("size-3", loading && "animate-spin")} />
            Regenerate
          </button>
        </div>

        <div className="mt-3 border-t border-border pt-3">
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Route Highlights
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {data.highlights.map((h, i) => (
              <div
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400"
              >
                <MapPin className="size-3" />
                {h.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        {data.days.map((day) => (
          <div key={day.day} className="border-b border-border last:border-b-0">
            <button
              className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-muted/50 cursor-pointer"
              onClick={() => toggleDay(day.day)}
            >
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {day.day}
                </div>
                <span className="text-sm font-medium">
                  Day {day.day}: {day.title}
                </span>
              </div>
              <ChevronDown
                className={cn(
                  "size-4 text-muted-foreground transition-transform duration-200",
                  expandedDays.has(day.day) && "rotate-180"
                )}
              />
            </button>

            {expandedDays.has(day.day) && (
              <div className="border-t border-border">
                <div className="divide-y divide-border">
                  {day.activities.map((activity, ai) => (
                    <div key={ai} className="flex items-center gap-2 px-3 py-2">
                      <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                      <span className="flex-1 text-xs">{activity.name}</span>
                      <ActivityBadge type={activity.type} />
                      <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                        {activity.time}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Bed className="size-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Stay:</span>
                    <span className="font-medium">{day.stay.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    {day.stay.price}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main map content ─────────────────────────────────────────────
function TripMapContent({
  data,
  routeCoordinates,
}: {
  data: TripData;
  routeCoordinates: [number, number][];
}) {
  return (
    <>
      {routeCoordinates.length > 1 && (
        <>
          <TripRouteLayer coordinates={routeCoordinates} />
          <FitBounds coordinates={data.routeWaypoints} />
        </>
      )}
      {data.highlights.map((h, i) => (
        <MapMarker key={i} longitude={h.coordinates[0]} latitude={h.coordinates[1]}>
          <MarkerContent>
            <div className="flex size-6 items-center justify-center rounded-full border-2 border-white bg-indigo-500 shadow-lg">
              <div className="size-2 rounded-full bg-white" />
            </div>
          </MarkerContent>
        </MapMarker>
      ))}
    </>
  );
}

// ── Exported card ────────────────────────────────────────────────
export function TripPlannerCard() {
  const [data, setData] = useState<TripData | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetchTrip = useCallback(async (regenerate = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    try {
      const seed = regenerate ? Date.now() : "default";
      const res = await fetch(`/api/trip-planner?seed=${seed}`, { signal: controller.signal });
      if (!res.ok) throw new Error("API error");
      const tripData: TripData = await res.json();
      if (controller.signal.aborted) return;
      setData(tripData);

      if (tripData.routeWaypoints.length > 1) {
        const locations = tripData.routeWaypoints.map(([lon, lat]) => ({
          lat,
          lon,
          type: "break",
        }));
        const params = {
          locations,
          costing: "auto",
          directions_options: { units: "kilometers" },
        };
        const routeRes = await fetch(
          `/api/valhalla?endpoint=route&json=${encodeURIComponent(JSON.stringify(params))}`,
          { signal: controller.signal }
        );
        if (!routeRes.ok) throw new Error("Route API error");
        const routeData: ValhallaResponse = await routeRes.json();

        const allCoords: [number, number][] = [];
        if (routeData.trip?.legs) {
          for (const leg of routeData.trip.legs) {
            allCoords.push(...decodePolyline(leg.shape));
          }
        }
        if (!controller.signal.aborted) setRouteCoords(allCoords);
      }
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") {
        console.error("Trip planner fetch error:", e);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrip();
    return () => abortRef.current?.abort();
  }, [fetchTrip]);

  if (loading && !data) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <span>Planning your adventure...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <Map center={[-120.5, 35.5]} zoom={5}>
        {data && <TripMapContent data={data} routeCoordinates={routeCoords} />}
      </Map>

      <button
        className={cn(
          "absolute top-4 left-4 z-10 flex size-9 items-center justify-center rounded-lg shadow-lg backdrop-blur-sm transition-colors cursor-pointer",
          panelOpen
            ? "bg-background/95 hover:bg-accent"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
        onClick={() => setPanelOpen((o) => !o)}
      >
        {panelOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
      </button>

      {panelOpen && data && (
        <div className="absolute top-16 left-4 z-10">
          <TripPanel data={data} loading={loading} onRegenerate={() => fetchTrip(true)} />
        </div>
      )}
    </div>
  );
}
