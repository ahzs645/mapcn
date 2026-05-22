"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Pause, Play, RotateCcw, Anchor, Ship, Fish, AlertTriangle } from "lucide-react";
import { Map, useMap } from "@/registry/map";
import { MapPanel, MapPanelHeader, MapPanelTitle, MapPanelContent } from "@/registry/map-ui";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { TripsLayer } from "@deck.gl/geo-layers";
import { PathLayer, PolygonLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";

type ShipType = "naval" | "merchant" | "fishing" | "suspicious";

interface ShipDef {
  id: string;
  type: ShipType;
  callsign: string;
  color: [number, number, number];
  route: [number, number][];
}

interface ShipPosition {
  lng: number;
  lat: number;
  heading: number;
  speed: number;
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const ARC_POINTS = 400;
const BASE_LOOP_SECONDS = 90;

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

function generateCircle(center: [number, number], radiusKm: number, numPoints = 64): [number, number][] {
  const [cLng, cLat] = center;
  const latDeg = radiusKm / 111.32;
  const lngDeg = radiusKm / (111.32 * Math.cos(toRad(cLat)));
  const pts: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const a = (i / numPoints) * 2 * Math.PI;
    pts.push([cLng + lngDeg * Math.cos(a), cLat + latDeg * Math.sin(a)]);
  }
  return pts;
}

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

function pointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const SHIP_COLORS: Record<ShipType, [number, number, number]> = {
  naval: [0, 100, 255],
  merchant: [0, 200, 150],
  fishing: [200, 200, 0],
  suspicious: [255, 50, 50],
};

const SHIPS: ShipDef[] = [
  {
    id: "ins-vikrant", type: "naval", callsign: "INS-VIKRANT", color: SHIP_COLORS.naval,
    route: [[72.8, 18.9],[73.0, 17.5],[73.5, 16.0],[74.0, 15.0],[74.5, 14.0],[74.8, 12.9],[75.5, 11.5],[76.0, 10.5],[76.2, 9.9],[75.5, 11.5],[74.8, 12.9],[74.0, 15.0],[73.0, 17.5],[72.8, 18.9]],
  },
  {
    id: "ins-kolkata", type: "naval", callsign: "INS-KOLKATA", color: SHIP_COLORS.naval,
    route: [[70.5, 18.0],[70.0, 16.5],[69.5, 15.0],[69.0, 13.5],[69.5, 12.0],[70.5, 11.0],[71.5, 10.5],[72.0, 11.5],[71.5, 13.0],[70.5, 15.0],[70.0, 16.5],[70.5, 18.0]],
  },
  {
    id: "mv-sagarmala", type: "merchant", callsign: "MV-SAGARMALA", color: SHIP_COLORS.merchant,
    route: [[72.8, 18.9],[73.2, 17.5],[73.6, 16.0],[74.0, 14.5],[74.5, 13.0],[75.0, 11.5],[75.8, 10.5],[76.2, 9.9]],
  },
  {
    id: "mv-bharat", type: "merchant", callsign: "MV-BHARAT", color: SHIP_COLORS.merchant,
    route: [[65.0, 16.0],[66.5, 15.5],[68.0, 15.0],[69.5, 14.8],[71.0, 14.5],[72.5, 14.2],[73.8, 15.4]],
  },
  {
    id: "fv-matsya-1", type: "fishing", callsign: "FV-MATSYA-1", color: SHIP_COLORS.fishing,
    route: [[73.5, 15.8],[73.8, 15.4],[74.0, 15.0],[73.7, 14.8],[73.4, 15.2],[73.2, 15.6],[73.5, 15.8]],
  },
  {
    id: "unknown-1", type: "suspicious", callsign: "UNKNOWN-1", color: SHIP_COLORS.suspicious,
    route: [[65.0, 14.0],[66.0, 14.2],[67.0, 14.5],[68.0, 14.8],[69.0, 15.0],[70.0, 15.2],[71.0, 15.4],[72.0, 15.5]],
  },
];

const RADARS = [
  { id: "mumbai", name: "Mumbai", position: [72.8, 18.9] as [number, number], rangeKm: 150 },
  { id: "goa", name: "Goa", position: [73.8, 15.4] as [number, number], rangeKm: 150 },
  { id: "mangalore", name: "Mangalore", position: [74.8, 12.9] as [number, number], rangeKm: 150 },
  { id: "kochi", name: "Kochi", position: [76.2, 9.9] as [number, number], rangeKm: 150 },
];

const EEZ_POLYGON: [number, number][] = [
  [68.0, 19.5],[67.5, 17.0],[67.0, 15.0],[68.0, 12.0],[69.0, 9.0],[72.0, 8.0],[76.5, 8.5],
  [76.2, 9.9],[74.8, 12.9],[73.8, 15.4],[72.8, 18.9],[72.5, 20.0],[68.0, 19.5],
];

interface TripDatum {
  shipId: string;
  path: [number, number][];
  timestamps: number[];
}

function buildTripData(): TripDatum[] {
  return SHIPS.map((ship) => {
    const path = interpolateRoute(ship.route, ARC_POINTS);
    return { shipId: ship.id, path, timestamps: path.map((_, i) => i) };
  });
}

interface LayersProps {
  shipsFiltered: ShipDef[];
  positions: Record<string, ShipPosition>;
  tripData: TripDatum[];
  radarCircles: { polygon: [number, number][]; name: string }[];
  loopedTime: number;
}

function MaritimeLayers({ shipsFiltered, positions, tripData, radarCircles, loopedTime }: LayersProps) {
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
        try { map.removeControl(overlay as unknown as maplibregl.IControl); } catch {}
      }
      overlayRef.current = null;
    };
  }, [map, isLoaded]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const eezLayer = new PathLayer({
      id: "maritime-eez",
      data: [{ path: EEZ_POLYGON }],
      getPath: (d: { path: [number, number][] }) => d.path,
      getColor: [0, 120, 255, 180],
      widthMinPixels: 2,
    });

    const radarLayer = new PolygonLayer({
      id: "maritime-radar-coverage",
      data: radarCircles,
      getPolygon: (d: { polygon: [number, number][] }) => d.polygon,
      getFillColor: [0, 200, 100, 30],
      getLineColor: [0, 200, 100, 100],
      lineWidthMinPixels: 1,
      stroked: true,
      filled: true,
    });

    const radarStationLayer = new ScatterplotLayer({
      id: "maritime-radar-stations",
      data: RADARS,
      getPosition: (d: { position: [number, number] }) => d.position,
      getFillColor: [0, 200, 100, 200],
      getRadius: 6,
      radiusUnits: "pixels",
      stroked: true,
      getLineColor: [255, 255, 255, 180],
      lineWidthMinPixels: 2,
    });

    const trailLayers = tripData.map((trip) => {
      const ship = SHIPS.find((s) => s.id === trip.shipId);
      return new TripsLayer({
        id: `maritime-trail-${trip.shipId}`,
        data: [trip],
        getPath: (d: TripDatum) => d.path,
        getTimestamps: (d: TripDatum) => d.timestamps,
        getColor: ship?.color ?? [255, 255, 255],
        currentTime: loopedTime,
        trailLength: 60,
        fadeTrail: true,
        widthMinPixels: 3,
        capRounded: true,
        jointRounded: true,
        opacity: 0.7,
      });
    });

    const positionData = shipsFiltered
      .map((s) => {
        const pos = positions[s.id];
        if (!pos) return null;
        return { lng: pos.lng, lat: pos.lat, shipId: s.id, type: s.type };
      })
      .filter((d): d is { lng: number; lat: number; shipId: string; type: ShipType } => d !== null);

    const posLayer = new ScatterplotLayer({
      id: "maritime-positions",
      data: positionData,
      getPosition: (d) => [d.lng, d.lat] as [number, number],
      getFillColor: (d) => {
        const c = SHIPS.find((s) => s.id === d.shipId)?.color ?? [255, 255, 255];
        return [c[0], c[1], c[2], 220];
      },
      getRadius: (d) => (d.type === "suspicious" ? 10 : 7),
      radiusUnits: "pixels",
      stroked: true,
      getLineColor: [255, 255, 255, 180],
      lineWidthMinPixels: 2,
      pickable: true,
    });

    const labelLayer = new TextLayer({
      id: "maritime-labels",
      data: positionData.map((d) => ({
        position: [d.lng, d.lat] as [number, number],
        text: SHIPS.find((s) => s.id === d.shipId)?.callsign ?? "",
      })),
      getPosition: (d) => d.position,
      getText: (d) => d.text,
      getColor: [255, 255, 255, 230],
      getSize: 11,
      getPixelOffset: [0, -18],
      fontFamily: "monospace",
      fontWeight: 700,
      outlineWidth: 3,
      outlineColor: [0, 0, 0, 200],
      billboard: true,
    });

    try {
      overlay.setProps({
        layers: [eezLayer, radarLayer, radarStationLayer, ...trailLayers, posLayer, labelLayer],
      });
    } catch {}
  }, [shipsFiltered, positions, tripData, radarCircles, loopedTime]);

  return null;
}

const SHIP_TYPE_CFG: { type: ShipType; label: string; Icon: typeof Anchor; color: string }[] = [
  { type: "naval", label: "Naval", Icon: Anchor, color: "rgb(0, 100, 255)" },
  { type: "merchant", label: "Merchant", Icon: Ship, color: "rgb(0, 200, 150)" },
  { type: "fishing", label: "Fishing", Icon: Fish, color: "rgb(200, 200, 0)" },
  { type: "suspicious", label: "Suspicious", Icon: AlertTriangle, color: "rgb(255, 50, 50)" },
];

function MaritimeInner() {
  const tripDataAll = useMemo(() => buildTripData(), []);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [activeTypes, setActiveTypes] = useState<Set<ShipType>>(
    () => new Set(["naval", "merchant", "fishing", "suspicious"]),
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
        const inc = (delta * speedRef.current * ARC_POINTS) / BASE_LOOP_SECONDS;
        setCurrentTime((t) => t + inc);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const shipsFiltered = useMemo(() => SHIPS.filter((s) => activeTypes.has(s.type)), [activeTypes]);
  const tripDataFiltered = useMemo(
    () => tripDataAll.filter((t) => activeTypes.has(SHIPS.find((s) => s.id === t.shipId)!.type)),
    [tripDataAll, activeTypes],
  );

  const positions = useMemo<Record<string, ShipPosition>>(() => {
    const result: Record<string, ShipPosition> = {};
    for (const ship of shipsFiltered) {
      const trip = tripDataAll.find((t) => t.shipId === ship.id);
      if (!trip || trip.path.length < 2) continue;
      const maxIdx = trip.path.length - 1;
      const isLooping =
        ship.route[0][0] === ship.route[ship.route.length - 1][0] &&
        ship.route[0][1] === ship.route[ship.route.length - 1][1];
      const rawT = currentTime % (maxIdx + 1);
      const t = isLooping ? rawT : Math.min(rawT, maxIdx);
      const idx = Math.floor(t);
      const frac = t - idx;
      const pt = trip.path[idx];
      const nextIdx = isLooping ? (idx + 1) % trip.path.length : Math.min(idx + 1, maxIdx);
      const next = trip.path[nextIdx];
      const lng = pt[0] + (next[0] - pt[0]) * frac;
      const lat = pt[1] + (next[1] - pt[1]) * frac;
      const bIdx = Math.min(idx + 3, maxIdx);
      const bp = trip.path[bIdx];
      const heading = calculateBearing(lat, lng, bp[1], bp[0]);
      const baseSpeed = ship.type === "naval" ? 28 : ship.type === "merchant" ? 14 : 8;
      const speedVariation = 2 * Math.sin(currentTime * 0.05 + ship.id.charCodeAt(0));
      result[ship.id] = { lng, lat, heading, speed: Math.round(baseSpeed + speedVariation) };
    }
    return result;
  }, [currentTime, shipsFiltered, tripDataAll]);

  const radarCircles = useMemo(
    () => RADARS.map((r) => ({ polygon: generateCircle(r.position, r.rangeKm), name: r.name })),
    [],
  );

  const stats = useMemo(() => {
    const posEntries = Object.entries(positions);
    const total = posEntries.length;
    const inEez = posEntries.filter(([, p]) => pointInPolygon([p.lng, p.lat], EEZ_POLYGON)).length;
    const suspicious = shipsFiltered.filter((s) => s.type === "suspicious").length;
    const inRadar = posEntries.filter(([, p]) =>
      RADARS.some((r) => {
        const dlat = p.lat - r.position[1];
        const dlng = (p.lng - r.position[0]) * Math.cos(toRad(p.lat));
        const distKm = Math.sqrt(dlat * dlat + dlng * dlng) * 111.32;
        return distKm <= r.rangeKm;
      }),
    ).length;
    const coverage = total > 0 ? Math.round((inRadar / total) * 100) : 0;
    return { totalShips: total, inEez, radarCoverage: coverage, suspicious };
  }, [positions, shipsFiltered]);

  const loopedTime = currentTime % ARC_POINTS;
  const speedOptions = [0.5, 1, 2, 4];

  return (
    <>
      <MaritimeLayers
        shipsFiltered={shipsFiltered}
        positions={positions}
        tripData={tripDataFiltered}
        radarCircles={radarCircles}
        loopedTime={loopedTime}
      />

      <MapPanel className="absolute top-3 right-3 w-[230px]">
        <MapPanelHeader>
          <MapPanelTitle>Maritime</MapPanelTitle>
        </MapPanelHeader>
        <MapPanelContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Ship Types</h3>
            <div className="space-y-1">
              {SHIP_TYPE_CFG.map(({ type, label, Icon, color }) => {
                const active = activeTypes.has(type);
                return (
                  <button
                    key={type}
                    onClick={() =>
                      setActiveTypes((cur) => {
                        const next = new Set(cur);
                        if (next.has(type)) next.delete(type);
                        else next.add(type);
                        return next;
                      })
                    }
                    className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs transition-colors ${
                      active
                        ? "bg-primary/15 text-foreground"
                        : "text-muted-foreground/50 hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    <Icon className="size-3.5 shrink-0" />
                    <span className="font-medium">{label}</span>
                  </button>
                );
              })}
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

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Situation</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border bg-muted/50 p-2 text-center">
                <div className="text-lg font-bold tabular-nums">{stats.totalShips}</div>
                <div className="text-[10px] text-muted-foreground">Tracked</div>
              </div>
              <div className="rounded-lg border border-border bg-muted/50 p-2 text-center">
                <div className="text-lg font-bold tabular-nums">{stats.inEez}</div>
                <div className="text-[10px] text-muted-foreground">In EEZ</div>
              </div>
              <div className="rounded-lg border border-border bg-muted/50 p-2 text-center">
                <div className="text-lg font-bold tabular-nums">{stats.radarCoverage}%</div>
                <div className="text-[10px] text-muted-foreground">Radar Cov.</div>
              </div>
              <div
                className={`rounded-lg border p-2 text-center ${
                  stats.suspicious > 0 ? "border-destructive/50 bg-destructive/10" : "border-border bg-muted/50"
                }`}
              >
                <div
                  className={`text-lg font-bold tabular-nums ${
                    stats.suspicious > 0 ? "text-destructive" : ""
                  }`}
                >
                  {stats.suspicious}
                </div>
                <div className="text-[10px] text-muted-foreground">Suspicious</div>
              </div>
            </div>
          </div>
        </MapPanelContent>
      </MapPanel>
    </>
  );
}

export function DefenseMaritimeCard() {
  const { resolvedTheme } = useTheme();
  return (
    <div className="relative h-full w-full min-h-[300px]">
      <Map center={[73.5, 14.5]} zoom={6} theme={resolvedTheme === "dark" ? "dark" : "light"}>
        <MaritimeInner />
      </Map>
    </div>
  );
}
