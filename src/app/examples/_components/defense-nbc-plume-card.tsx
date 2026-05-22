"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Atom, Bug, FlaskConical, Trash2, ArrowUp } from "lucide-react";
import { Map, useMap } from "@/registry/map";
import { MapPanel, MapPanelHeader, MapPanelTitle, MapPanelContent } from "@/registry/map-ui";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { PolygonLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";

type HazardType = "nuclear" | "biological" | "chemical";
type DangerLevel = "lethal" | "danger" | "caution";

interface HazardSource {
  position: [number, number];
  type: HazardType;
  placedAt: number;
}

interface PlumeZone {
  level: DangerLevel;
  polygon: [number, number][];
  color: [number, number, number, number];
  label: string;
}

const EARTH_RADIUS = 6371000;

const ZONE_CONFIGS: {
  level: DangerLevel;
  maxRange: number;
  coneWidth: number;
  color: [number, number, number, number];
  label: string;
}[] = [
  { level: "lethal", maxRange: 2000, coneWidth: 30, color: [220, 38, 38, 140], label: "LETHAL (0-2 km)" },
  { level: "danger", maxRange: 5000, coneWidth: 45, color: [249, 115, 22, 100], label: "DANGER (0-5 km)" },
  { level: "caution", maxRange: 10000, coneWidth: 60, color: [234, 179, 8, 70], label: "CAUTION (0-10 km)" },
];

const SIMULATION_DURATION = 60;

function destinationPoint(origin: [number, number], distanceMeters: number, bearingDeg: number): [number, number] {
  const lat1 = (origin[1] * Math.PI) / 180;
  const lon1 = (origin[0] * Math.PI) / 180;
  const brng = (bearingDeg * Math.PI) / 180;
  const d = distanceMeters / EARTH_RADIUS;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
  const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return [(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI];
}

function generatePlumeZone(
  source: [number, number],
  windBearing: number,
  maxRange: number,
  coneWidth: number,
  expansion: number,
): [number, number][] {
  const range = maxRange * expansion;
  if (range < 10) return [source, source, source];
  const halfCone = coneWidth / 2;
  const points: [number, number][] = [source];
  for (let i = 0; i <= 24; i++) {
    const angle = windBearing - halfCone + (halfCone * 2 * i) / 24;
    points.push(destinationPoint(source, range, angle));
  }
  points.push(source);
  return points;
}

function computeAreaKm2(expansion: number): number {
  let totalArea = 0;
  for (const zone of ZONE_CONFIGS) {
    const range = (zone.maxRange * expansion) / 1000;
    const coneRad = (zone.coneWidth * Math.PI) / 180;
    totalArea = Math.max(totalArea, 0.5 * range * range * coneRad);
  }
  return Math.round(totalArea * 100) / 100;
}

interface PlumeLayersProps {
  source: HazardSource | null;
  plumeZones: PlumeZone[];
}

function PlumeLayers({ source, plumeZones }: PlumeLayersProps) {
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

    const zoneLayer = new PolygonLayer({
      id: "nbc-plume-zones",
      data: plumeZones,
      getPolygon: (d: PlumeZone) => d.polygon,
      getFillColor: (d: PlumeZone) => d.color,
      getLineColor: (d: PlumeZone) => [d.color[0], d.color[1], d.color[2], 200] as [number, number, number, number],
      lineWidthMinPixels: 2,
      filled: true,
      stroked: true,
    });

    const sourceData = source ? [{ position: source.position }] : [];
    const sourceLayer = new ScatterplotLayer({
      id: "nbc-source-point",
      data: sourceData,
      getPosition: (d: { position: [number, number] }) => d.position,
      getFillColor: [220, 38, 38],
      getRadius: 10,
      radiusUnits: "pixels",
      stroked: true,
      getLineColor: [255, 255, 255, 230],
      lineWidthMinPixels: 3,
    });

    const labelData = plumeZones.map((zone) => {
      const poly = zone.polygon;
      const midIdx = Math.floor(poly.length / 2);
      return { position: poly[midIdx] ?? poly[0], text: zone.label };
    });

    const labelLayer = new TextLayer({
      id: "nbc-zone-labels",
      data: labelData,
      getPosition: (d) => d.position,
      getText: (d) => d.text,
      getColor: [255, 255, 255, 230],
      getSize: 11,
      fontFamily: "monospace",
      fontWeight: 700,
      outlineWidth: 3,
      outlineColor: [0, 0, 0, 200],
      billboard: true,
    });

    try {
      overlay.setProps({ layers: [zoneLayer, sourceLayer, labelLayer] });
    } catch {}
  }, [source, plumeZones]);

  return null;
}

function MapClickHandler({ onClick }: { onClick: (lngLat: [number, number]) => void }) {
  const { map, isLoaded } = useMap();
  useEffect(() => {
    if (!map || !isLoaded) return;
    const handler = (e: maplibregl.MapMouseEvent) => onClick([e.lngLat.lng, e.lngLat.lat]);
    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [map, isLoaded, onClick]);
  return null;
}

const HAZARD_TYPES: { type: HazardType; label: string; Icon: typeof Atom }[] = [
  { type: "nuclear", label: "Nuclear", Icon: Atom },
  { type: "biological", label: "Bio", Icon: Bug },
  { type: "chemical", label: "Chemical", Icon: FlaskConical },
];

const ZONE_LEGEND: { level: DangerLevel; label: string; cls: string }[] = [
  { level: "lethal", label: "Lethal (0-2 km)", cls: "bg-red-600" },
  { level: "danger", label: "Danger (0-5 km)", cls: "bg-orange-500" },
  { level: "caution", label: "Caution (0-10 km)", cls: "bg-yellow-500" },
];

function NbcPlumeInner() {
  const [source, setSource] = useState<HazardSource | null>(null);
  const [windDirection, setWindDirection] = useState(225);
  const [windSpeed, setWindSpeed] = useState(8);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [hazardType, setHazardType] = useState<HazardType>("chemical");

  useEffect(() => {
    if (!isSimulating) return;
    const id = setInterval(() => {
      setElapsedTime((t) => {
        if (t >= SIMULATION_DURATION) {
          setIsSimulating(false);
          return t;
        }
        return t + 0.5;
      });
    }, 50);
    return () => clearInterval(id);
  }, [isSimulating]);

  const expansion = Math.min(elapsedTime / SIMULATION_DURATION, 1);

  const plumeZones = useMemo<PlumeZone[]>(() => {
    if (!source || expansion <= 0) return [];
    return ZONE_CONFIGS.map((z) => ({
      level: z.level,
      polygon: generatePlumeZone(source.position, windDirection, z.maxRange, z.coneWidth, expansion),
      color: z.color,
      label: z.label,
    })).reverse();
  }, [source, windDirection, expansion]);

  const placeSource = (lngLat: [number, number]) => {
    setSource({ position: lngLat, type: hazardType, placedAt: Date.now() });
    setElapsedTime(0);
    setIsSimulating(true);
  };

  const reset = () => {
    setIsSimulating(false);
    setSource(null);
    setElapsedTime(0);
  };

  const windCardinal = (() => {
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return dirs[Math.round(windDirection / 45) % 8];
  })();

  const elapsedSeconds = Math.round(elapsedTime);
  const elapsedDisplay = (() => {
    const m = Math.floor(elapsedSeconds / 60);
    const s = elapsedSeconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  })();
  const progressPercent = Math.round(expansion * 100);
  const affectedAreaKm2 = source ? computeAreaKm2(expansion) : 0;

  return (
    <>
      <PlumeLayers source={source} plumeZones={plumeZones} />
      <MapClickHandler onClick={placeSource} />

      <MapPanel className="absolute top-3 right-3 w-[230px]">
        <MapPanelHeader>
          <MapPanelTitle>NBC Plume</MapPanelTitle>
        </MapPanelHeader>
        <MapPanelContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Hazard Type</h3>
            <div className="flex gap-1">
              {HAZARD_TYPES.map(({ type, label, Icon }) => (
                <button
                  key={type}
                  onClick={() => setHazardType(type)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                    hazardType === type
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">
              Wind Direction: {windDirection}&deg; {windCardinal}
            </h3>
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={windDirection}
              onChange={(e) => setWindDirection(Number(e.target.value))}
              className="w-full h-1 accent-primary"
            />
            <div className="flex items-center justify-center">
              <div className="relative flex size-12 items-center justify-center rounded-full border border-border bg-muted/50">
                <div className="absolute text-[8px] text-muted-foreground -top-0.5">N</div>
                <div className="absolute text-[8px] text-muted-foreground -bottom-0.5">S</div>
                <div className="absolute text-[8px] text-muted-foreground -left-0.5">W</div>
                <div className="absolute text-[8px] text-muted-foreground -right-0.5">E</div>
                <div
                  className="size-5 text-destructive transition-transform"
                  style={{ transform: `rotate(${windDirection}deg)` }}
                >
                  <ArrowUp className="size-5" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Wind Speed: {windSpeed} m/s</h3>
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={windSpeed}
              onChange={(e) => setWindSpeed(Number(e.target.value))}
              className="w-full h-1 accent-primary"
            />
          </div>

          {source && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Simulation</h3>
              <div className="space-y-1.5 rounded-lg border border-border bg-muted/50 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Elapsed</span>
                  <span className="font-mono font-bold">{elapsedDisplay}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Expansion</span>
                  <span className="font-mono font-bold">{progressPercent}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-destructive transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Affected Area</span>
                  <span className="font-mono font-bold">{affectedAreaKm2} km&sup2;</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Danger Zones</h3>
            <div className="space-y-1">
              {ZONE_LEGEND.map((zone) => (
                <div key={zone.level} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={`size-2.5 shrink-0 rounded-full ${zone.cls}`} />
                  {zone.label}
                </div>
              ))}
            </div>
          </div>

          {source && (
            <button
              onClick={reset}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
            >
              <Trash2 className="size-3.5" />
              Clear
            </button>
          )}

          <p className="text-xs text-muted-foreground">
            Click on the map to place a hazard source. The plume will expand downwind based on wind direction and speed.
          </p>
        </MapPanelContent>
      </MapPanel>
    </>
  );
}

export function DefenseNbcPlumeCard() {
  const { resolvedTheme } = useTheme();
  return (
    <div className="relative h-full w-full min-h-[300px]">
      <Map center={[72.0, 26.3]} zoom={11} theme={resolvedTheme === "dark" ? "dark" : "light"}>
        <NbcPlumeInner />
      </Map>
    </div>
  );
}
