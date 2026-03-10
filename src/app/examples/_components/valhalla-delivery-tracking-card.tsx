"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Map, MapMarker, MarkerContent, useMap } from "@/registry/map";
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
      padding: { top: 60, bottom: 60, left: 60, right: 60 },
      maxZoom: 14,
    });
  }, [map, isLoaded, coordinates]);

  return null;
}

// ── Constants ────────────────────────────────────────────────────
const STORE_LOCATION: [number, number] = [-0.14, 51.5154];
const HOME_LOCATION: [number, number] = [-0.05, 51.5134];

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
    <div className="w-72 max-h-[calc(100%-5rem)] overflow-auto rounded-xl bg-background/95 shadow-lg backdrop-blur-sm">
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Package className="size-4 text-blue-500" />
          <h2 className="text-sm font-semibold">Order #12847</h2>
        </div>
      </div>

      <div className="p-3">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-xs">Tracking delivery...</span>
          </div>
        ) : (
          <>
            {/* Status */}
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-green-500" />
              </span>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                On the way
              </span>
            </div>

            {/* ETA + Distance */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5" />
                <div>
                  <div className="text-foreground font-medium">
                    {formatDuration(duration)}
                  </div>
                  <div className="text-[10px]">ETA</div>
                </div>
              </div>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Ruler className="size-3.5" />
                <div>
                  <div className="text-foreground font-medium">
                    {formatDistance(distance)}
                  </div>
                  <div className="text-[10px]">Distance</div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="border-t border-border pt-3">
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Delivery Timeline
              </h3>
              <div className="space-y-0">
                {/* Store - completed */}
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                    <div className="w-px h-6 bg-green-500/50" />
                  </div>
                  <div className="pb-3">
                    <div className="text-xs font-medium">Picked up from store</div>
                    <div className="text-[10px] text-muted-foreground">
                      London Store
                    </div>
                  </div>
                </div>

                {/* In transit */}
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex size-4 items-center justify-center rounded-full bg-blue-500 shrink-0">
                      <Truck className="size-2.5 text-white" />
                    </div>
                    <div className="w-px h-6 bg-border" />
                  </div>
                  <div className="pb-3">
                    <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      In transit
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Driver is on the way
                    </div>
                  </div>
                </div>

                {/* Home - pending */}
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <Circle className="size-4 text-muted-foreground/40 shrink-0" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">
                      Delivery to home
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Your address
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main map content ─────────────────────────────────────────────
function DeliveryMapContent() {
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [truckPos, setTruckPos] = useState<[number, number] | null>(null);
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
      <FitBounds coordinates={[STORE_LOCATION, HOME_LOCATION]} />

      {/* Route line */}
      {routeCoords.length > 1 && (
        <RouteLayer
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
            <div className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-blue-600 shadow-lg animate-pulse">
              <Truck className="size-4 text-white" />
            </div>
          </MarkerContent>
        </MapMarker>
      )}

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
