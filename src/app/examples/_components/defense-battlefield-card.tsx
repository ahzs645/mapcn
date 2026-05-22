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
  RotateCcw,
  Target,
  Timer,
  Users,
  Footprints,
  Shield,
  ScanEye,
  Radar,
} from "lucide-react";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import { TripsLayer } from "@deck.gl/geo-layers";
import type { Map as MapLibreMap, IControl } from "maplibre-gl";

type MilitaryUnitType = "infantry" | "armor" | "patrol" | "recon";
type MissionPhase = "assembly" | "advance" | "engagement" | "consolidation";
type RGB = [number, number, number];

type BattlefieldUnit = {
  id: string;
  callsign: string;
  type: MilitaryUnitType;
  color: RGB;
  strength: number;
};

type BattlefieldPath = {
  unitId: string;
  path: [number, number][];
  timestamps: number[];
};

type BattlefieldPosition = {
  lng: number;
  lat: number;
  bearing: number;
  unitId: string;
};

type MissionPhaseInfo = {
  phase: MissionPhase;
  label: string;
  timeRange: [number, number];
  description: string;
};

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = lat1 * DEG_TO_RAD;
  const phi2 = lat2 * DEG_TO_RAD;
  const dLambda = (lon2 - lon1) * DEG_TO_RAD;
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  return (Math.atan2(y, x) * RAD_TO_DEG + 360) % 360;
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
}

function interpolatePath(waypoints: [number, number][], numPoints: number): [number, number][] {
  if (waypoints.length < 2) return waypoints;
  const n = waypoints.length - 1;
  const result: [number, number][] = [];
  for (let i = 0; i < numPoints; i++) {
    const t = (i / (numPoints - 1)) * n;
    const seg = Math.min(Math.floor(t), n - 1);
    const frac = t - seg;
    const i0 = Math.max(seg - 1, 0);
    const i1 = seg;
    const i2 = Math.min(seg + 1, n);
    const i3 = Math.min(seg + 2, n);
    result.push([
      catmullRom(waypoints[i0]![0], waypoints[i1]![0], waypoints[i2]![0], waypoints[i3]![0], frac),
      catmullRom(waypoints[i0]![1], waypoints[i1]![1], waypoints[i2]![1], waypoints[i3]![1], frac),
    ]);
  }
  return result;
}

const UNITS: BattlefieldUnit[] = [
  { id: "alpha", callsign: "Alpha", type: "infantry", color: [30, 144, 255], strength: 120 },
  { id: "bravo", callsign: "Bravo", type: "infantry", color: [65, 170, 255], strength: 95 },
  { id: "charlie", callsign: "Charlie", type: "armor", color: [255, 165, 0], strength: 14 },
  { id: "delta", callsign: "Delta", type: "armor", color: [255, 200, 60], strength: 12 },
  { id: "echo", callsign: "Echo", type: "patrol", color: [0, 200, 100], strength: 30 },
  { id: "foxtrot", callsign: "Foxtrot", type: "recon", color: [180, 100, 255], strength: 8 },
];

const MISSION_PHASES: MissionPhaseInfo[] = [
  { phase: "assembly", label: "Assembly", timeRange: [0, 25], description: "Units marshalling at forward staging area" },
  { phase: "advance", label: "Advance", timeRange: [25, 60], description: "Tactical advance along designated axes" },
  { phase: "engagement", label: "Engagement", timeRange: [60, 80], description: "Units converging on objective area" },
  { phase: "consolidation", label: "Consolidation", timeRange: [80, 100], description: "Establishing defensive positions" },
];

const UNIT_WAYPOINTS: Record<string, [number, number][]> = {
  alpha: [[78.15, 34.18], [78.16, 34.19], [78.17, 34.2], [78.19, 34.21], [78.21, 34.23], [78.23, 34.24], [78.25, 34.25], [78.22, 34.24], [78.24, 34.26], [78.26, 34.25]],
  bravo: [[78.16, 34.18], [78.17, 34.19], [78.18, 34.21], [78.19, 34.23], [78.2, 34.25], [78.2, 34.27], [78.21, 34.28], [78.22, 34.24], [78.2, 34.26], [78.19, 34.27]],
  charlie: [[78.15, 34.17], [78.17, 34.17], [78.2, 34.18], [78.23, 34.18], [78.26, 34.19], [78.28, 34.2], [78.3, 34.2], [78.22, 34.24], [78.28, 34.22], [78.3, 34.21]],
  delta: [[78.14, 34.18], [78.16, 34.18], [78.18, 34.19], [78.21, 34.2], [78.24, 34.21], [78.26, 34.23], [78.28, 34.24], [78.22, 34.24], [78.25, 34.25], [78.27, 34.24]],
  echo: [[78.14, 34.19], [78.13, 34.19], [78.11, 34.2], [78.09, 34.2], [78.08, 34.21], [78.08, 34.22], [78.1, 34.22], [78.22, 34.24], [78.12, 34.23], [78.1, 34.24]],
  foxtrot: [[78.16, 34.19], [78.17, 34.2], [78.19, 34.22], [78.2, 34.24], [78.21, 34.26], [78.22, 34.28], [78.22, 34.3], [78.22, 34.24], [78.23, 34.28], [78.21, 34.29]],
};

const ARC_POINTS = 300;
const BASE_DURATION_SECONDS = 40;

const UNITS_MAP = Object.fromEntries(UNITS.map((u) => [u.id, u])) as Record<string, BattlefieldUnit>;

const UNIT_TYPE_ICONS: Record<MilitaryUnitType, React.ComponentType<{ className?: string }>> = {
  infantry: Footprints,
  armor: Shield,
  patrol: ScanEye,
  recon: Radar,
};
const UNIT_TYPE_LABELS: Record<MilitaryUnitType, string> = {
  infantry: "Infantry",
  armor: "Armor",
  patrol: "Patrol",
  recon: "Recon",
};

function BattlefieldDeckOverlay({
  paths,
  currentTime,
  positions,
}: {
  paths: BattlefieldPath[];
  currentTime: number;
  positions: BattlefieldPosition[];
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
    const trailLayers = paths.map(
      (p) =>
        new TripsLayer<BattlefieldPath>({
          id: `trail-${p.unitId}`,
          data: [p],
          getPath: (d) => d.path,
          getTimestamps: (d) => d.timestamps,
          getColor: (d) => UNITS_MAP[d.unitId]?.color ?? [255, 255, 255],
          currentTime,
          trailLength: 60,
          fadeTrail: true,
          widthMinPixels: 4,
          capRounded: true,
          jointRounded: true,
          opacity: 0.85,
        }),
    );

    overlay.setProps({
      layers: [
        ...trailLayers,
        new ScatterplotLayer<BattlefieldPosition>({
          id: "unit-positions",
          data: positions,
          getPosition: (d) => [d.lng, d.lat],
          getFillColor: (d) => UNITS_MAP[d.unitId]?.color ?? [255, 255, 255],
          getRadius: 200,
          radiusMinPixels: 6,
          radiusMaxPixels: 20,
          opacity: 0.9,
          stroked: true,
          getLineColor: [255, 255, 255],
          lineWidthMinPixels: 2,
        }),
        new TextLayer<BattlefieldPosition>({
          id: "unit-labels",
          data: positions,
          getPosition: (d) => [d.lng, d.lat],
          getText: (d) => UNITS_MAP[d.unitId]?.callsign ?? "",
          getSize: 14,
          getColor: [255, 255, 255, 230],
          getTextAnchor: "start",
          getAlignmentBaseline: "center",
          getPixelOffset: [12, 0],
          fontFamily: "monospace",
          billboard: true,
          outlineWidth: 3,
          outlineColor: [0, 0, 0, 200],
        }),
      ],
    });
  }, [paths, currentTime, positions]);

  return null;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function DefenseBattlefieldCard() {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeUnitTypes, setActiveUnitTypes] = useState<Set<MilitaryUnitType>>(
    () => new Set(["infantry", "armor", "patrol", "recon"]),
  );

  const playingRef = useRef(isPlaying);
  const speedRef = useRef(speed);
  useEffect(() => {
    playingRef.current = isPlaying;
    speedRef.current = speed;
  });

  const paths = useMemo<BattlefieldPath[]>(
    () =>
      UNITS.map((u) => {
        const waypoints = UNIT_WAYPOINTS[u.id]!;
        const interp = interpolatePath(waypoints, ARC_POINTS);
        return { unitId: u.id, path: interp, timestamps: interp.map((_, i) => i) };
      }),
    [],
  );

  const activeUnits = useMemo(() => UNITS.filter((u) => activeUnitTypes.has(u.type)), [activeUnitTypes]);

  const activePaths = useMemo(
    () =>
      paths.filter((p) => {
        const unit = UNITS_MAP[p.unitId];
        return unit ? activeUnitTypes.has(unit.type) : false;
      }),
    [paths, activeUnitTypes],
  );

  const positions = useMemo<BattlefieldPosition[]>(() => {
    const maxIdx = ARC_POINTS - 1;
    const result: BattlefieldPosition[] = [];
    for (const unit of activeUnits) {
      const unitPath = paths.find((p) => p.unitId === unit.id);
      if (!unitPath || unitPath.path.length < 2) continue;
      const clamped = Math.min(currentTime, maxIdx);
      const idx = Math.floor(clamped);
      const frac = clamped - idx;
      const safe = Math.min(idx, maxIdx - 1);
      const p0 = unitPath.path[safe]!;
      const p1 = unitPath.path[safe + 1]!;
      const lng = p0[0] + (p1[0] - p0[0]) * frac;
      const lat = p0[1] + (p1[1] - p0[1]) * frac;
      const bearingIdx = Math.min(safe + 3, maxIdx);
      const bearingPt = unitPath.path[bearingIdx]!;
      const bearing = calculateBearing(lat, lng, bearingPt[1], bearingPt[0]);
      result.push({ lng, lat, bearing, unitId: unit.id });
    }
    return result;
  }, [activeUnits, paths, currentTime]);

  const selectedPhase = useMemo<MissionPhaseInfo>(
    () =>
      MISSION_PHASES.find((p) => progress >= p.timeRange[0] && progress < p.timeRange[1]) ??
      MISSION_PHASES[MISSION_PHASES.length - 1]!,
    [progress],
  );

  useEffect(() => {
    let frame = 0;
    let last: number | null = null;
    const tick = (ts: number) => {
      if (last === null) last = ts;
      const delta = (ts - last) / 1000;
      last = ts;
      if (playingRef.current) {
        const inc = (delta * speedRef.current * ARC_POINTS) / BASE_DURATION_SECONDS;
        setCurrentTime((t) => {
          const nt = t + inc;
          if (nt >= ARC_POINTS - 1) {
            setIsPlaying(false);
            setProgress(100);
            return ARC_POINTS - 1;
          }
          setProgress((nt / (ARC_POINTS - 1)) * 100);
          return nt;
        });
        setElapsedTime((e) => e + delta);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const play = () => {
    if (progress >= 100) {
      setCurrentTime(0);
      setProgress(0);
      setElapsedTime(0);
    }
    setIsPlaying(true);
  };

  const pause = () => setIsPlaying(false);

  const reset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setProgress(0);
    setElapsedTime(0);
  };

  const seek = (pct: number) => {
    const clamped = Math.max(0, Math.min(100, pct));
    setProgress(clamped);
    setCurrentTime((clamped / 100) * (ARC_POINTS - 1));
  };

  const toggleUnitType = (type: MilitaryUnitType) => {
    setActiveUnitTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    seek(pct);
  };

  const speedOptions = [0.5, 1, 2, 4];
  const unitTypes: MilitaryUnitType[] = ["infantry", "armor", "patrol", "recon"];

  return (
    <div className="relative h-full w-full min-h-[300px]">
      <Map center={[78.2, 34.2]} zoom={11} theme="dark">
        <BattlefieldDeckOverlay paths={activePaths} currentTime={currentTime} positions={positions} />
      </Map>

      <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
        <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/90 px-3 py-2 text-xs backdrop-blur-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Target className="size-3.5" />
            <span className="font-semibold text-foreground">{selectedPhase.label}</span>
          </div>
          <div className="h-3 w-px bg-border" />
          <div className="flex items-center gap-1 text-muted-foreground">
            <Timer className="size-3.5" />
            <span>{formatTime(elapsedTime)}</span>
          </div>
          <div className="h-3 w-px bg-border" />
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="size-3.5" />
            <span>{activeUnits.length} units</span>
          </div>
          <div className="h-3 w-px bg-border" />
          <div className="max-w-48 truncate text-muted-foreground">{selectedPhase.description}</div>
        </div>
      </div>

      <MapPanel className="absolute top-3 right-3 z-10 w-[280px]">
        <MapPanelHeader>
          <MapPanelTitle>Battlefield</MapPanelTitle>
        </MapPanelHeader>
        <MapPanelContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Mission Phase</h3>
            <div className="flex gap-1">
              {MISSION_PHASES.map((phase) => (
                <div
                  key={phase.phase}
                  title={phase.label}
                  className={
                    "flex-1 truncate rounded-md px-1.5 py-1 text-center text-[10px] font-medium transition-colors " +
                    (selectedPhase.phase === phase.phase
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground")
                  }
                >
                  {phase.label}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Timeline</h3>
            <div
              onClick={handleSeek}
              className="h-2 w-full cursor-pointer overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-right text-xs text-muted-foreground">{Math.round(progress)}%</p>
          </div>

          <div className="flex items-center justify-center gap-2">
            <button
              onClick={reset}
              title="Reset"
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <RotateCcw className="size-4" />
            </button>
            <button
              onClick={isPlaying ? pause : play}
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

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Unit Filters</h3>
            <div className="space-y-1">
              {unitTypes.map((ut) => {
                const Icon = UNIT_TYPE_ICONS[ut];
                const on = activeUnitTypes.has(ut);
                return (
                  <button
                    key={ut}
                    onClick={() => toggleUnitType(ut)}
                    className={
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-accent " +
                      (on ? "text-foreground" : "text-muted-foreground opacity-50")
                    }
                  >
                    <Icon className="size-3.5" />
                    <span className="font-medium">{UNIT_TYPE_LABELS[ut]}</span>
                    <div
                      className={
                        "ml-auto size-3 rounded-sm border " +
                        (on ? "border-primary bg-primary" : "border-border")
                      }
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold">Active Units</h3>
            {UNITS.map((unit) => (
              <div key={unit.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <div
                  className="size-2 rounded-full"
                  style={{ backgroundColor: `rgb(${unit.color.join(",")})` }}
                />
                <span className="font-medium">{unit.callsign}</span>
                <span className="ml-auto">{unit.strength} pax</span>
              </div>
            ))}
          </div>
        </MapPanelContent>
      </MapPanel>
    </div>
  );
}
