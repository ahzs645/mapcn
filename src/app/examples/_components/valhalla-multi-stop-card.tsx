"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Map, MapMarker, MarkerContent } from "@/registry/map";
import {
  Loader2,
  Clock,
  Ruler,
  MapPin,
  Route,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import {
  MapFloatingButton,
  MapNumberedMarker,
  MapPanel,
  MapPanelContent,
  MapPanelDescription,
  MapPanelFooter,
  MapPanelHeader,
  MapPanelTitle,
  MapStat,
} from "@/registry/map-ui";
import { cn } from "@/lib/utils";
import {
  decodePolyline,
  formatDistance,
  formatDuration,
  type LngLat,
} from "../_lib/valhalla";
import { ValhallaFitBounds, ValhallaRouteLayer } from "./valhalla-route-layer";

// ── Types ────────────────────────────────────────────────────────
interface StopInfo {
  name: string;
  coordinates: LngLat;
  type: "start" | "waypoint" | "end";
}

interface LegInfo {
  duration: number;
  distance: number;
}

// ── Constants ────────────────────────────────────────────────────
const INITIAL_STOPS: StopInfo[] = [
  { name: "Ferry Building", coordinates: [-122.3936, 37.7956], type: "start" },
  { name: "Chinatown", coordinates: [-122.4058, 37.7941], type: "waypoint" },
  { name: "Union Square", coordinates: [-122.4075, 37.7879], type: "waypoint" },
  {
    name: "Golden Gate Park",
    coordinates: [-122.4862, 37.7694],
    type: "waypoint",
  },
  { name: "Fisherman's Wharf", coordinates: [-122.4169, 37.808], type: "end" },
];

function getStopColor(type: StopInfo["type"]): string {
  switch (type) {
    case "start":
      return "#22c55e";
    case "end":
      return "#ef4444";
    default:
      return "#3b82f6";
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
    <MapPanel className="w-72">
      {/* Header */}
      <MapPanelHeader>
        <div className="flex items-center gap-2">
          <Route className="size-4 text-blue-500" />
          <MapPanelTitle>Trip Summary</MapPanelTitle>
        </div>
        <MapPanelDescription>San Francisco landmarks tour</MapPanelDescription>
      </MapPanelHeader>

      {/* Stats */}
      <MapPanelContent className="border-border border-b">
        {loading ? (
          <div className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-xs">Optimizing route...</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <MapStat
              icon={<Clock className="text-muted-foreground size-3.5" />}
              value={formatDuration(totalDuration)}
              inline
            />
            <div className="bg-border h-4 w-px" />
            <MapStat
              icon={<Ruler className="text-muted-foreground size-3.5" />}
              value={formatDistance(totalDistance)}
              inline
            />
            <div className="bg-border h-4 w-px" />
            <MapStat
              icon={<MapPin className="text-muted-foreground size-3.5" />}
              value={`${stops.length} stops`}
              inline
            />
          </div>
        )}
      </MapPanelContent>

      {/* Journey list */}
      <MapPanelContent>
        <h3 className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
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
                    <MapNumberedMarker
                      color={getStopColor(stop.type)}
                      label={idx + 1}
                      className="size-6 shrink-0 border-0 text-[10px]"
                    />
                    {idx < stops.length - 1 && (
                      <div className="bg-border h-6 w-px" />
                    )}
                  </div>
                  <div className={cn("pb-1", idx < stops.length - 1 && "pb-3")}>
                    <div className="text-xs font-medium">{stop.name}</div>
                    <div className="text-muted-foreground text-[10px]">
                      {idx === 0
                        ? "Start"
                        : `Arrive +${formatDuration(cumulativeTime)}`}
                    </div>
                  </div>
                </div>

                {/* Leg duration between stops */}
                {leg && idx < stops.length - 1 && (
                  <div className="mb-1 flex items-center gap-3">
                    <div className="flex w-6 flex-col items-center">
                      <div className="bg-border h-2 w-px" />
                    </div>
                    <div className="text-muted-foreground text-[10px] italic">
                      {formatDuration(leg.duration)} &middot;{" "}
                      {formatDistance(leg.distance)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </MapPanelContent>

      <MapPanelFooter>
        <p className="text-muted-foreground text-[10px] leading-tight">
          Drag markers to reorder stops
        </p>
      </MapPanelFooter>
    </MapPanel>
  );
}

// ── Main map content ─────────────────────────────────────────────
function MultiStopMapContent() {
  const [stops, setStops] = useState<StopInfo[]>(INITIAL_STOPS);
  const [routeCoords, setRouteCoords] = useState<LngLat[]>([]);
  const [legs, setLegs] = useState<LegInfo[]>([]);
  const [totalDuration, setTotalDuration] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetchRoute = useCallback(async (currentStops: StopInfo[]) => {
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
        { signal: controller.signal },
      );
      if (!res.ok) throw new Error("API error");
      const data = await res.json();

      if (controller.signal.aborted) return;

      const allCoords: LngLat[] = [];
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
  }, []);

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
    [fetchRoute],
  );

  const stopCoords = stops.map((s) => s.coordinates);

  return (
    <>
      <ValhallaFitBounds coordinates={stopCoords} />

      {/* Route line */}
      {routeCoords.length > 1 && (
        <ValhallaRouteLayer
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
            <MapNumberedMarker
              color={getStopColor(stop.type)}
              label={idx + 1}
              className="size-7 text-[11px]"
            />
          </MarkerContent>
        </MapMarker>
      ))}

      {/* Panel toggle */}
      <MapFloatingButton
        active={!panelOpen}
        onClick={() => setPanelOpen((o) => !o)}
      >
        {panelOpen ? (
          <PanelLeftClose className="size-4" />
        ) : (
          <PanelLeftOpen className="size-4" />
        )}
      </MapFloatingButton>

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
