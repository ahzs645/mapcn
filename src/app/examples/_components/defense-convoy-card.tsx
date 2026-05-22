"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Pause, Play, RotateCcw, Package, Fuel, HeartPulse, Truck, Clock, MapPin, Navigation } from "lucide-react";
import { Map, useMap } from "@/registry/map";
import { MapPanel, MapPanelHeader, MapPanelTitle, MapPanelContent } from "@/registry/map-ui";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { TripsLayer } from "@deck.gl/geo-layers";
import { ScatterplotLayer, TextLayer } from "@deck.gl/layers";

type CargoType = "ammo" | "fuel" | "medical";
type ConvoyStatus = "en-route" | "arrived" | "delayed";
type CheckpointStatus = "cleared" | "next" | "pending";

interface ConvoyUnit {
  id: string;
  callsign: string;
  cargoType: CargoType;
  vehicleCount: number;
  status: ConvoyStatus;
  color: [number, number, number];
}

interface ConvoyRoute {
  convoyId: string;
  path: [number, number][];
  timestamps: number[];
  distanceKm: number;
}

interface ConvoyCheckpoint {
  id: string;
  convoyId: string;
  label: string;
  position: [number, number];
  pathIndex: number;
  status: CheckpointStatus;
}

const CONVOYS: ConvoyUnit[] = [
  { id: "supply-1", callsign: "SUPPLY-1", cargoType: "ammo", vehicleCount: 12, status: "en-route", color: [255, 165, 0] },
  { id: "supply-2", callsign: "SUPPLY-2", cargoType: "fuel", vehicleCount: 8, status: "en-route", color: [0, 180, 255] },
  { id: "medevac-1", callsign: "MEDEVAC-1", cargoType: "medical", vehicleCount: 5, status: "en-route", color: [255, 60, 60] },
];

const CONVOY_DEFS: {
  id: string;
  waypoints: [number, number][];
  checkpointLabels: string[];
  distanceKm: number;
}[] = [
  {
    id: "supply-1",
    waypoints: [
      [73.02, 26.29],
      [72.6, 26.15],
      [72.1, 26.0],
      [71.7, 25.85],
      [71.38, 25.75],
    ],
    checkpointLabels: ["Jodhpur Depot", "Phalodi Fwd", "Balotra Jn", "Barmer HQ"],
    distanceKm: 220,
  },
  {
    id: "supply-2",
    waypoints: [
      [73.02, 26.29],
      [72.6, 26.45],
      [72.0, 26.6],
      [71.4, 26.78],
      [70.91, 26.91],
    ],
    checkpointLabels: ["Jodhpur Depot", "Osian Pass", "Pokaran Range", "Jaisalmer Fort"],
    distanceKm: 280,
  },
  {
    id: "medevac-1",
    waypoints: [
      [71.38, 25.75],
      [71.15, 26.05],
      [71.0, 26.4],
      [70.91, 26.91],
    ],
    checkpointLabels: ["Barmer Aid Stn", "Sanchor Cross", "Jaisalmer Hosp"],
    distanceKm: 180,
  },
];

const ARC_POINTS = 300;
const BASE_LOOP_SECONDS = 90;

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
}

function interpolateRoute(waypoints: [number, number][], numPoints: number): [number, number][] {
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
      catmullRom(waypoints[i0][0], waypoints[i1][0], waypoints[i2][0], waypoints[i3][0], frac),
      catmullRom(waypoints[i0][1], waypoints[i1][1], waypoints[i2][1], waypoints[i3][1], frac),
    ]);
  }
  return result;
}

function buildRoutes(): { routes: ConvoyRoute[]; checkpoints: ConvoyCheckpoint[] } {
  const routes: ConvoyRoute[] = [];
  const checkpoints: ConvoyCheckpoint[] = [];
  for (const def of CONVOY_DEFS) {
    const path = interpolateRoute(def.waypoints, ARC_POINTS);
    routes.push({ convoyId: def.id, path, timestamps: path.map((_, i) => i), distanceKm: def.distanceKm });
    for (let i = 0; i < def.checkpointLabels.length; i++) {
      const idx = Math.round((i / (def.checkpointLabels.length - 1)) * (path.length - 1));
      checkpoints.push({
        id: `cp-${def.id}-${i}`,
        convoyId: def.id,
        label: def.checkpointLabels[i],
        position: path[idx],
        pathIndex: idx,
        status: "pending",
      });
    }
  }
  return { routes, checkpoints };
}

function formatEta(minutes: number): string {
  if (minutes <= 0) return "Arrived";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const CARGO_ICONS: Record<CargoType, typeof Package> = {
  ammo: Package,
  fuel: Fuel,
  medical: HeartPulse,
};

const CARGO_LABELS: Record<CargoType, string> = {
  ammo: "Ammunition",
  fuel: "Fuel Tankers",
  medical: "Medical Supplies",
};

const CHECKPOINT_COLORS: Record<CheckpointStatus, [number, number, number, number]> = {
  cleared: [0, 200, 100, 220],
  next: [255, 200, 0, 220],
  pending: [150, 150, 150, 160],
};

interface ConvoyLayerProps {
  routes: ConvoyRoute[];
  positions: Record<string, { lng: number; lat: number }>;
  activeCheckpoints: ConvoyCheckpoint[];
  loopedTime: number;
  selectedConvoyId: string | null;
}

function ConvoyLayers({ routes, positions, activeCheckpoints, loopedTime, selectedConvoyId }: ConvoyLayerProps) {
  const { map, isLoaded } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;
    let stopped = false;

    const addOverlay = () => {
      if (stopped) return;
      overlay = new MapboxOverlay({ layers: [] });
      overlayRef.current = overlay;
      map.addControl(overlay as unknown as maplibregl.IControl);
    };

    if (map.isStyleLoaded()) {
      addOverlay();
    } else {
      map.once("load", addOverlay);
    }

    return () => {
      stopped = true;
      map.off("load", addOverlay);
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

    const trailLayers = routes.map(
      (route) =>
        new TripsLayer({
          id: `convoy-trail-${route.convoyId}`,
          data: [route],
          getPath: (d: ConvoyRoute) => d.path,
          getTimestamps: (d: ConvoyRoute) => d.timestamps,
          getColor: CONVOYS.find((c) => c.id === route.convoyId)?.color ?? [255, 255, 255],
          currentTime: loopedTime,
          trailLength: 80,
          fadeTrail: true,
          widthMinPixels: 4,
          capRounded: true,
          jointRounded: true,
          opacity: 0.8,
        }),
    );

    const positionData = CONVOYS.map((c) => {
      const pos = positions[c.id];
      if (!pos) return null;
      return { lng: pos.lng, lat: pos.lat, convoyId: c.id, selected: c.id === selectedConvoyId };
    }).filter((d): d is { lng: number; lat: number; convoyId: string; selected: boolean } => d !== null);

    const posLayer = new ScatterplotLayer({
      id: "convoy-positions",
      data: positionData,
      getPosition: (d) => [d.lng, d.lat] as [number, number],
      getFillColor: (d) => {
        const c = CONVOYS.find((u) => u.id === d.convoyId)?.color ?? [255, 255, 255];
        return [c[0], c[1], c[2], 230];
      },
      getRadius: (d) => (d.selected ? 14 : 9),
      radiusUnits: "pixels",
      stroked: true,
      getLineColor: [255, 255, 255, 200],
      lineWidthMinPixels: 2,
      pickable: true,
    });

    const labelLayer = new TextLayer({
      id: "convoy-labels",
      data: positionData.map((d) => ({
        position: [d.lng, d.lat] as [number, number],
        text: CONVOYS.find((c) => c.id === d.convoyId)?.callsign ?? "",
      })),
      getPosition: (d) => d.position,
      getText: (d) => d.text,
      getColor: [255, 255, 255, 230],
      getSize: 12,
      getPixelOffset: [0, -22],
      fontFamily: "monospace",
      fontWeight: 700,
      outlineWidth: 3,
      outlineColor: [0, 0, 0, 200],
      billboard: true,
    });

    const cpLayer = new ScatterplotLayer({
      id: "convoy-checkpoints",
      data: activeCheckpoints,
      getPosition: (d: ConvoyCheckpoint) => d.position,
      getFillColor: (d: ConvoyCheckpoint) => CHECKPOINT_COLORS[d.status],
      getRadius: (d: ConvoyCheckpoint) => (d.status === "next" ? 7 : 5),
      radiusUnits: "pixels",
      stroked: true,
      getLineColor: [255, 255, 255, 140],
      lineWidthMinPixels: 1,
    });

    const cpLabelLayer = new TextLayer({
      id: "convoy-checkpoint-labels",
      data: activeCheckpoints,
      getPosition: (d: ConvoyCheckpoint) => d.position,
      getText: (d: ConvoyCheckpoint) => d.label,
      getColor: [220, 220, 220, 200],
      getSize: 10,
      getPixelOffset: [0, 14],
      fontFamily: "monospace",
      fontWeight: 500,
      outlineWidth: 2,
      outlineColor: [0, 0, 0, 180],
      billboard: true,
    });

    try {
      overlay.setProps({ layers: [...trailLayers, posLayer, labelLayer, cpLayer, cpLabelLayer] });
    } catch {}
  }, [routes, positions, activeCheckpoints, loopedTime, selectedConvoyId]);

  return null;
}

function ConvoyCardInner() {
  const { routes, checkpoints } = useMemo(() => buildRoutes(), []);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [selectedConvoyId, setSelectedConvoyId] = useState<string | null>("supply-1");

  const maxArcPoints = useMemo(
    () => (routes.length === 0 ? 1 : Math.max(...routes.map((r) => r.path.length))),
    [routes],
  );

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
        const max = maxArcPoints - 1;
        const inc = (delta * speedRef.current * max) / BASE_LOOP_SECONDS;
        setCurrentTime((t) => Math.min(t + inc, max));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [maxArcPoints]);

  const positions = useMemo(() => {
    const result: Record<string, { lng: number; lat: number }> = {};
    for (const route of routes) {
      if (route.path.length < 2) continue;
      const maxIdx = route.path.length - 1;
      const t = Math.min(currentTime, maxIdx);
      const idx = Math.floor(t);
      const frac = t - idx;
      if (idx >= maxIdx) {
        result[route.convoyId] = { lng: route.path[maxIdx][0], lat: route.path[maxIdx][1] };
      } else {
        const pt = route.path[idx];
        const next = route.path[idx + 1];
        result[route.convoyId] = {
          lng: pt[0] + (next[0] - pt[0]) * frac,
          lat: pt[1] + (next[1] - pt[1]) * frac,
        };
      }
    }
    return result;
  }, [currentTime, routes]);

  const loopedTime = Math.min(currentTime, maxArcPoints - 1);

  const activeCheckpoints = useMemo<ConvoyCheckpoint[]>(() => {
    return checkpoints.map((cp) => {
      let status: CheckpointStatus = "pending";
      if (currentTime >= cp.pathIndex + 5) status = "cleared";
      else if (currentTime >= cp.pathIndex - 30) status = "next";
      return { ...cp, status };
    });
  }, [currentTime, checkpoints]);

  const selectedDetails = useMemo(() => {
    if (!selectedConvoyId) return null;
    const convoy = CONVOYS.find((c) => c.id === selectedConvoyId);
    const route = routes.find((r) => r.convoyId === selectedConvoyId);
    if (!convoy || !route) return null;
    const routeLen = route.path.length - 1;
    const progress = Math.min(currentTime / routeLen, 1);
    const remainingFraction = 1 - progress;
    const totalMinutes = (route.distanceKm / 60) * 60;
    const minutesRemaining = totalMinutes * remainingFraction;
    const convoyCps = activeCheckpoints.filter((cp) => cp.convoyId === convoy.id);
    const nextCp = convoyCps.find((cp) => cp.status === "next");
    const nextLabel = nextCp?.label ?? convoyCps[convoyCps.length - 1]?.label ?? "N/A";
    return {
      unit: convoy,
      eta: formatEta(minutesRemaining),
      nextCheckpoint: nextLabel,
      distanceRemaining: Math.round(remainingFraction * route.distanceKm),
      progress: Math.round(progress * 100),
    };
  }, [selectedConvoyId, currentTime, routes, activeCheckpoints]);

  const reset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const togglePlay = () => {
    if (currentTime >= maxArcPoints - 2) setCurrentTime(0);
    setIsPlaying((p) => !p);
  };

  const speedOptions = [0.5, 1, 2, 4];

  return (
    <>
      <ConvoyLayers
        routes={routes}
        positions={positions}
        activeCheckpoints={activeCheckpoints}
        loopedTime={loopedTime}
        selectedConvoyId={selectedConvoyId}
      />

      {selectedDetails && (() => {
        const Icon = CARGO_ICONS[selectedDetails.unit.cargoType];
        return (
          <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
            <div className="flex items-center gap-3 whitespace-nowrap rounded-lg border border-border/50 bg-background/90 px-3 py-2 text-xs backdrop-blur-sm">
              <div className="flex items-center gap-1.5 font-mono font-bold">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: `rgb(${selectedDetails.unit.color.join(",")})` }}
                />
                {selectedDetails.unit.callsign}
              </div>
              <div className="h-3 w-px bg-border" />
              <div className="flex items-center gap-1 text-muted-foreground">
                <Icon className="size-3.5" />
                <span>{CARGO_LABELS[selectedDetails.unit.cargoType]}</span>
              </div>
              <div className="h-3 w-px bg-border" />
              <div className="flex items-center gap-1 text-muted-foreground">
                <Truck className="size-3.5" />
                <span>{selectedDetails.unit.vehicleCount} vehicles</span>
              </div>
              <div className="h-3 w-px bg-border" />
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="size-3.5" />
                <span>ETA {selectedDetails.eta}</span>
              </div>
              <div className="h-3 w-px bg-border" />
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="size-3.5" />
                <span>{selectedDetails.nextCheckpoint}</span>
              </div>
              <div className="h-3 w-px bg-border" />
              <div className="flex items-center gap-1 text-muted-foreground">
                <Navigation className="size-3.5" />
                <span>{selectedDetails.distanceRemaining} km</span>
              </div>
              <div className="h-3 w-px bg-border" />
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                {selectedDetails.progress}%
              </span>
            </div>
          </div>
        );
      })()}

      <MapPanel className="absolute top-3 right-3 w-[230px]">
        <MapPanelHeader>
          <MapPanelTitle>Convoy</MapPanelTitle>
        </MapPanelHeader>
        <MapPanelContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Convoys</h3>
            <div className="space-y-1">
              {CONVOYS.map((convoy) => {
                const Icon = CARGO_ICONS[convoy.cargoType];
                return (
                  <button
                    key={convoy.id}
                    onClick={() =>
                      setSelectedConvoyId((cur) => (cur === convoy.id ? null : convoy.id))
                    }
                    className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs transition-colors ${
                      selectedConvoyId === convoy.id
                        ? "bg-primary/15 text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: `rgb(${convoy.color.join(",")})` }}
                    />
                    <Icon className="size-3.5 shrink-0" />
                    <span className="font-mono font-bold">{convoy.callsign}</span>
                    <span className="ml-auto rounded-full bg-emerald-500/15 text-emerald-500 px-1.5 py-0.5 text-[10px] uppercase">
                      {convoy.status}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Playback</h3>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={reset}
                title="Reset"
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <RotateCcw className="size-4" />
              </button>
              <button
                onClick={togglePlay}
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

export function DefenseConvoyCard() {
  const { resolvedTheme } = useTheme();
  return (
    <div className="relative h-full w-full min-h-[300px]">
      <Map center={[72.0, 26.3]} zoom={8} theme={resolvedTheme === "dark" ? "dark" : "light"}>
        <ConvoyCardInner />
      </Map>
    </div>
  );
}
