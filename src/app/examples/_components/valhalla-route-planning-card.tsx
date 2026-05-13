"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Map, MapMarker, MarkerContent } from "@/registry/map";
import {
  Loader2,
  Clock,
  Ruler,
  Navigation,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import {
  MapFloatingButton,
  MapLegend,
  MapLegendItem,
  MapPanel,
  MapPanelDescription,
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
interface RouteOption {
  coordinates: LngLat[];
  duration: number;
  distance: number;
}

// ── Constants ────────────────────────────────────────────────────
const ORIGIN: LngLat = [4.4777, 51.9244];
const DESTINATION: LngLat = [4.9041, 52.3676];

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
    <MapPanel className="w-72">
      <MapPanelHeader>
        <div className="flex items-center gap-2">
          <Navigation className="size-4 text-indigo-500" />
          <MapPanelTitle>Route Options</MapPanelTitle>
        </div>
        <MapPanelDescription>Rotterdam → Amsterdam</MapPanelDescription>
      </MapPanelHeader>

      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2 p-4">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-xs">Finding routes...</span>
        </div>
      ) : (
        <div className="divide-border divide-y">
          {routes.map((route, idx) => (
            <button
              key={idx}
              className={cn(
                "flex w-full cursor-pointer items-start gap-3 p-3 text-left transition-colors",
                selected === idx ? "bg-indigo-500/10" : "hover:bg-muted/50",
              )}
              onClick={() => onSelect(idx)}
            >
              <div
                className={cn(
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  selected === idx
                    ? "bg-indigo-500 text-white"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {idx + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Route {idx + 1}</span>
                  {idx === 0 && (
                    <span className="rounded-full bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                      Fastest
                    </span>
                  )}
                </div>
                <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                  <MapStat
                    icon={<Clock className="size-3" />}
                    value={formatDuration(route.duration)}
                    inline
                  />
                  <MapStat
                    icon={<Ruler className="size-3" />}
                    value={formatDistance(route.distance)}
                    inline
                  />
                </div>
              </div>
              <div
                className={cn(
                  "mt-1 size-3 shrink-0 rounded-full border-2",
                  selected === idx
                    ? "border-indigo-500 bg-indigo-500"
                    : "border-muted-foreground/40",
                )}
              />
            </button>
          ))}
        </div>
      )}
    </MapPanel>
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
        { signal: controller.signal },
      );
      if (!res.ok) throw new Error("API error");
      const data = await res.json();

      if (controller.signal.aborted) return;

      const parsed: RouteOption[] = [];

      // Main route
      if (data.trip?.legs) {
        const allCoords: LngLat[] = [];
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
            const altCoords: LngLat[] = [];
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
      <ValhallaFitBounds
        coordinates={[ORIGIN, DESTINATION]}
        options={{ maxZoom: 12 }}
      />

      {/* Render non-selected (alternate) routes first, behind */}
      {routes.map((route, idx) =>
        idx !== selected ? (
          <ValhallaRouteLayer
            key={`route-alt-${idx}`}
            id={`valhalla-route-alt-${idx}`}
            coordinates={route.coordinates}
            color="#9ca3af"
            width={4}
            opacity={0.5}
          />
        ) : null,
      )}

      {/* Render selected route on top */}
      {routes[selected] && (
        <ValhallaRouteLayer
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
        <MapLegend title="Route Planning" position="bottom-left" collapsible>
          <MapLegendItem color="#6366f1" label="Selected Route" swatchShape="line" disabled />
          <MapLegendItem color="#6b7280" label="Alternate Route" swatchShape="line" disabled />
          <MapLegendItem color="#ef4444" label="Origin (Rotterdam)" swatchShape="dot" disabled />
          <MapLegendItem color="#10b981" label="Destination (Amsterdam)" swatchShape="dot" disabled />
        </MapLegend>
      </Map>
    </div>
  );
}
