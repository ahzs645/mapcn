"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Map, useMap } from "@/registry/map";
import {
  MapPanel,
  MapPanelHeader,
  MapPanelTitle,
  MapPanelContent,
} from "@/registry/map-ui";
import {
  Play,
  Pause,
  MapPin,
  Camera,
  Truck,
  ShieldAlert,
} from "lucide-react";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { PathLayer, PolygonLayer, ScatterplotLayer } from "@deck.gl/layers";
import { TripsLayer } from "@deck.gl/geo-layers";
import type { Layer } from "@deck.gl/core";
import type { Map as MapLibreMap, IControl } from "maplibre-gl";

type BorderLayerName = "cameras" | "patrols" | "zones" | "border";
type AlertLevel = "high" | "medium" | "low";
type RGB = [number, number, number];

type BorderCamera = {
  id: string;
  label: string;
  position: [number, number];
  bearing: number;
  status: "online" | "alert";
  coverageCone: [number, number][];
};

type BorderPatrolRoute = {
  id: string;
  name: string;
  status: string;
  color: RGB;
  path: [number, number][];
  timestamps: number[];
};

type BorderPatrolPosition = {
  lng: number;
  lat: number;
  bearing: number;
  routeId: string;
};

type IntrusionZone = {
  id: string;
  name: string;
  alertLevel: AlertLevel;
  polygon: [number, number][];
};

type CameraDatum = {
  lng: number;
  lat: number;
  cameraId: string;
  status: "online" | "alert";
};

type PatrolVehicleDatum = {
  lng: number;
  lat: number;
  routeId: string;
};

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const ARC_POINTS = 300;
const BASE_LOOP_SECONDS = 80;

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const p1 = lat1 * DEG_TO_RAD;
  const p2 = lat2 * DEG_TO_RAD;
  const dl = (lon2 - lon1) * DEG_TO_RAD;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) * RAD_TO_DEG + 360) % 360;
}

function buildCoverageCone(
  center: [number, number],
  bearingDeg: number,
  rangeKm: number,
  arcDeg: number,
): [number, number][] {
  const [cLng, cLat] = center;
  const latDeg = rangeKm / 111.32;
  const lngDeg = rangeKm / (111.32 * Math.cos(cLat * DEG_TO_RAD));
  const halfArc = arcDeg / 2;
  const steps = 12;
  const cone: [number, number][] = [[cLng, cLat]];
  for (let i = 0; i <= steps; i++) {
    const angle = bearingDeg - halfArc + (arcDeg * i) / steps;
    const rad = (angle - 90) * DEG_TO_RAD;
    cone.push([cLng + lngDeg * Math.cos(rad), cLat + latDeg * Math.sin(rad)]);
  }
  cone.push([cLng, cLat]);
  return cone;
}

const LAC_BORDER_COORDS: [number, number][] = [
  [76.85, 33.55], [76.88, 33.57], [76.91, 33.59], [76.93, 33.61], [76.95, 33.62],
  [76.98, 33.64], [77.0, 33.67], [77.03, 33.69], [77.05, 33.7], [77.07, 33.72],
  [77.09, 33.74], [77.12, 33.76], [77.15, 33.78], [77.17, 33.81], [77.18, 33.84],
  [77.2, 33.86], [77.22, 33.88], [77.24, 33.9], [77.27, 33.92], [77.29, 33.94],
  [77.3, 33.95], [77.32, 33.97], [77.34, 33.99], [77.36, 34.01], [77.38, 34.02],
  [77.4, 34.04], [77.42, 34.06], [77.44, 34.08], [77.45, 34.1], [77.47, 34.12],
  [77.48, 34.14], [77.49, 34.16], [77.5, 34.18], [77.51, 34.19], [77.53, 34.2],
  [77.54, 34.21], [77.55, 34.22], [77.57, 34.24], [77.59, 34.25], [77.61, 34.27],
  [77.62, 34.28], [77.64, 34.3], [77.66, 34.31], [77.68, 34.33], [77.7, 34.35],
  [77.72, 34.36], [77.74, 34.37], [77.76, 34.39], [77.78, 34.4], [77.81, 34.41],
  [77.84, 34.43], [77.86, 34.44], [77.88, 34.45], [77.91, 34.46], [77.94, 34.48],
  [77.96, 34.49], [77.98, 34.5], [78.01, 34.51], [78.04, 34.53], [78.06, 34.54],
  [78.08, 34.55], [78.11, 34.56], [78.14, 34.58], [78.16, 34.59], [78.18, 34.6],
  [78.21, 34.61], [78.24, 34.63], [78.26, 34.64], [78.28, 34.65], [78.31, 34.67],
  [78.34, 34.69], [78.36, 34.71], [78.38, 34.72], [78.41, 34.74], [78.44, 34.76],
  [78.48, 34.78],
];

function buildCameras(): BorderCamera[] {
  const seeds: { pos: [number, number]; bearing: number; label: string }[] = [
    { pos: [76.9, 33.58], bearing: 45, label: "CAM-01" },
    { pos: [77.1, 33.74], bearing: 60, label: "CAM-02" },
    { pos: [77.28, 33.93], bearing: 40, label: "CAM-03" },
    { pos: [77.48, 34.14], bearing: 55, label: "CAM-04" },
    { pos: [77.65, 34.31], bearing: 50, label: "CAM-05" },
    { pos: [77.85, 34.43], bearing: 35, label: "CAM-06" },
    { pos: [78.1, 34.56], bearing: 65, label: "CAM-07" },
    { pos: [78.35, 34.69], bearing: 45, label: "CAM-08" },
  ];
  return seeds.map((c, i) => ({
    id: `camera-${i}`,
    label: c.label,
    position: c.pos,
    bearing: c.bearing,
    status: i === 5 ? "alert" : "online",
    coverageCone: buildCoverageCone(c.pos, c.bearing, 5, 120),
  }));
}

function buildPatrolRoutes(): BorderPatrolRoute[] {
  const offset = (coords: [number, number][], lo: number, la: number): [number, number][] =>
    coords.map(([lng, lat]) => [lng + lo, lat + la]);
  const r1 = offset(LAC_BORDER_COORDS, -0.06, -0.04);
  const r2 = offset(LAC_BORDER_COORDS.slice(4, 16), -0.1, -0.06);
  const spline = (p0: number, p1: number, p2: number, p3: number, t: number): number =>
    0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
  const interp = (path: [number, number][], n: number): [number, number][] => {
    if (path.length < 2) return path;
    const segs = path.length - 1;
    const out: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1)) * segs;
      const seg = Math.min(Math.floor(t), segs - 1);
      const frac = t - seg;
      const i0 = Math.max(seg - 1, 0);
      const i1 = seg;
      const i2 = Math.min(seg + 1, segs);
      const i3 = Math.min(seg + 2, segs);
      out.push([
        spline(path[i0]![0], path[i1]![0], path[i2]![0], path[i3]![0], frac),
        spline(path[i0]![1], path[i1]![1], path[i2]![1], path[i3]![1], frac),
      ]);
    }
    return out;
  };
  const a1 = interp(r1, ARC_POINTS);
  const a2 = interp(r2, ARC_POINTS);
  return [
    { id: "patrol-alpha", name: "Patrol Alpha", status: "patrolling", color: [0, 200, 255], path: a1, timestamps: a1.map((_, i) => i) },
    { id: "patrol-bravo", name: "Patrol Bravo", status: "patrolling", color: [255, 180, 0], path: a2, timestamps: a2.map((_, i) => i) },
  ];
}

const INTRUSION_ZONES: IntrusionZone[] = [
  {
    id: "zone-depsang",
    name: "Depsang Plains",
    alertLevel: "high",
    polygon: [[77.4, 34.08], [77.55, 34.08], [77.55, 34.2], [77.4, 34.2], [77.4, 34.08]],
  },
  {
    id: "zone-galwan",
    name: "Galwan Valley",
    alertLevel: "high",
    polygon: [[77.6, 34.26], [77.75, 34.26], [77.75, 34.38], [77.6, 34.38], [77.6, 34.26]],
  },
  {
    id: "zone-pangong",
    name: "Pangong Tso",
    alertLevel: "medium",
    polygon: [[78.0, 34.48], [78.2, 34.48], [78.2, 34.58], [78.0, 34.58], [78.0, 34.48]],
  },
];

const CAMERAS = buildCameras();
const PATROLS = buildPatrolRoutes();

function BorderSurveillanceOverlay({
  borderLine,
  cameras,
  patrols,
  positions,
  intrusionZones,
  visibleLayers,
  loopedTime,
}: {
  borderLine: [number, number][];
  cameras: BorderCamera[];
  patrols: BorderPatrolRoute[];
  positions: Record<string, BorderPatrolPosition>;
  intrusionZones: IntrusionZone[];
  visibleLayers: Set<BorderLayerName>;
  loopedTime: number;
}) {
  const { map, isLoaded } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;
    const addOverlay = () => {
      overlay = new MapboxOverlay({ layers: [] });
      overlayRef.current = overlay;
      (map as MapLibreMap).addControl(overlay as unknown as IControl);
    };
    if (map.isStyleLoaded()) addOverlay();
    else map.once("load", addOverlay);
    return () => {
      map.off("load", addOverlay);
      if (overlay) {
        try {
          (map as MapLibreMap).removeControl(overlay as unknown as IControl);
        } catch {}
      }
      overlayRef.current = null;
    };
  }, [map, isLoaded]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const layers: Layer[] = [];

    if (visibleLayers.has("border")) {
      layers.push(
        new PathLayer<{ path: [number, number][] }>({
          id: "border-lac-line",
          data: [{ path: borderLine }],
          getPath: (d) => d.path,
          getColor: [0, 200, 100, 200],
          widthMinPixels: 3,
        }),
      );
    }

    if (visibleLayers.has("cameras")) {
      layers.push(
        new PolygonLayer<BorderCamera>({
          id: "border-camera-cones",
          data: cameras,
          getPolygon: (d) => d.coverageCone,
          getFillColor: [0, 150, 255, 40],
          getLineColor: [0, 150, 255, 120],
          lineWidthMinPixels: 1,
          pickable: false,
        }),
      );
      const camData: CameraDatum[] = cameras.map((c) => ({
        lng: c.position[0],
        lat: c.position[1],
        cameraId: c.id,
        status: c.status,
      }));
      layers.push(
        new ScatterplotLayer<CameraDatum>({
          id: "border-camera-dots",
          data: camData,
          getPosition: (d) => [d.lng, d.lat],
          getFillColor: (d) => (d.status === "alert" ? [255, 60, 60, 220] : [0, 180, 255, 220]),
          getRadius: 8,
          radiusUnits: "pixels",
          stroked: true,
          getLineColor: [255, 255, 255, 180],
          lineWidthMinPixels: 2,
        }),
      );
    }

    if (visibleLayers.has("patrols")) {
      for (const route of patrols) {
        layers.push(
          new TripsLayer<BorderPatrolRoute>({
            id: `border-trail-${route.id}`,
            data: [route],
            getPath: (d) => d.path,
            getTimestamps: (d) => d.timestamps,
            getColor: route.color,
            currentTime: loopedTime,
            trailLength: 50,
            fadeTrail: true,
            widthMinPixels: 3,
            capRounded: true,
            jointRounded: true,
            opacity: 0.7,
          }),
        );
      }
      const vehicles: PatrolVehicleDatum[] = patrols
        .map((r) => {
          const pos = positions[r.id];
          if (!pos) return null;
          return { lng: pos.lng, lat: pos.lat, routeId: r.id };
        })
        .filter((d): d is PatrolVehicleDatum => d !== null);
      layers.push(
        new ScatterplotLayer<PatrolVehicleDatum>({
          id: "border-patrol-vehicles",
          data: vehicles,
          getPosition: (d) => [d.lng, d.lat],
          getFillColor: [255, 220, 0, 230],
          getRadius: 10,
          radiusUnits: "pixels",
          stroked: true,
          getLineColor: [255, 255, 255, 200],
          lineWidthMinPixels: 2,
        }),
      );
    }

    if (visibleLayers.has("zones")) {
      layers.push(
        new PolygonLayer<IntrusionZone>({
          id: "border-intrusion-zones",
          data: intrusionZones,
          getPolygon: (d) => d.polygon,
          getFillColor: (d) => (d.alertLevel === "high" ? [255, 40, 40, 60] : [255, 160, 0, 50]),
          getLineColor: (d) => (d.alertLevel === "high" ? [255, 40, 40, 180] : [255, 160, 0, 160]),
          lineWidthMinPixels: 2,
          pickable: false,
        }),
      );
    }

    overlay.setProps({ layers });
  }, [borderLine, cameras, patrols, positions, intrusionZones, visibleLayers, loopedTime]);

  return null;
}

const LAYER_ITEMS: { key: BorderLayerName; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "border", label: "LAC Border", icon: MapPin },
  { key: "cameras", label: "Cameras", icon: Camera },
  { key: "patrols", label: "Patrols", icon: Truck },
  { key: "zones", label: "Alert Zones", icon: ShieldAlert },
];

export function DefenseBorderSurveillanceCard() {
  const [visibleLayers, setVisibleLayers] = useState<Set<BorderLayerName>>(
    () => new Set(["cameras", "patrols", "zones", "border"]),
  );
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);

  const playingRef = useRef(isPlaying);
  const speedRef = useRef(speed);
  useEffect(() => {
    playingRef.current = isPlaying;
    speedRef.current = speed;
  });

  useEffect(() => {
    let frame = 0;
    let last: number | null = null;
    const tick = (ts: number) => {
      if (last === null) last = ts;
      const delta = (ts - last) / 1000;
      last = ts;
      if (playingRef.current) {
        const inc = (delta * speedRef.current * ARC_POINTS) / BASE_LOOP_SECONDS;
        setCurrentTime((t) => t + inc);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const positions = useMemo<Record<string, BorderPatrolPosition>>(() => {
    const out: Record<string, BorderPatrolPosition> = {};
    for (const route of PATROLS) {
      if (route.path.length < 2) continue;
      const maxIdx = route.path.length - 1;
      const t = currentTime % maxIdx;
      const idx = Math.floor(t);
      const frac = t - idx;
      const pt = route.path[idx]!;
      const next = route.path[(idx + 1) % route.path.length]!;
      const lng = pt[0] + (next[0] - pt[0]) * frac;
      const lat = pt[1] + (next[1] - pt[1]) * frac;
      const bearingIdx = Math.min(idx + 3, maxIdx);
      const bearingPt = route.path[bearingIdx]!;
      const bearing = calculateBearing(lat, lng, bearingPt[1], bearingPt[0]);
      out[route.id] = { lng, lat, bearing, routeId: route.id };
    }
    return out;
  }, [currentTime]);

  const loopedTime = currentTime % (ARC_POINTS - 1);

  const toggleLayer = (layer: BorderLayerName) => {
    setVisibleLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  };

  const activeAlerts = INTRUSION_ZONES.filter((z) => z.alertLevel === "high").length;
  const speedOptions = [0.5, 1, 2, 4];

  return (
    <div className="relative h-full w-full min-h-[300px]">
      <Map center={[77.5, 34.2]} zoom={10}>
        <BorderSurveillanceOverlay
          borderLine={LAC_BORDER_COORDS}
          cameras={CAMERAS}
          patrols={PATROLS}
          positions={positions}
          intrusionZones={INTRUSION_ZONES}
          visibleLayers={visibleLayers}
          loopedTime={loopedTime}
        />
      </Map>

      {activeAlerts > 0 && (
        <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive backdrop-blur-sm">
            <ShieldAlert className="size-4 shrink-0" />
            <span>{activeAlerts} high-alert intrusion zones active</span>
          </div>
        </div>
      )}

      <MapPanel className="absolute top-3 right-3 z-10 w-[280px]">
        <MapPanelHeader>
          <MapPanelTitle>Border Surveillance</MapPanelTitle>
        </MapPanelHeader>
        <MapPanelContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Layers</h3>
            <div className="space-y-1">
              {LAYER_ITEMS.map((item) => {
                const Icon = item.icon;
                const on = visibleLayers.has(item.key);
                return (
                  <button
                    key={item.key}
                    onClick={() => toggleLayer(item.key)}
                    className={
                      "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs transition-colors " +
                      (on
                        ? "bg-primary/15 text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground")
                    }
                  >
                    <Icon className="size-3.5 shrink-0" />
                    <span className="font-medium">{item.label}</span>
                    {item.key === "cameras" && (
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {CAMERAS.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Patrol Animation</h3>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setIsPlaying((p) => !p)}
                title={isPlaying ? "Pause" : "Play"}
                className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground">Speed</h4>
              <div className="flex gap-1">
                {speedOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={
                      "flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors " +
                      (speed === s
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent")
                    }
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Zone Alerts</h3>
            <div className="space-y-1">
              {INTRUSION_ZONES.map((zone) => (
                <div key={zone.id} className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs">
                  <span
                    className={
                      "inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase " +
                      (zone.alertLevel === "high"
                        ? "bg-destructive/15 text-destructive"
                        : "bg-orange-500/15 text-orange-600")
                    }
                  >
                    {zone.alertLevel}
                  </span>
                  <span className="font-medium text-foreground">{zone.name}</span>
                </div>
              ))}
            </div>
          </div>
        </MapPanelContent>
      </MapPanel>
    </div>
  );
}
