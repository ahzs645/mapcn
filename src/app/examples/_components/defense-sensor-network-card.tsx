"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Map, useMap } from "@/registry/map";
import {
  MapPanel,
  MapPanelContent,
  MapPanelHeader,
  MapPanelTitle,
} from "@/registry/map-ui";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { PolygonLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";

type SensorType = "acoustic" | "radar" | "lora" | "jammer";
type SensorStatus = "active" | "alert" | "maintenance";
type ThreatLevel = "low" | "medium" | "high" | "critical";

interface Sensor {
  id: string;
  name: string;
  type: SensorType;
  status: SensorStatus;
  position: [number, number];
  detectionRadius: number;
  color: [number, number, number, number];
}

interface ThreatEvent {
  id: string;
  timestamp: number;
  position: [number, number];
  level: ThreatLevel;
  description: string;
  detectedBy: string[];
}

interface CoverageZone {
  id: string;
  type: "friendly" | "adversary";
  polygon: [number, number][];
  label: string;
  color: [number, number, number, number];
}

interface SensorTypeConfig {
  type: SensorType;
  label: string;
  color: [number, number, number, number];
}

const SENSOR_TYPES: SensorTypeConfig[] = [
  { type: "acoustic", label: "Acoustic", color: [0, 200, 220, 200] },
  { type: "radar", label: "Radar", color: [0, 255, 100, 200] },
  { type: "lora", label: "LoRa Relay", color: [180, 100, 255, 200] },
  { type: "jammer", label: "Jammer", color: [255, 60, 60, 200] },
];

const INITIAL_SENSORS: Sensor[] = [
  { id: "AS-01", name: "Acoustic-01", type: "acoustic", status: "active", position: [93.3, 27.55], detectionRadius: 4, color: [0, 200, 220, 200] },
  { id: "AS-02", name: "Acoustic-02", type: "acoustic", status: "active", position: [93.4, 27.6], detectionRadius: 3.5, color: [0, 200, 220, 200] },
  { id: "AS-03", name: "Acoustic-03", type: "acoustic", status: "active", position: [93.5, 27.5], detectionRadius: 5, color: [0, 200, 220, 200] },
  { id: "AS-04", name: "Acoustic-04", type: "acoustic", status: "active", position: [93.6, 27.45], detectionRadius: 4, color: [0, 200, 220, 200] },
  { id: "AS-05", name: "Acoustic-05", type: "acoustic", status: "alert", position: [93.7, 27.55], detectionRadius: 3, color: [0, 200, 220, 200] },
  { id: "AS-06", name: "Acoustic-06", type: "acoustic", status: "active", position: [93.55, 27.65], detectionRadius: 4.5, color: [0, 200, 220, 200] },
  { id: "RAD-01", name: "Radar-01", type: "radar", status: "active", position: [93.35, 27.52], detectionRadius: 12, color: [0, 255, 100, 200] },
  { id: "RAD-02", name: "Radar-02", type: "radar", status: "active", position: [93.5, 27.58], detectionRadius: 15, color: [0, 255, 100, 200] },
  { id: "RAD-03", name: "Radar-03", type: "radar", status: "active", position: [93.65, 27.48], detectionRadius: 10, color: [0, 255, 100, 200] },
  { id: "RAD-04", name: "Radar-04", type: "radar", status: "maintenance", position: [93.45, 27.42], detectionRadius: 13, color: [0, 255, 100, 200] },
  { id: "LORA-01", name: "LoRa-01", type: "lora", status: "active", position: [93.3, 27.48], detectionRadius: 18, color: [180, 100, 255, 200] },
  { id: "LORA-02", name: "LoRa-02", type: "lora", status: "active", position: [93.5, 27.52], detectionRadius: 20, color: [180, 100, 255, 200] },
  { id: "LORA-03", name: "LoRa-03", type: "lora", status: "active", position: [93.7, 27.5], detectionRadius: 15, color: [180, 100, 255, 200] },
  { id: "LORA-04", name: "LoRa-04", type: "lora", status: "active", position: [93.55, 27.4], detectionRadius: 16, color: [180, 100, 255, 200] },
  { id: "JAM-01", name: "Jammer-01", type: "jammer", status: "active", position: [93.45, 27.55], detectionRadius: 8, color: [255, 60, 60, 200] },
  { id: "JAM-02", name: "Jammer-02", type: "jammer", status: "active", position: [93.6, 27.52], detectionRadius: 6, color: [255, 60, 60, 200] },
];

const COVERAGE_ZONES: CoverageZone[] = [
  {
    id: "zone-friendly",
    type: "friendly",
    polygon: [[93.2, 27.38], [93.8, 27.38], [93.8, 27.62], [93.2, 27.62], [93.2, 27.38]],
    label: "Sensor Deployment Zone",
    color: [60, 130, 246, 30],
  },
  {
    id: "zone-monitored",
    type: "adversary",
    polygon: [[93.2, 27.62], [93.8, 27.62], [93.8, 27.78], [93.2, 27.78], [93.2, 27.62]],
    label: "Monitored Border Zone",
    color: [250, 204, 21, 40],
  },
];

const THREAT_DESCRIPTIONS = [
  "Unidentified movement detected",
  "Signal anomaly intercepted",
  "Perimeter breach attempt",
  "Acoustic signature — vehicle",
  "Radar contact — low-altitude",
  "EM interference detected",
  "Personnel movement — group",
  "Drone signature detected",
];

function SensorOverlay({
  sensors,
  threats,
  coverageZones,
  radiusMultiplier,
  pulseTime,
}: {
  sensors: Sensor[];
  threats: ThreatEvent[];
  coverageZones: CoverageZone[];
  radiusMultiplier: number;
  pulseTime: number;
}) {
  const { map, isLoaded } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({ layers: [] });
      overlayRef.current = overlay;
      map.addControl(overlay as unknown as maplibregl.IControl);
    };

    if (map.isStyleLoaded()) addOverlay();
    else map.once("load", addOverlay);

    return () => {
      map.off("load", addOverlay);
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
    const pulse = 1 + 0.15 * Math.sin(pulseTime * 2);

    overlay.setProps({
      layers: [
        new PolygonLayer<CoverageZone>({
          id: "sensor-zones",
          data: coverageZones,
          getPolygon: (d) => d.polygon,
          getFillColor: (d) => d.color,
          getLineColor: (d) => [d.color[0], d.color[1], d.color[2], 140],
          getLineWidth: 2,
          lineWidthUnits: "pixels",
          filled: true,
          stroked: true,
          pickable: false,
        }),
        new ScatterplotLayer<Sensor>({
          id: "sensor-detection",
          data: sensors,
          getPosition: (d) => d.position,
          getRadius: (d) => d.detectionRadius * 1000 * radiusMultiplier * pulse,
          getFillColor: (d) => [d.color[0], d.color[1], d.color[2], 40],
          getLineColor: (d) => [d.color[0], d.color[1], d.color[2], 120],
          lineWidthMinPixels: 1,
          stroked: true,
          filled: true,
          radiusUnits: "meters",
          pickable: false,
          updateTriggers: { getRadius: [radiusMultiplier, pulseTime] },
        }),
        new ScatterplotLayer<Sensor>({
          id: "sensor-dots",
          data: sensors,
          getPosition: (d) => d.position,
          getRadius: 6,
          getFillColor: (d) => {
            if (d.status === "alert") return [255, 200, 0, 255];
            if (d.status === "maintenance") return [120, 120, 120, 255];
            return [d.color[0], d.color[1], d.color[2], 255];
          },
          radiusUnits: "pixels",
          filled: true,
          stroked: true,
          getLineColor: [255, 255, 255, 200],
          lineWidthMinPixels: 1,
          pickable: false,
        }),
        new TextLayer<Sensor>({
          id: "sensor-labels",
          data: sensors,
          getPosition: (d) => d.position,
          getText: (d) => d.id,
          getSize: 12,
          getColor: [30, 30, 30, 240],
          getTextAnchor: "middle",
          getAlignmentBaseline: "top",
          getPixelOffset: [0, 12],
          fontFamily: "monospace",
          fontWeight: "bold",
          outlineWidth: 2,
          outlineColor: [255, 255, 255, 220],
          pickable: false,
        }),
        new ScatterplotLayer<ThreatEvent>({
          id: "sensor-threats",
          data: threats,
          getPosition: (d) => d.position,
          getRadius: 500,
          getFillColor: (d) => {
            const age = (Date.now() - d.timestamp) / 1000;
            const opacity = Math.max(60, 255 - age * 8);
            if (d.level === "critical") return [255, 0, 0, opacity];
            if (d.level === "high") return [255, 100, 0, opacity];
            if (d.level === "medium") return [255, 180, 0, opacity];
            return [255, 220, 100, opacity];
          },
          radiusUnits: "meters",
          filled: true,
          stroked: true,
          getLineColor: [255, 80, 80, 200],
          lineWidthMinPixels: 2,
          pickable: true,
          updateTriggers: { getFillColor: [pulseTime] },
        }),
      ],
    });
  }, [sensors, threats, coverageZones, radiusMultiplier, pulseTime]);

  return null;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}

function levelDot(level: ThreatLevel): string {
  if (level === "critical") return "bg-red-500";
  if (level === "high") return "bg-orange-500";
  if (level === "medium") return "bg-amber-500";
  return "bg-yellow-400";
}

function levelText(level: ThreatLevel): string {
  if (level === "critical") return "text-red-600 dark:text-red-400";
  if (level === "high") return "text-orange-600 dark:text-orange-400";
  if (level === "medium") return "text-amber-600 dark:text-amber-400";
  return "text-yellow-600 dark:text-yellow-300";
}

export function DefenseSensorNetworkCard() {
  const [activeTypes, setActiveTypes] = useState<Set<SensorType>>(
    new Set(["acoustic", "radar", "lora", "jammer"]),
  );
  const [radiusMultiplier, setRadiusMultiplier] = useState(1);
  const [pulseTime, setPulseTime] = useState(0);
  const [threats, setThreats] = useState<ThreatEvent[]>([]);

  useEffect(() => {
    let frame = 0;
    let start: number | null = null;
    const tick = (ts: number) => {
      if (!start) start = ts;
      setPulseTime((ts - start) / 1000);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const filteredSensors = useMemo(
    () => INITIAL_SENSORS.filter((s) => activeTypes.has(s.type)),
    [activeTypes],
  );

  const filteredSensorsRef = useRef(filteredSensors);
  const radiusRef = useRef(radiusMultiplier);
  useEffect(() => {
    filteredSensorsRef.current = filteredSensors;
  }, [filteredSensors]);
  useEffect(() => {
    radiusRef.current = radiusMultiplier;
  }, [radiusMultiplier]);

  useEffect(() => {
    const interval = setInterval(
      () => {
        const centerLng = 93.5 + (Math.random() - 0.5) * 0.5;
        const centerLat = 27.55 + (Math.random() - 0.3) * 0.3;
        const levels: ThreatLevel[] = ["low", "medium", "high", "critical"];
        const level = levels[Math.floor(Math.random() * levels.length)]!;
        const nearby = filteredSensorsRef.current
          .filter((s) => {
            const dx = s.position[0] - centerLng;
            const dy = s.position[1] - centerLat;
            const distKm = Math.sqrt(dx * dx + dy * dy) * 111;
            return distKm < s.detectionRadius * radiusRef.current;
          })
          .map((s) => s.id);
        const threat: ThreatEvent = {
          id: `threat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          position: [centerLng, centerLat],
          level,
          description:
            THREAT_DESCRIPTIONS[
              Math.floor(Math.random() * THREAT_DESCRIPTIONS.length)
            ]!,
          detectedBy: nearby,
        };
        setThreats((prev) => [threat, ...prev].slice(0, 10));
      },
      3500,
    );
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const active = filteredSensors.filter(
      (s) => s.status === "active" || s.status === "alert",
    );
    return {
      totalSensors: filteredSensors.length,
      activeSensors: active.length,
      alertCount: threats.length,
      coveragePercent:
        filteredSensors.length > 0
          ? Math.round((active.length / INITIAL_SENSORS.length) * 100)
          : 0,
    };
  }, [filteredSensors, threats.length]);

  const toggleType = (t: SensorType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  return (
    <div className="relative h-full w-full min-h-[300px]">
      <Map center={[93.5, 27.5]} zoom={9} theme="dark">
        <SensorOverlay
          sensors={filteredSensors}
          threats={threats}
          coverageZones={COVERAGE_ZONES}
          radiusMultiplier={radiusMultiplier}
          pulseTime={pulseTime}
        />
      </Map>

      <MapPanel className="absolute top-3 left-3 z-10 w-64">
        <MapPanelHeader>
          <MapPanelTitle>Sensor Network</MapPanelTitle>
        </MapPanelHeader>
        <MapPanelContent className="space-y-3">
          <div className="rounded-md border bg-card p-2.5">
            <h3 className="mb-2 text-xs font-semibold">Sensor Types</h3>
            <div className="space-y-1">
              {SENSOR_TYPES.map((st) => {
                const on = activeTypes.has(st.type);
                return (
                  <button
                    key={st.type}
                    onClick={() => toggleType(st.type)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors hover:bg-accent ${on ? "" : "opacity-40"}`}
                  >
                    <span
                      className="size-2.5 rounded-full"
                      style={{
                        backgroundColor: `rgb(${st.color[0]}, ${st.color[1]}, ${st.color[2]})`,
                      }}
                    />
                    <span className="flex-1 text-left">{st.label}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {on ? "on" : "off"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-md border bg-card p-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold">Detection Range</span>
              <span className="text-[10px] text-muted-foreground">
                {radiusMultiplier.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.1}
              value={radiusMultiplier}
              onChange={(e) => setRadiusMultiplier(Number(e.target.value))}
              className="w-full h-1 accent-primary"
            />
          </div>

          <div className="rounded-md border bg-card p-2.5">
            <h3 className="mb-1.5 text-xs font-semibold">Network Status</h3>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div className="rounded bg-muted/50 p-1.5 text-center">
                <div className="text-base font-bold text-foreground">
                  {stats.totalSensors}
                </div>
                <div className="text-muted-foreground">Total</div>
              </div>
              <div className="rounded bg-muted/50 p-1.5 text-center">
                <div className="text-base font-bold text-green-500">
                  {stats.activeSensors}
                </div>
                <div className="text-muted-foreground">Active</div>
              </div>
              <div className="rounded bg-muted/50 p-1.5 text-center">
                <div className="text-base font-bold text-amber-500">
                  {stats.alertCount}
                </div>
                <div className="text-muted-foreground">Threats</div>
              </div>
              <div className="rounded bg-muted/50 p-1.5 text-center">
                <div className="text-base font-bold text-primary">
                  {stats.coveragePercent}%
                </div>
                <div className="text-muted-foreground">Coverage</div>
              </div>
            </div>
          </div>
        </MapPanelContent>
      </MapPanel>

      {threats.length > 0 && (
        <div className="absolute inset-x-0 bottom-10 z-10 overflow-hidden border-t border-border/30 bg-background/90 py-1 font-mono text-[11px] backdrop-blur-sm">
          <div className="flex animate-[sensor-marquee_30s_linear_infinite] items-center gap-6 whitespace-nowrap">
            {[...threats, ...threats].map((threat, i) => (
              <span
                key={`${threat.id}-${i}`}
                className="flex items-center gap-1.5"
              >
                <span
                  className={`inline-block size-1.5 animate-pulse rounded-full ${levelDot(threat.level)}`}
                />
                <span
                  className={`font-bold uppercase ${levelText(threat.level)}`}
                >
                  [{threat.level}]
                </span>
                <span className="text-foreground">{threat.description}</span>
                <span className="text-muted-foreground">
                  &mdash; {timeAgo(threat.timestamp)}
                </span>
              </span>
            ))}
          </div>
          <style>{`@keyframes sensor-marquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }`}</style>
        </div>
      )}
    </div>
  );
}
