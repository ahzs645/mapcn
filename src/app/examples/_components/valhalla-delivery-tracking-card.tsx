"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Map, MapMarker, MarkerContent } from "@/registry/map";
import {
  Loader2,
  Store,
  Home,
  Truck,
  Clock,
  Ruler,
  CheckCircle2,
  Circle,
  PanelLeftClose,
  PanelLeftOpen,
  Package,
} from "lucide-react";
import {
  MapFloatingButton,
  MapPanel,
  MapPanelContent,
  MapPanelHeader,
  MapPanelTitle,
  MapStat,
} from "@/registry/map-ui";
import {
  decodePolyline,
  formatDistance,
  formatDuration,
  type LngLat,
} from "../_lib/valhalla";
import { ValhallaFitBounds, ValhallaRouteLayer } from "./valhalla-route-layer";

// ── Constants ────────────────────────────────────────────────────
const STORE_LOCATION: LngLat = [-0.14, 51.5154];
const HOME_LOCATION: LngLat = [-0.05, 51.5134];

// ── Delivery panel ───────────────────────────────────────────────
function DeliveryPanel({
  duration,
  distance,
  loading,
}: {
  duration: number;
  distance: number;
  loading: boolean;
}) {
  return (
    <MapPanel className="w-72">
      <MapPanelHeader>
        <div className="flex items-center gap-2">
          <Package className="size-4 text-blue-500" />
          <MapPanelTitle>Order #12847</MapPanelTitle>
        </div>
      </MapPanelHeader>

      <MapPanelContent>
        {loading ? (
          <div className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-xs">Tracking delivery...</span>
          </div>
        ) : (
          <>
            {/* Status */}
            <div className="mb-3 flex items-center gap-2">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-green-500" />
              </span>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                On the way
              </span>
            </div>

            {/* ETA + Distance */}
            <div className="mb-4 flex items-center gap-4">
              <MapStat
                icon={<Clock className="size-3.5" />}
                value={formatDuration(duration)}
                label="ETA"
              />
              <div className="bg-border h-6 w-px" />
              <MapStat
                icon={<Ruler className="size-3.5" />}
                value={formatDistance(distance)}
                label="Distance"
              />
            </div>

            {/* Timeline */}
            <div className="border-border border-t pt-3">
              <h3 className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
                Delivery Timeline
              </h3>
              <div className="space-y-0">
                {/* Store - completed */}
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <CheckCircle2 className="size-4 shrink-0 text-green-500" />
                    <div className="h-6 w-px bg-green-500/50" />
                  </div>
                  <div className="pb-3">
                    <div className="text-xs font-medium">
                      Picked up from store
                    </div>
                    <div className="text-muted-foreground text-[10px]">
                      London Store
                    </div>
                  </div>
                </div>

                {/* In transit */}
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex size-4 shrink-0 items-center justify-center rounded-full bg-blue-500">
                      <Truck className="size-2.5 text-white" />
                    </div>
                    <div className="bg-border h-6 w-px" />
                  </div>
                  <div className="pb-3">
                    <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      In transit
                    </div>
                    <div className="text-muted-foreground text-[10px]">
                      Driver is on the way
                    </div>
                  </div>
                </div>

                {/* Home - pending */}
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <Circle className="text-muted-foreground/40 size-4 shrink-0" />
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs font-medium">
                      Delivery to home
                    </div>
                    <div className="text-muted-foreground text-[10px]">
                      Your address
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </MapPanelContent>
    </MapPanel>
  );
}

// ── Main map content ─────────────────────────────────────────────
function DeliveryMapContent() {
  const [routeCoords, setRouteCoords] = useState<LngLat[]>([]);
  const [truckPos, setTruckPos] = useState<LngLat | null>(null);
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetchRoute = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    const params = {
      locations: [
        { lat: STORE_LOCATION[1], lon: STORE_LOCATION[0], type: "break" },
        { lat: HOME_LOCATION[1], lon: HOME_LOCATION[0], type: "break" },
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
        for (const leg of data.trip.legs) {
          allCoords.push(...decodePolyline(leg.shape));
        }
      }

      setRouteCoords(allCoords);
      setDuration(data.trip?.summary?.time ?? 0);
      setDistance(data.trip?.summary?.length ?? 0);

      // Place truck at route midpoint
      if (allCoords.length > 2) {
        const mid = Math.floor(allCoords.length / 2);
        setTruckPos(allCoords[mid]);
      }
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") {
        console.error("Delivery route fetch error:", e);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoute();
    return () => abortRef.current?.abort();
  }, [fetchRoute]);

  return (
    <>
      <ValhallaFitBounds coordinates={[STORE_LOCATION, HOME_LOCATION]} />

      {/* Route line */}
      {routeCoords.length > 1 && (
        <ValhallaRouteLayer
          id="delivery-route"
          coordinates={routeCoords}
          color="#3b82f6"
          width={4}
          opacity={0.85}
        />
      )}

      {/* Store marker */}
      <MapMarker longitude={STORE_LOCATION[0]} latitude={STORE_LOCATION[1]}>
        <MarkerContent>
          <div className="flex size-7 items-center justify-center rounded-full border-2 border-white bg-green-500 shadow-lg">
            <Store className="size-3.5 text-white" />
          </div>
        </MarkerContent>
      </MapMarker>

      {/* Home marker */}
      <MapMarker longitude={HOME_LOCATION[0]} latitude={HOME_LOCATION[1]}>
        <MarkerContent>
          <div className="flex size-7 items-center justify-center rounded-full border-2 border-white bg-blue-500 shadow-lg">
            <Home className="size-3.5 text-white" />
          </div>
        </MarkerContent>
      </MapMarker>

      {/* Truck marker at midpoint */}
      {truckPos && (
        <MapMarker longitude={truckPos[0]} latitude={truckPos[1]}>
          <MarkerContent>
            <div className="flex size-8 animate-pulse items-center justify-center rounded-full border-2 border-white bg-blue-600 shadow-lg">
              <Truck className="size-4 text-white" />
            </div>
          </MarkerContent>
        </MapMarker>
      )}

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
          <DeliveryPanel
            duration={duration}
            distance={distance}
            loading={loading}
          />
        </div>
      )}
    </>
  );
}

// ── Exported card ────────────────────────────────────────────────
export function ValhallaDeliveryTrackingCard() {
  return (
    <div className="relative h-full w-full">
      <Map center={[-0.095, 51.515]} zoom={13}>
        <DeliveryMapContent />
      </Map>
    </div>
  );
}
