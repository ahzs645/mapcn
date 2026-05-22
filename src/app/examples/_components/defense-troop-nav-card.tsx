"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Map, useMap } from "@/registry/map";
import {
  MapPanel,
  MapPanelContent,
  MapPanelHeader,
  MapPanelTitle,
} from "@/registry/map-ui";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { PathLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";

interface TroopWaypoint {
  id: string;
  position: [number, number];
  label: string;
}

interface ElevationPoint {
  distance: number;
  altitude: number;
}

interface RouteStats {
  distanceKm: number;
  timeHours: number;
  elevationGain: number;
  elevationLoss: number;
}

const MAX_WAYPOINTS = 8;

function haversineDistance(
  a: [number, number],
  b: [number, number],
): number {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function interpolateLine(
  a: [number, number],
  b: [number, number],
  steps: number,
): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}

function buildRoute(waypoints: TroopWaypoint[]): [number, number][] {
  if (waypoints.length < 2) return [];
  const coords: [number, number][] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const seg = interpolateLine(
      waypoints[i]!.position,
      waypoints[i + 1]!.position,
      20,
    );
    if (i > 0) seg.shift();
    coords.push(...seg);
  }
  return coords;
}

function generateElevationProfile(
  coords: [number, number][],
): ElevationPoint[] {
  if (coords.length === 0) return [];
  const points: ElevationPoint[] = [];
  let cumulative = 0;
  for (let i = 0; i < coords.length; i++) {
    if (i > 0) cumulative += haversineDistance(coords[i - 1]!, coords[i]!);
    const d = cumulative;
    const altitude =
      3500 +
      200 * Math.sin(d * 0.8) +
      120 * Math.cos(d * 1.5 + 1) +
      80 * Math.sin(d * 3.2 + 2) +
      50 * Math.cos(d * 0.3);
    points.push({ distance: cumulative, altitude });
  }
  return points;
}

function computeStats(
  distanceKm: number,
  elevation: ElevationPoint[],
): RouteStats {
  let gain = 0;
  let loss = 0;
  for (let i = 1; i < elevation.length; i++) {
    const diff = elevation[i]!.altitude - elevation[i - 1]!.altitude;
    if (diff > 0) gain += diff;
    else loss += Math.abs(diff);
  }
  // ~4km/h pedestrian pace
  return {
    distanceKm,
    timeHours: distanceKm / 4,
    elevationGain: Math.round(gain),
    elevationLoss: Math.round(loss),
  };
}

function TroopOverlay({
  waypoints,
  routeCoords,
  onMapClick,
}: {
  waypoints: TroopWaypoint[];
  routeCoords: [number, number][];
  onMapClick: (pos: [number, number]) => void;
}) {
  const { map, isLoaded } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;
    const handleClick = (e: maplibregl.MapMouseEvent) => {
      onMapClickRef.current([e.lngLat.lng, e.lngLat.lat]);
    };
    const add = () => {
      overlay = new MapboxOverlay({ layers: [] });
      overlayRef.current = overlay;
      map.addControl(overlay as unknown as maplibregl.IControl);
    };
    if (map.isStyleLoaded()) add();
    else map.once("load", add);
    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
      map.off("load", add);
      if (overlay) {
        try {
          map.removeControl(overlay as unknown as maplibregl.IControl);
        } catch {
          // ignore
        }
      }
      overlayRef.current = null;
    };
  }, [map, isLoaded]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const wpData = waypoints.map((wp, i) => ({
      position: wp.position,
      label: wp.label,
      index: i,
    }));
    overlay.setProps({
      layers: [
        ...(routeCoords.length > 1
          ? [
              new PathLayer({
                id: "troop-route",
                data: [{ path: routeCoords }],
                getPath: (d: { path: [number, number][] }) => d.path,
                getColor: [0, 200, 100, 200],
                getWidth: 4,
                widthUnits: "pixels",
                capRounded: true,
                jointRounded: true,
              }),
            ]
          : []),
        new ScatterplotLayer({
          id: "troop-waypoints",
          data: wpData,
          getPosition: (d: { position: [number, number] }) => d.position,
          getFillColor: [30, 100, 220, 220],
          getRadius: (d: { index: number }) => (d.index === 0 ? 10 : 7),
          radiusUnits: "pixels",
          stroked: true,
          getLineColor: [255, 255, 255, 200],
          lineWidthMinPixels: 2,
        }),
        new TextLayer({
          id: "troop-labels",
          data: wpData,
          getPosition: (d: { position: [number, number] }) => d.position,
          getText: (d: { label: string }) => d.label,
          getColor: [255, 255, 255, 230],
          getSize: 12,
          getPixelOffset: [0, -18],
          fontFamily: "monospace",
          fontWeight: 700,
          outlineWidth: 3,
          outlineColor: [0, 0, 0, 200],
          billboard: true,
        }),
      ],
    });
  }, [waypoints, routeCoords]);

  return null;
}

export function DefenseTroopNavCard() {
  const { resolvedTheme } = useTheme();
  const [waypoints, setWaypoints] = useState<TroopWaypoint[]>([]);

  const routeCoords = useMemo(() => buildRoute(waypoints), [waypoints]);
  const elevationProfile = useMemo(
    () => generateElevationProfile(routeCoords),
    [routeCoords],
  );
  const routeStats = useMemo<RouteStats | null>(() => {
    if (routeCoords.length < 2) return null;
    let total = 0;
    for (let i = 1; i < routeCoords.length; i++) {
      total += haversineDistance(routeCoords[i - 1]!, routeCoords[i]!);
    }
    return computeStats(total, elevationProfile);
  }, [routeCoords, elevationProfile]);

  const addWaypoint = useCallback((position: [number, number]) => {
    setWaypoints((prev) => {
      if (prev.length >= MAX_WAYPOINTS) return prev;
      return [
        ...prev,
        {
          id: `wp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          position,
          label: `WP-${prev.length + 1}`,
        },
      ];
    });
  }, []);

  const removeWaypoint = (id: string) => {
    setWaypoints((prev) =>
      prev
        .filter((wp) => wp.id !== id)
        .map((wp, i) => ({ ...wp, label: `WP-${i + 1}` })),
    );
  };

  const clearAll = () => setWaypoints([]);

  const sparklinePath = useMemo(() => {
    const pts = elevationProfile;
    if (pts.length < 2) return "";
    const maxDist = pts[pts.length - 1]!.distance;
    const alts = pts.map((p) => p.altitude);
    const minAlt = Math.min(...alts);
    const maxAlt = Math.max(...alts);
    const range = maxAlt - minAlt || 1;
    const w = 220 - 8;
    const h = 80 - 8;
    return pts
      .map((p, i) => {
        const x = 4 + (maxDist > 0 ? (p.distance / maxDist) * w : 0);
        const y = 4 + h - ((p.altitude - minAlt) / range) * h;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [elevationProfile]);

  return (
    <div className="relative h-full w-full min-h-[300px]">
      <Map
        center={[77.6, 34.15]}
        zoom={12}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
      >
        <TroopOverlay
          waypoints={waypoints}
          routeCoords={routeCoords}
          onMapClick={addWaypoint}
        />
      </Map>

      <MapPanel className="absolute top-3 left-3 z-10 w-64">
        <MapPanelHeader>
          <MapPanelTitle>Troop Nav</MapPanelTitle>
        </MapPanelHeader>
        <MapPanelContent className="space-y-3">
          <div>
            <h3 className="text-xs font-semibold">Waypoints</h3>
            <p className="text-[10px] text-muted-foreground">
              Click on the map to add waypoints (max {MAX_WAYPOINTS})
            </p>
          </div>

          {waypoints.length > 0 ? (
            <div className="space-y-1">
              {waypoints.map((wp) => (
                <div
                  key={wp.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1 text-[11px] hover:bg-accent"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                    {wp.label.split("-")[1]}
                  </span>
                  <span className="flex-1 truncate text-muted-foreground">
                    {wp.position[1].toFixed(4)}°N, {wp.position[0].toFixed(4)}°E
                  </span>
                  <button
                    onClick={() => removeWaypoint(wp.id)}
                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                    aria-label="Remove waypoint"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md bg-muted/50 px-3 py-3 text-center">
              <p className="text-[11px] text-muted-foreground">
                No waypoints yet
              </p>
            </div>
          )}

          {routeStats && (
            <div className="space-y-2">
              <div className="border-t border-border" />
              <h3 className="text-xs font-semibold">Route Stats</h3>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="rounded-md bg-muted/50 px-2 py-1.5">
                  <div className="text-[9px] text-muted-foreground">
                    Distance
                  </div>
                  <div className="text-xs font-semibold">
                    {routeStats.distanceKm.toFixed(1)} km
                  </div>
                </div>
                <div className="rounded-md bg-muted/50 px-2 py-1.5">
                  <div className="text-[9px] text-muted-foreground">
                    Est. Time
                  </div>
                  <div className="text-xs font-semibold">
                    {routeStats.timeHours.toFixed(1)} hrs
                  </div>
                </div>
                <div className="rounded-md bg-muted/50 px-2 py-1.5">
                  <div className="text-[9px] text-muted-foreground">
                    Elev. Gain
                  </div>
                  <div className="text-xs font-semibold text-green-500">
                    +{routeStats.elevationGain} m
                  </div>
                </div>
                <div className="rounded-md bg-muted/50 px-2 py-1.5">
                  <div className="text-[9px] text-muted-foreground">
                    Elev. Loss
                  </div>
                  <div className="text-xs font-semibold text-destructive">
                    -{routeStats.elevationLoss} m
                  </div>
                </div>
              </div>
            </div>
          )}

          {elevationProfile.length > 1 && (
            <div className="space-y-1.5">
              <div className="border-t border-border" />
              <h3 className="text-xs font-semibold">Elevation Profile</h3>
              <div className="rounded-md bg-muted/30 p-2">
                <svg
                  width={220}
                  height={80}
                  viewBox="0 0 220 80"
                  preserveAspectRatio="none"
                  className="w-full"
                >
                  <path
                    d={sparklinePath}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    className="text-green-500"
                  />
                </svg>
              </div>
            </div>
          )}

          {waypoints.length > 0 && (
            <button
              onClick={clearAll}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border/50 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
            >
              Clear Route
            </button>
          )}
        </MapPanelContent>
      </MapPanel>
    </div>
  );
}
