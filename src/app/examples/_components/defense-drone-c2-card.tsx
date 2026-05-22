"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Pause, Play, RotateCcw, Mountain, Gauge, Battery, Compass } from "lucide-react";
import { Map, useMap } from "@/registry/map";
import { MapPanel, MapPanelHeader, MapPanelTitle, MapPanelContent } from "@/registry/map-ui";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { TripsLayer } from "@deck.gl/geo-layers";
import { ScatterplotLayer, TextLayer } from "@deck.gl/layers";

type UnitType = "drone" | "ugv";

interface C2Unit {
  id: string;
  callsign: string;
  type: UnitType;
  status: "active";
  color: [number, number, number];
}

interface C2PatrolPath {
  unitId: string;
  path: [number, number][];
  timestamps: number[];
}

interface C2UnitPosition {
  lng: number;
  lat: number;
  bearing: number;
}

interface C2UnitTelemetry {
  altitude: number;
  speed: number;
  battery: number;
  heading: number;
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const ARC_POINTS = 400;
const BASE_LOOP_SECONDS = 60;

function toRad(d: number) {
  return d * DEG_TO_RAD;
}

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const p1 = toRad(lat1);
  const p2 = toRad(lat2);
  const dl = toRad(lon2 - lon1);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) * RAD_TO_DEG + 360) % 360;
}

function generatePatrolLoop(center: [number, number], radiusKm: number, numWaypoints: number): [number, number][] {
  const [cLng, cLat] = center;
  const points: [number, number][] = [];
  const latDeg = radiusKm / 111.32;
  const lngDeg = radiusKm / (111.32 * Math.cos(toRad(cLat)));
  for (let i = 0; i <= numWaypoints; i++) {
    const angle = (i / numWaypoints) * 2 * Math.PI;
    const r = 1 + 0.15 * Math.sin(angle * 3) + 0.1 * Math.cos(angle * 5);
    points.push([cLng + lngDeg * r * Math.cos(angle), cLat + latDeg * r * Math.sin(angle)]);
  }
  points.push([...points[0]] as [number, number]);
  return points;
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
}

function interpolateLoop(waypoints: [number, number][], numPoints: number): [number, number][] {
  if (waypoints.length < 2) return waypoints;
  const n = waypoints.length - 1;
  const result: [number, number][] = [];
  for (let i = 0; i < numPoints; i++) {
    const t = (i / numPoints) * n;
    const seg = Math.min(Math.floor(t), n - 1);
    const frac = t - seg;
    const i0 = (seg - 1 + waypoints.length) % waypoints.length;
    const i1 = seg;
    const i2 = (seg + 1) % waypoints.length;
    const i3 = (seg + 2) % waypoints.length;
    result.push([
      catmullRom(waypoints[i0][0], waypoints[i1][0], waypoints[i2][0], waypoints[i3][0], frac),
      catmullRom(waypoints[i0][1], waypoints[i1][1], waypoints[i2][1], waypoints[i3][1], frac),
    ]);
  }
  return result;
}

const UNITS: C2Unit[] = [
  { id: "alpha", callsign: "ALPHA", type: "drone", status: "active", color: [0, 200, 255] },
  { id: "bravo", callsign: "BRAVO", type: "drone", status: "active", color: [255, 140, 0] },
  { id: "charlie", callsign: "CHARLIE", type: "drone", status: "active", color: [0, 255, 130] },
  { id: "delta", callsign: "DELTA", type: "drone", status: "active", color: [255, 60, 60] },
  { id: "echo", callsign: "ECHO", type: "ugv", status: "active", color: [180, 130, 255] },
  { id: "foxtrot", callsign: "FOXTROT", type: "ugv", status: "active", color: [255, 200, 0] },
];

const PATROL_CENTERS: Record<string, [number, number]> = {
  alpha: [70.4, 26.9],
  bravo: [70.6, 26.7],
  charlie: [70.3, 26.6],
  delta: [70.7, 26.9],
  echo: [70.5, 26.8],
  foxtrot: [70.45, 26.75],
};

function buildPatrolPaths(): C2PatrolPath[] {
  return UNITS.map((unit) => {
    const center = PATROL_CENTERS[unit.id];
    const radiusKm = unit.type === "drone" ? 12 : 4;
    const numWaypoints = unit.type === "drone" ? 10 : 8;
    const rawWaypoints = generatePatrolLoop(center, radiusKm, numWaypoints);
    const arcPath = interpolateLoop(rawWaypoints, ARC_POINTS);
    const timestamps = arcPath.map((_, i) => i);
    return { unitId: unit.id, path: arcPath, timestamps };
  });
}

interface DroneLayersProps {
  patrolPaths: C2PatrolPath[];
  positions: Record<string, C2UnitPosition>;
  waypoints: { unitId: string; position: [number, number]; label: string }[];
  loopedTime: number;
  selectedUnitId: string | null;
}

function DroneLayers({ patrolPaths, positions, waypoints, loopedTime, selectedUnitId }: DroneLayersProps) {
  const { map, isLoaded } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;
    let stopped = false;

    const add = () => {
      if (stopped) return;
      overlay = new MapboxOverlay({ layers: [] });
      overlayRef.current = overlay;
      map.addControl(overlay as unknown as maplibregl.IControl);
    };
    if (map.isStyleLoaded()) add();
    else map.once("load", add);

    return () => {
      stopped = true;
      map.off("load", add);
      if (overlay) {
        try {
          map.removeControl(overlay as unknown as maplibregl.IControl);
        } catch {}
      }
      overlayRef.current = null;
    };
  }, [map, isLoaded]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const trailLayers = patrolPaths.map((patrol) => {
      const unit = UNITS.find((u) => u.id === patrol.unitId);
      return new TripsLayer({
        id: `c2-trail-${patrol.unitId}`,
        data: [patrol],
        getPath: (d: C2PatrolPath) => d.path,
        getTimestamps: (d: C2PatrolPath) => d.timestamps,
        getColor: unit?.color ?? [255, 255, 255],
        currentTime: loopedTime,
        trailLength: 60,
        fadeTrail: true,
        widthMinPixels: 3,
        capRounded: true,
        jointRounded: true,
        opacity: 0.7,
      });
    });

    const positionData = UNITS.map((u) => {
      const pos = positions[u.id];
      if (!pos) return null;
      return { lng: pos.lng, lat: pos.lat, unitId: u.id, selected: u.id === selectedUnitId };
    }).filter((d): d is { lng: number; lat: number; unitId: string; selected: boolean } => d !== null);

    const posLayer = new ScatterplotLayer({
      id: "c2-positions",
      data: positionData,
      getPosition: (d) => [d.lng, d.lat] as [number, number],
      getFillColor: (d) => {
        const c = UNITS.find((u) => u.id === d.unitId)?.color ?? [255, 255, 255];
        return [c[0], c[1], c[2], 220];
      },
      getRadius: (d) => (d.selected ? 12 : 7),
      radiusUnits: "pixels",
      stroked: true,
      getLineColor: [255, 255, 255, 180],
      lineWidthMinPixels: 2,
      pickable: true,
    });

    const labelLayer = new TextLayer({
      id: "c2-labels",
      data: positionData.map((d) => ({
        position: [d.lng, d.lat] as [number, number],
        text: UNITS.find((u) => u.id === d.unitId)?.callsign ?? "",
      })),
      getPosition: (d) => d.position,
      getText: (d) => d.text,
      getColor: [255, 255, 255, 230],
      getSize: 12,
      getPixelOffset: [0, -20],
      fontFamily: "monospace",
      fontWeight: 700,
      outlineWidth: 3,
      outlineColor: [0, 0, 0, 200],
      billboard: true,
    });

    const waypointLayer = new ScatterplotLayer({
      id: "c2-waypoints",
      data: waypoints,
      getPosition: (d: { position: [number, number] }) => d.position,
      getFillColor: [255, 255, 255, 100],
      getRadius: 4,
      radiusUnits: "pixels",
    });

    try {
      overlay.setProps({ layers: [...trailLayers, waypointLayer, posLayer, labelLayer] });
    } catch {}
  }, [patrolPaths, positions, waypoints, loopedTime, selectedUnitId]);

  return null;
}

function FollowSelected({ pos }: { pos: C2UnitPosition | null }) {
  const { map, isLoaded } = useMap();
  useEffect(() => {
    if (!map || !isLoaded || !pos) return;
    map.jumpTo({ center: [pos.lng, pos.lat] });
  }, [map, isLoaded, pos]);
  return null;
}

function DroneC2Inner() {
  const patrolPaths = useMemo(() => buildPatrolPaths(), []);
  const waypoints = useMemo(
    () => UNITS.map((u, i) => ({ unitId: u.id, position: PATROL_CENTERS[u.id], label: `WP-${i + 1}` })),
    [],
  );

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>("alpha");

  const playingRef = useRef(isPlaying);
  const speedRef = useRef(speed);
  useEffect(() => {
    playingRef.current = isPlaying;
    speedRef.current = speed;
  });

  useEffect(() => {
    let last = 0;
    let frame = 0;
    const tick = (ts: number) => {
      if (!last) last = ts;
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

  const positions = useMemo<Record<string, C2UnitPosition>>(() => {
    const result: Record<string, C2UnitPosition> = {};
    for (const patrol of patrolPaths) {
      if (patrol.path.length < 2) continue;
      const maxIdx = patrol.path.length - 1;
      const t = currentTime % maxIdx;
      const idx = Math.floor(t);
      const frac = t - idx;
      const pt = patrol.path[idx];
      const next = patrol.path[(idx + 1) % patrol.path.length];
      const lng = pt[0] + (next[0] - pt[0]) * frac;
      const lat = pt[1] + (next[1] - pt[1]) * frac;
      const bearingIdx = Math.min(idx + 3, maxIdx);
      const bp = patrol.path[bearingIdx];
      const bearing = calculateBearing(lat, lng, bp[1], bp[0]);
      result[patrol.unitId] = { lng, lat, bearing };
    }
    return result;
  }, [currentTime, patrolPaths]);

  const telemetry = useMemo<Record<string, C2UnitTelemetry>>(() => {
    const result: Record<string, C2UnitTelemetry> = {};
    const t = currentTime;
    for (const unit of UNITS) {
      const pos = positions[unit.id];
      const baseAlt = unit.type === "drone" ? 120 : 0;
      const altVariation = unit.type === "drone" ? 10 * Math.sin(t * 0.05 + unit.id.charCodeAt(0)) : 0;
      const baseSpeed = unit.type === "drone" ? 85 : 35;
      const speedVariation = 5 * Math.sin(t * 0.08 + unit.id.charCodeAt(1));
      const batteryDrain = Math.max(15, 100 - t * 0.02 * (unit.type === "drone" ? 1 : 0.5));
      result[unit.id] = {
        altitude: Math.round(baseAlt + altVariation),
        speed: Math.round(baseSpeed + speedVariation),
        battery: Math.round(batteryDrain),
        heading: Math.round(pos?.bearing ?? 0),
      };
    }
    return result;
  }, [currentTime, positions]);

  const loopedTime = currentTime % (ARC_POINTS - 1);
  const selectedUnit = UNITS.find((u) => u.id === selectedUnitId) ?? null;
  const selectedPos = selectedUnitId ? positions[selectedUnitId] ?? null : null;
  const selectedTelemetry = selectedUnitId ? telemetry[selectedUnitId] ?? null : null;

  const speedOptions = [0.5, 1, 2, 4];

  return (
    <>
      <DroneLayers
        patrolPaths={patrolPaths}
        positions={positions}
        waypoints={waypoints}
        loopedTime={loopedTime}
        selectedUnitId={selectedUnitId}
      />
      <FollowSelected pos={selectedPos} />

      {selectedUnit && selectedTelemetry && (
        <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/90 px-3 py-2 text-xs backdrop-blur-sm">
            <div className="flex items-center gap-1.5 font-mono font-bold">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: `rgb(${selectedUnit.color.join(",")})` }}
              />
              {selectedUnit.callsign}
            </div>
            <div className="h-3 w-px bg-border" />
            {selectedUnit.type === "drone" && (
              <>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Mountain className="size-3.5" />
                  <span>{selectedTelemetry.altitude}m</span>
                </div>
                <div className="h-3 w-px bg-border" />
              </>
            )}
            <div className="flex items-center gap-1 text-muted-foreground">
              <Gauge className="size-3.5" />
              <span>{selectedTelemetry.speed} km/h</span>
            </div>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-1 text-muted-foreground">
              <Battery className="size-3.5" />
              <span>{selectedTelemetry.battery}%</span>
            </div>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-1 text-muted-foreground">
              <Compass className="size-3.5" />
              <span>{selectedTelemetry.heading}&deg;</span>
            </div>
            <div className="h-3 w-px bg-border" />
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
              {selectedUnit.status}
            </span>
          </div>
        </div>
      )}

      <MapPanel className="absolute top-3 right-3 w-[230px]">
        <MapPanelHeader>
          <MapPanelTitle>Drone C2</MapPanelTitle>
        </MapPanelHeader>
        <MapPanelContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Units</h3>
            <div className="space-y-1">
              {UNITS.map((unit) => (
                <button
                  key={unit.id}
                  onClick={() => setSelectedUnitId((cur) => (cur === unit.id ? null : unit.id))}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs transition-colors ${
                    selectedUnitId === unit.id
                      ? "bg-primary/15 text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <span className="size-2.5 shrink-0 rounded-full bg-emerald-500" />
                  <span
                    className="size-2 shrink-0 rounded-sm"
                    style={{ backgroundColor: `rgb(${unit.color.join(",")})` }}
                  />
                  <span className="font-mono font-bold">{unit.callsign}</span>
                  <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase">
                    {unit.type}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Playback</h3>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentTime(0);
                }}
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <RotateCcw className="size-4" />
              </button>
              <button
                onClick={() => setIsPlaying((p) => !p)}
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
                    className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                      speed === s
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </MapPanelContent>
      </MapPanel>
    </>
  );
}

export function DefenseDroneC2Card() {
  const { resolvedTheme } = useTheme();
  return (
    <div className="relative h-full w-full min-h-[300px]">
      <Map center={[70.5, 26.8]} zoom={11} theme={resolvedTheme === "dark" ? "dark" : "light"}>
        <DroneC2Inner />
      </Map>
    </div>
  );
}
