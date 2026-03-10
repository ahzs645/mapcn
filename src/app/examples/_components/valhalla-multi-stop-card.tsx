"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Map, MapMarker, MarkerContent, useMap } from "@/registry/map";
import {
  Loader2,
  Clock,
  Ruler,
  MapPin,
  Route,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────
interface StopInfo {
  name: string;
  coordinates: [number, number];
  type: "start" | "waypoint" | "end";
}

interface LegInfo {
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
      maxZoom: 14,
    });
  }, [map, isLoaded, coordinates]);

  return null;
}

// ── Constants ────────────────────────────────────────────────────
const INITIAL_STOPS: StopInfo[] = [
  { name: "Ferry Building", coordinates: [-122.3936, 37.7956], type: "start" },
  { name: "Chinatown", coordinates: [-122.4058, 37.7941], type: "waypoint" },
  { name: "Union Square", coordinates: [-122.4075, 37.7879], type: "waypoint" },
  { name: "Golden Gate Park", coordinates: [-122.4862, 37.7694], type: "waypoint" },
  { name: "Fisherman's Wharf", coordinates: [-122.4169, 37.808], type: "end" },
];

function getStopColor(type: StopInfo["type"]): string {
  switch (type) {
    case "start":
      return "bg-green-500";
    case "end":
      return "bg-red-500";
    default:
      return "bg-blue-500";
  }
}

// ── Trip panel ───────────────────────────────────────────────────
function TripPanel({
  stops,
  legs,
  totalDuration,
  totalDistance,
  loading,
}: {
  stops: StopInfo[];
  legs: LegInfo[];
  totalDuration: number;
  totalDistance: number;
  loading: boolean;
}) {
  return (
    <div className="w-72 max-h-[calc(100%-5rem)] overflow-auto rounded-xl bg-background/95 shadow-lg backdrop-blur-sm">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Route className="size-4 text-blue-500" />
          <h2 className="text-sm font-semibold">Trip Summary</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          San Francisco landmarks tour
        </p>
      </div>

      {/* Stats */}
      <div className="p-3 border-b border-border">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-xs">Optimizing route...</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <Clock className="size-3.5 text-muted-foreground" />
              <span className="font-medium">{formatDuration(totalDuration)}</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1.5 text-xs">
              <Ruler className="size-3.5 text-muted-foreground" />
              <span className="font-medium">{formatDistance(totalDistance)}</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1.5 text-xs">
              <MapPin className="size-3.5 text-muted-foreground" />
              <span className="font-medium">{stops.length} stops</span>
            </div>
          </div>
        )}
      </div>

      {/* Journey list */}
      <div className="p-3">
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Journey
        </h3>
        <div className="space-y-0">
          {stops.map((stop, idx) => {
            const leg = legs[idx];
            const cumulativeTime = legs
              .slice(0, idx)
              .reduce((sum, l) => sum + l.duration, 0);
            return (
              <div key={idx}>
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full text-[10px] font-bold text-white shrink-0",
                        getStopColor(stop.type)
                      )}
                    >
                      {idx + 1}
                    </div>
                    {idx < stops.length - 1 && (
                      <div className="w-px h-6 bg-border" />
                    )}
                  </div>
                  <div className={cn("pb-1", idx < stops.length - 1 && "pb-3")}>
                    <div className="text-xs font-medium">{stop.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {idx === 0
                        ? "Start"
                        : `Arrive +${formatDuration(cumulativeTime)}`}
                    </div>
                  </div>
                </div>

                {/* Leg duration between stops */}
                {leg && idx < stops.length - 1 && (
                  <div className="flex items-center gap-3 mb-1">
                    <div className="flex flex-col items-center w-6">
                      <div className="w-px h-2 bg-border" />
                    </div>
                    <div className="text-[10px] text-muted-foreground italic">
                      {formatDuration(leg.duration)} &middot;{" "}
                      {formatDistance(leg.distance)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-3 pb-3">
        <p className="text-[10px] text-muted-foreground leading-tight">
          Drag markers to reorder stops
        </p>
      </div>
    </div>
  );
}

// ── Main map content ─────────────────────────────────────────────
function MultiStopMapContent() {
  const [stops, setStops] = useState<StopInfo[]>(INITIAL_STOPS);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [legs, setLegs] = useState<LegInfo[]>([]);
  const [totalDuration, setTotalDuration] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetchRoute = useCallback(
    async (currentStops: StopInfo[]) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);

      const locations = currentStops.map((s) => ({
        lat: s.coordinates[1],
        lon: s.coordinates[0],
        type: "break",
      }));

      const params = {
        locations,
        costing: "auto",
        directions_options: { units: "kilometers" },
      };

      try {
        const res = await fetch(
          `/api/valhalla?endpoint=optimized_route&json=${encodeURIComponent(JSON.stringify(params))}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("API error");
        const data = await res.json();

        if (controller.signal.aborted) return;

        const allCoords: [number, number][] = [];
        const parsedLegs: LegInfo[] = [];

        if (data.trip?.legs) {
          for (const leg of data.trip.legs) {
            allCoords.push(...decodePolyline(leg.shape));
            parsedLegs.push({
              duration: leg.summary?.time ?? 0,
              distance: leg.summary?.length ?? 0,
            });
          }
        }

        setRouteCoords(allCoords);
        setLegs(parsedLegs);
        setTotalDuration(data.trip?.summary?.time ?? 0);
        setTotalDistance(data.trip?.summary?.length ?? 0);
      } catch (e) {
        if (e instanceof Error && e.name !== "AbortError") {
          console.error("Multi-stop route fetch error:", e);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchRoute(stops);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDragEnd = useCallback(
    (idx: number, lngLat: { lng: number; lat: number }) => {
      setStops((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], coordinates: [lngLat.lng, lngLat.lat] };
        fetchRoute(next);
        return next;
      });
    },
    [fetchRoute]
  );

  const stopCoords = stops.map((s) => s.coordinates);

  return (
    <>
      <FitBounds coordinates={stopCoords} />

      {/* Route line */}
      {routeCoords.length > 1 && (
        <RouteLayer
          id="multi-stop-route"
          coordinates={routeCoords}
          color="#3b82f6"
          width={4}
          opacity={0.85}
        />
      )}

      {/* Stop markers */}
      {stops.map((stop, idx) => (
        <MapMarker
          key={idx}
          longitude={stop.coordinates[0]}
          latitude={stop.coordinates[1]}
          draggable
          onDragEnd={(lngLat) => handleDragEnd(idx, lngLat)}
        >
          <MarkerContent>
            <div
              className={cn(
                "flex size-7 items-center justify-center rounded-full border-2 border-white shadow-lg text-[11px] font-bold text-white",
                getStopColor(stop.type)
              )}
            >
              {idx + 1}
            </div>
          </MarkerContent>
        </MapMarker>
      ))}

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
          <TripPanel
            stops={stops}
            legs={legs}
            totalDuration={totalDuration}
            totalDistance={totalDistance}
            loading={loading}
          />
        </div>
      )}
    </>
  );
}

// ── Exported card ────────────────────────────────────────────────
export function ValhallaMultiStopCard() {
  return (
    <div className="relative h-full w-full">
      <Map center={[-122.43, 37.79]} zoom={12}>
        <MultiStopMapContent />
      </Map>
    </div>
  );
}
