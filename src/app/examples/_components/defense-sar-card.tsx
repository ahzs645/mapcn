"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Map, useMap } from "@/registry/map";
import { MapPanel, MapPanelHeader, MapPanelTitle, MapPanelContent } from "@/registry/map-ui";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { TripsLayer } from "@deck.gl/geo-layers";
import { PolygonLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import type { PickingInfo } from "@deck.gl/core";

type SectorStatus = "unsearched" | "searched";

interface SarSector {
  id: string;
  label: string;
  row: number;
  col: number;
  bounds: [number, number][];
  probability: number;
  status: SectorStatus;
}

interface SarHelicopter {
  id: string;
  callsign: string;
  color: [number, number, number];
  sectorRoute: string[];
}

interface SarPosition {
  lng: number;
  lat: number;
  bearing: number;
}

interface SarTripDatum {
  helicopterId: string;
  path: [number, number][];
  timestamps: number[];
}

const DEG_TO_RAD = Math.PI / 180;
const GRID_COLS = 6;
const GRID_ROWS = 4;
const SECTOR_SIZE_DEG = 0.045;
const GRID_ORIGIN: [number, number] = [79.365, 30.41];
const ARC_POINTS_PER_SECTOR = 20;
const BASE_LOOP_SECONDS = 90;
const ROW_LABELS = ["A", "B", "C", "D"];

function generateSectors(): SarSector[] {
  const sectors: SarSector[] = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const lng0 = GRID_ORIGIN[0] + col * SECTOR_SIZE_DEG;
      const lat0 = GRID_ORIGIN[1] + row * SECTOR_SIZE_DEG;
      const lng1 = lng0 + SECTOR_SIZE_DEG;
      const lat1 = lat0 + SECTOR_SIZE_DEG;
      const label = `${ROW_LABELS[row]}${col + 1}`;
      const seed = row * GRID_COLS + col;
      const probability = Math.abs(Math.sin(seed * 1.7 + 0.3) * Math.cos(seed * 0.9 + 1.2));
      sectors.push({
        id: label,
        label,
        row,
        col,
        bounds: [
          [lng0, lat0],
          [lng1, lat0],
          [lng1, lat1],
          [lng0, lat1],
          [lng0, lat0],
        ],
        probability: Math.round(probability * 100) / 100,
        status: "unsearched",
      });
    }
  }
  return sectors;
}

function sectorCenter(s: SarSector): [number, number] {
  const b0 = s.bounds[0];
  const b2 = s.bounds[2];
  return [(b0[0] + b2[0]) / 2, (b0[1] + b2[1]) / 2];
}

function buildHelicopterRoute(startCol: number): string[] {
  const route: string[] = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    const isEvenRow = row % 2 === 0;
    for (let col = 0; col < GRID_COLS; col++) {
      const actualCol = isEvenRow ? startCol + col : startCol + (GRID_COLS - 1 - col);
      const wrappedCol = ((actualCol % GRID_COLS) + GRID_COLS) % GRID_COLS;
      route.push(`${ROW_LABELS[row]}${wrappedCol + 1}`);
    }
  }
  return route;
}

function buildFlightPath(
  sectors: SarSector[],
  sectorRoute: string[],
): { path: [number, number][]; timestamps: number[] } {
  const sectorMap: Record<string, SarSector> = {};
  for (const s of sectors) sectorMap[s.id] = s;
  const path: [number, number][] = [];
  const timestamps: number[] = [];
  let t = 0;
  for (let i = 0; i < sectorRoute.length; i++) {
    const sector = sectorMap[sectorRoute[i]];
    if (!sector) continue;
    const center = sectorCenter(sector);
    if (i === 0) {
      path.push(center);
      timestamps.push(t);
      t += ARC_POINTS_PER_SECTOR;
    } else {
      const prev = sectorMap[sectorRoute[i - 1]];
      if (!prev) continue;
      const prevCenter = sectorCenter(prev);
      for (let step = 1; step <= ARC_POINTS_PER_SECTOR; step++) {
        const frac = step / ARC_POINTS_PER_SECTOR;
        path.push([prevCenter[0] + (center[0] - prevCenter[0]) * frac, prevCenter[1] + (center[1] - prevCenter[1]) * frac]);
        timestamps.push(t + step);
      }
      t += ARC_POINTS_PER_SECTOR;
    }
  }
  return { path, timestamps };
}

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const p1 = lat1 * DEG_TO_RAD;
  const p2 = lat2 * DEG_TO_RAD;
  const dl = (lon2 - lon1) * DEG_TO_RAD;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}

const HELICOPTERS: SarHelicopter[] = [
  { id: "helo-1", callsign: "RESCUE-1", color: [0, 180, 255], sectorRoute: buildHelicopterRoute(0) },
  { id: "helo-2", callsign: "RESCUE-2", color: [255, 120, 0], sectorRoute: buildHelicopterRoute(3) },
];

function getSectorFillColor(s: SarSector): [number, number, number, number] {
  if (s.status === "searched") return [120, 120, 120, 100];
  const p = s.probability;
  if (p > 0.65) return [220, 40, 40, 160];
  if (p > 0.35) return [240, 200, 0, 140];
  return [40, 180, 60, 120];
}

function getSectorLineColor(s: SarSector): [number, number, number, number] {
  return s.status === "searched" ? [160, 160, 160, 180] : [255, 255, 255, 200];
}

interface SarLayersProps {
  sectors: SarSector[];
  positions: Record<string, SarPosition>;
  tripData: SarTripDatum[];
  loopedTime: number;
  onSectorClick: (id: string) => void;
}

function SarLayers({ sectors, positions, tripData, loopedTime, onSectorClick }: SarLayersProps) {
  const { map, isLoaded } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const clickRef = useRef(onSectorClick);
  useEffect(() => {
    clickRef.current = onSectorClick;
  });

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
        try { map.removeControl(overlay as unknown as maplibregl.IControl); } catch {}
      }
      overlayRef.current = null;
    };
  }, [map, isLoaded]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const sectorData = sectors.map((s) => ({
      polygon: s.bounds,
      fillColor: getSectorFillColor(s),
      lineColor: getSectorLineColor(s),
      sectorId: s.id,
    }));

    const polygonLayer = new PolygonLayer({
      id: "sar-sectors",
      data: sectorData,
      getPolygon: (d) => d.polygon,
      getFillColor: (d) => d.fillColor,
      getLineColor: (d) => d.lineColor,
      getLineWidth: 2,
      lineWidthUnits: "pixels",
      filled: true,
      stroked: true,
      pickable: true,
      onClick: (info: PickingInfo) => {
        const obj = info.object as { sectorId?: string } | undefined;
        if (obj?.sectorId) clickRef.current(obj.sectorId);
      },
      opacity: 0.8,
    });

    const labelLayer = new TextLayer({
      id: "sar-labels",
      data: sectors.map((s) => ({
        position: sectorCenter(s),
        text: s.label,
        color:
          s.status === "searched"
            ? ([180, 180, 180, 180] as [number, number, number, number])
            : ([255, 255, 255, 230] as [number, number, number, number]),
      })),
      getPosition: (d) => d.position,
      getText: (d) => d.text,
      getColor: (d) => d.color,
      getSize: 13,
      fontFamily: "monospace",
      fontWeight: 700,
      outlineWidth: 3,
      outlineColor: [0, 0, 0, 200],
      billboard: true,
    });

    const trailLayers = tripData.map(
      (trip) =>
        new TripsLayer({
          id: `sar-trail-${trip.helicopterId}`,
          data: [trip],
          getPath: (d: SarTripDatum) => d.path,
          getTimestamps: (d: SarTripDatum) => d.timestamps,
          getColor: HELICOPTERS.find((h) => h.id === trip.helicopterId)?.color ?? [255, 255, 255],
          currentTime: loopedTime,
          trailLength: 60,
          fadeTrail: true,
          widthMinPixels: 4,
          capRounded: true,
          jointRounded: true,
          opacity: 0.8,
        }),
    );

    const heloData = HELICOPTERS.map((h) => {
      const pos = positions[h.id];
      if (!pos) return null;
      return { lng: pos.lng, lat: pos.lat, helicopterId: h.id };
    }).filter((d): d is { lng: number; lat: number; helicopterId: string } => d !== null);

    const heloLayer = new ScatterplotLayer({
      id: "sar-helicopters",
      data: heloData,
      getPosition: (d) => [d.lng, d.lat] as [number, number],
      getFillColor: (d) => {
        const c = HELICOPTERS.find((h) => h.id === d.helicopterId)?.color ?? [255, 255, 255];
        return [c[0], c[1], c[2], 240];
      },
      getRadius: 10,
      radiusUnits: "pixels",
      stroked: true,
      getLineColor: [255, 255, 255, 200],
      lineWidthMinPixels: 2,
    });

    const heloLabelLayer = new TextLayer({
      id: "sar-helo-labels",
      data: heloData.map((d) => ({
        position: [d.lng, d.lat] as [number, number],
        text: HELICOPTERS.find((h) => h.id === d.helicopterId)?.callsign ?? "",
      })),
      getPosition: (d) => d.position,
      getText: (d) => d.text,
      getColor: [255, 255, 255, 230],
      getSize: 11,
      getPixelOffset: [0, -18],
      fontFamily: "monospace",
      fontWeight: 700,
      outlineWidth: 2,
      outlineColor: [0, 0, 0, 180],
      billboard: true,
    });

    try {
      overlay.setProps({ layers: [polygonLayer, labelLayer, ...trailLayers, heloLayer, heloLabelLayer] });
    } catch {}
  }, [sectors, positions, tripData, loopedTime]);

  return null;
}

const LEGEND_ITEMS = [
  { label: "High probability", cls: "bg-red-500" },
  { label: "Medium probability", cls: "bg-yellow-500" },
  { label: "Low probability", cls: "bg-green-500" },
  { label: "Searched", cls: "bg-gray-400" },
];

function SarInner() {
  const [sectors, setSectors] = useState<SarSector[]>(generateSectors);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);

  const flightPaths = useMemo(
    () =>
      HELICOPTERS.map((h) => {
        const fp = buildFlightPath(sectors, h.sectorRoute);
        return { helicopterId: h.id, ...fp };
      }),
    [sectors],
  );

  const totalPathLength = flightPaths[0]?.timestamps[flightPaths[0].timestamps.length - 1] ?? 0;
  const loopedTime = totalPathLength > 0 ? currentTime % totalPathLength : 0;

  const playingRef = useRef(isPlaying);
  const speedRef = useRef(speed);
  const totalRef = useRef(totalPathLength);
  useEffect(() => {
    playingRef.current = isPlaying;
    speedRef.current = speed;
    totalRef.current = totalPathLength;
  });

  const positions = useMemo<Record<string, SarPosition>>(() => {
    const result: Record<string, SarPosition> = {};
    for (const helo of HELICOPTERS) {
      const fp = flightPaths.find((f) => f.helicopterId === helo.id);
      if (!fp || fp.path.length < 2) continue;
      const t = loopedTime;
      let idx = 0;
      for (let i = 0; i < fp.timestamps.length - 1; i++) {
        if (fp.timestamps[i + 1] >= t) { idx = i; break; }
        idx = i;
      }
      const t0 = fp.timestamps[idx];
      const t1 = fp.timestamps[idx + 1] ?? t0;
      const frac = t1 > t0 ? (t - t0) / (t1 - t0) : 0;
      const pt = fp.path[idx];
      const next = fp.path[Math.min(idx + 1, fp.path.length - 1)];
      const lng = pt[0] + (next[0] - pt[0]) * frac;
      const lat = pt[1] + (next[1] - pt[1]) * frac;
      const lookIdx = Math.min(idx + 3, fp.path.length - 1);
      const lookPt = fp.path[lookIdx];
      const bearing = calculateBearing(lat, lng, lookPt[1], lookPt[0]);
      result[helo.id] = { lng, lat, bearing };
    }
    return result;
  }, [flightPaths, loopedTime]);

  const tripData = useMemo<SarTripDatum[]>(
    () => flightPaths.map((fp) => ({ helicopterId: fp.helicopterId, path: fp.path, timestamps: fp.timestamps })),
    [flightPaths],
  );

  const positionsRef = useRef(positions);
  useEffect(() => {
    positionsRef.current = positions;
  });

  useEffect(() => {
    let last = 0;
    let frame = 0;
    const tick = (ts: number) => {
      if (!last) last = ts;
      const delta = (ts - last) / 1000;
      last = ts;
      if (playingRef.current) {
        const max = totalRef.current || 1;
        const inc = (delta * speedRef.current * max) / BASE_LOOP_SECONDS;
        setCurrentTime((t) => t + inc);

        const curPositions = positionsRef.current;
        setSectors((cur) => {
          let mutated = false;
          const next = cur.map((s) => {
            if (s.status !== "unsearched") return s;
            for (const helo of HELICOPTERS) {
              const pos = curPositions[helo.id];
              if (!pos) continue;
              const [minLng, minLat] = s.bounds[0];
              const [maxLng, maxLat] = s.bounds[2];
              if (pos.lng >= minLng && pos.lng <= maxLng && pos.lat >= minLat && pos.lat <= maxLat) {
                mutated = true;
                return { ...s, status: "searched" as const, probability: 0 };
              }
            }
            return s;
          });
          return mutated ? next : cur;
        });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const stats = useMemo(() => {
    const total = sectors.length;
    const searched = sectors.filter((s) => s.status === "searched").length;
    return {
      totalSectors: total,
      searchedSectors: searched,
      remainingSectors: total - searched,
      coveragePercent: total > 0 ? Math.round((searched / total) * 100) : 0,
    };
  }, [sectors]);

  const onSectorClick = (sectorId: string) => {
    setSectors((cur) =>
      cur.map((s) => {
        if (s.id !== sectorId) return s;
        const newStatus: SectorStatus = s.status === "searched" ? "unsearched" : "searched";
        const probability =
          newStatus === "searched"
            ? 0
            : Math.round(Math.abs(Math.sin(s.row * 1.7 + s.col * 0.9)) * 100) / 100;
        return { ...s, status: newStatus, probability };
      }),
    );
  };

  const reset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setSectors(generateSectors());
  };

  const speedOptions = [0.5, 1, 2, 4];

  return (
    <>
      <SarLayers
        sectors={sectors}
        positions={positions}
        tripData={tripData}
        loopedTime={loopedTime}
        onSectorClick={onSectorClick}
      />

      <MapPanel className="absolute top-3 right-3 w-[230px]">
        <MapPanelHeader>
          <MapPanelTitle>SAR</MapPanelTitle>
        </MapPanelHeader>
        <MapPanelContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Search Progress</h3>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Coverage</span>
                <span className="font-mono font-bold">{stats.coveragePercent}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${stats.coveragePercent}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-md bg-muted/50 px-2 py-1.5">
                  <div className="font-mono font-bold">{stats.totalSectors}</div>
                  <div className="text-muted-foreground">Total</div>
                </div>
                <div className="rounded-md bg-muted/50 px-2 py-1.5">
                  <div className="font-mono font-bold text-emerald-500">{stats.searchedSectors}</div>
                  <div className="text-muted-foreground">Searched</div>
                </div>
                <div className="rounded-md bg-muted/50 px-2 py-1.5">
                  <div className="font-mono font-bold text-amber-500">{stats.remainingSectors}</div>
                  <div className="text-muted-foreground">Remaining</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Playback</h3>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={reset}
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

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Legend</h3>
            <div className="space-y-1">
              {LEGEND_ITEMS.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={`size-3 shrink-0 rounded-sm ${item.cls}`} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </MapPanelContent>
      </MapPanel>
    </>
  );
}

export function DefenseSarCard() {
  const { resolvedTheme } = useTheme();
  return (
    <div className="relative h-full w-full min-h-[300px]">
      <Map center={[79.5, 30.5]} zoom={11} theme={resolvedTheme === "dark" ? "dark" : "light"}>
        <SarInner />
      </Map>
    </div>
  );
}
