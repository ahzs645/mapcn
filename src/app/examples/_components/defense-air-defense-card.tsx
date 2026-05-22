"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Map, useMap } from "@/registry/map";
import {
  MapPanel,
  MapPanelHeader,
  MapPanelTitle,
  MapPanelContent,
} from "@/registry/map-ui";
import { Shield, ShieldHalf, ShieldCheck } from "lucide-react";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { PolygonLayer, ScatterplotLayer, LineLayer, TextLayer } from "@deck.gl/layers";
import type { Map as MapLibreMap, IControl } from "maplibre-gl";

type RadarTier = "shorad" | "mrsam" | "lrsam";
type AltitudeLayer = "low" | "mid" | "high";
type RGB = [number, number, number];
type RGBA = [number, number, number, number];

type RadarSite = {
  id: string;
  label: string;
  position: [number, number];
  tier: RadarTier;
  range: number;
  color: RGB;
};

type RadarTierConfig = {
  tier: RadarTier;
  label: string;
  range: number;
  color: RGB;
  altitudes: AltitudeLayer[];
};

type CoveragePolygon = {
  siteId: string;
  tier: RadarTier;
  polygon: [number, number][];
  color: RGBA;
};

type SweepLineDatum = {
  siteId: string;
  sourcePosition: [number, number];
  targetPosition: [number, number];
  color: RGBA;
};

type SiteDatum = {
  lng: number;
  lat: number;
  siteId: string;
  color: RGB;
  tier: RadarTier;
};

type SiteLabelDatum = {
  position: [number, number];
  text: string;
};

type AirDefenseStats = {
  totalSites: number;
  activeTiers: number;
  coverageAreaKm2: number;
  gapCount: number;
};

const EARTH_RADIUS = 6371000;
const COVERAGE_POINTS = 64;

const TIER_CONFIGS: RadarTierConfig[] = [
  { tier: "shorad", label: "SHORAD", range: 15, color: [0, 200, 255], altitudes: ["low"] },
  { tier: "mrsam", label: "MRSAM", range: 70, color: [0, 200, 100], altitudes: ["low", "mid"] },
  { tier: "lrsam", label: "LRSAM", range: 250, color: [255, 165, 0], altitudes: ["low", "mid", "high"] },
];

const INITIAL_SITES: RadarSite[] = [
  { id: "SHORAD-1", label: "SHORAD-1", position: [70.8, 26.95], tier: "shorad", range: 15, color: [0, 200, 255] },
  { id: "SHORAD-2", label: "SHORAD-2", position: [71.05, 26.85], tier: "shorad", range: 15, color: [0, 200, 255] },
  { id: "MRSAM-1", label: "MRSAM-1", position: [70.7, 26.8], tier: "mrsam", range: 70, color: [0, 200, 100] },
  { id: "MRSAM-2", label: "MRSAM-2", position: [71.1, 27.0], tier: "mrsam", range: 70, color: [0, 200, 100] },
  { id: "LRSAM-1", label: "LRSAM-1", position: [70.9, 26.9], tier: "lrsam", range: 250, color: [255, 165, 0] },
  { id: "LRSAM-2", label: "LRSAM-2", position: [71.0, 26.7], tier: "lrsam", range: 250, color: [255, 165, 0] },
];

function destinationPoint(origin: [number, number], distanceMeters: number, bearingDeg: number): [number, number] {
  const lat1 = (origin[1] * Math.PI) / 180;
  const lon1 = (origin[0] * Math.PI) / 180;
  const brng = (bearingDeg * Math.PI) / 180;
  const d = distanceMeters / EARTH_RADIUS;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
  const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return [(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI];
}

function generateCoverageCircle(center: [number, number], radiusKm: number): [number, number][] {
  const polygon: [number, number][] = [];
  const radiusMeters = radiusKm * 1000;
  for (let i = 0; i <= COVERAGE_POINTS; i++) {
    polygon.push(destinationPoint(center, radiusMeters, (360 * i) / COVERAGE_POINTS));
  }
  return polygon;
}

function getTierConfig(tier: RadarTier): RadarTierConfig {
  return TIER_CONFIGS.find((c) => c.tier === tier) ?? TIER_CONFIGS[0]!;
}

function tierCoversAltitude(tier: RadarTier, alt: AltitudeLayer): boolean {
  return getTierConfig(tier).altitudes.includes(alt);
}

function computeGapCount(sites: RadarSite[], activeTiers: Set<RadarTier>): number {
  const filtered = sites.filter((s) => activeTiers.has(s.tier));
  if (filtered.length <= 1) return filtered.length === 0 ? 1 : 0;
  let gaps = 0;
  for (let i = 0; i < filtered.length; i++) {
    let hasOverlap = false;
    for (let j = 0; j < filtered.length; j++) {
      if (i === j) continue;
      const a = filtered[i]!;
      const b = filtered[j]!;
      const dx = (a.position[0] - b.position[0]) * 111 * Math.cos((a.position[1] * Math.PI) / 180);
      const dy = (a.position[1] - b.position[1]) * 111;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < a.range + b.range) {
        hasOverlap = true;
        break;
      }
    }
    if (!hasOverlap) gaps++;
  }
  return gaps;
}

const TIER_ICONS: Record<RadarTier, React.ComponentType<{ className?: string }>> = {
  shorad: Shield,
  mrsam: ShieldHalf,
  lrsam: ShieldCheck,
};

const TIER_DOT_COLORS: Record<RadarTier, string> = {
  shorad: "bg-cyan-500",
  mrsam: "bg-emerald-500",
  lrsam: "bg-orange-500",
};

function AirDefenseDeckOverlay({
  coveragePolygons,
  sweepLines,
  siteData,
  labelData,
}: {
  coveragePolygons: CoveragePolygon[];
  sweepLines: SweepLineDatum[];
  siteData: SiteDatum[];
  labelData: SiteLabelDatum[];
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
    overlay.setProps({
      layers: [
        new PolygonLayer<CoveragePolygon>({
          id: "air-defense-coverage",
          data: coveragePolygons,
          getPolygon: (d) => d.polygon,
          getFillColor: (d) => d.color,
          getLineColor: (d) => [d.color[0], d.color[1], d.color[2], 120],
          lineWidthMinPixels: 1,
          filled: true,
          stroked: true,
          pickable: false,
          opacity: 1,
        }),
        new LineLayer<SweepLineDatum>({
          id: "air-defense-sweep",
          data: sweepLines,
          getSourcePosition: (d) => d.sourcePosition,
          getTargetPosition: (d) => d.targetPosition,
          getColor: (d) => d.color,
          getWidth: 2,
          widthUnits: "pixels",
          pickable: false,
        }),
        new ScatterplotLayer<SiteDatum>({
          id: "air-defense-sites",
          data: siteData,
          getPosition: (d) => [d.lng, d.lat],
          getFillColor: (d) => [d.color[0], d.color[1], d.color[2], 240],
          getRadius: 8,
          radiusUnits: "pixels",
          stroked: true,
          getLineColor: [255, 255, 255, 200],
          lineWidthMinPixels: 2,
          pickable: false,
        }),
        new TextLayer<SiteLabelDatum>({
          id: "air-defense-labels",
          data: labelData,
          getPosition: (d) => d.position,
          getText: (d) => d.text,
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
  }, [coveragePolygons, sweepLines, siteData, labelData]);

  return null;
}

export function DefenseAirDefenseCard() {
  const [activeAltitude, setActiveAltitude] = useState<AltitudeLayer | "all">("all");
  const [activeTiers, setActiveTiers] = useState<Set<RadarTier>>(
    () => new Set(["shorad", "mrsam", "lrsam"]),
  );
  const [sweepAngle, setSweepAngle] = useState(0);
  const [sweepSpeed, setSweepSpeed] = useState(1);

  useEffect(() => {
    let frame = 0;
    let last: number | null = null;
    const tick = (ts: number) => {
      if (last === null) last = ts;
      const delta = (ts - last) / 1000;
      last = ts;
      setSweepAngle((a) => (a + delta * 30 * sweepSpeed) % 360);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [sweepSpeed]);

  const filteredSites = useMemo(
    () =>
      INITIAL_SITES.filter((site) => {
        if (!activeTiers.has(site.tier)) return false;
        if (activeAltitude === "all") return true;
        return tierCoversAltitude(site.tier, activeAltitude);
      }),
    [activeAltitude, activeTiers],
  );

  const coveragePolygons = useMemo<CoveragePolygon[]>(
    () =>
      filteredSites.map((site) => {
        const config = getTierConfig(site.tier);
        const opacityMap: Record<RadarTier, number> = { shorad: 60, mrsam: 40, lrsam: 25 };
        return {
          siteId: site.id,
          tier: site.tier,
          polygon: generateCoverageCircle(site.position, site.range),
          color: [config.color[0], config.color[1], config.color[2], opacityMap[site.tier]],
        };
      }),
    [filteredSites],
  );

  const sweepLines = useMemo<SweepLineDatum[]>(
    () =>
      filteredSites.map((site) => {
        const end = destinationPoint(site.position, site.range * 1000, sweepAngle);
        const config = getTierConfig(site.tier);
        return {
          siteId: site.id,
          sourcePosition: site.position,
          targetPosition: end,
          color: [config.color[0], config.color[1], config.color[2], 180],
        };
      }),
    [filteredSites, sweepAngle],
  );

  const siteData = useMemo<SiteDatum[]>(
    () =>
      filteredSites.map((s) => ({
        lng: s.position[0],
        lat: s.position[1],
        siteId: s.id,
        color: s.color,
        tier: s.tier,
      })),
    [filteredSites],
  );

  const labelData = useMemo<SiteLabelDatum[]>(
    () => filteredSites.map((s) => ({ position: s.position, text: s.label })),
    [filteredSites],
  );

  const stats = useMemo<AirDefenseStats>(
    () => ({
      totalSites: filteredSites.length,
      activeTiers: activeTiers.size,
      coverageAreaKm2: Math.round(
        filteredSites.reduce((acc, s) => acc + Math.PI * s.range * s.range, 0),
      ),
      gapCount: computeGapCount(INITIAL_SITES, activeTiers),
    }),
    [filteredSites, activeTiers],
  );

  const toggleTier = (tier: RadarTier) => {
    setActiveTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      return next;
    });
  };

  const altitudeOptions: { value: AltitudeLayer | "all"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "low", label: "Low" },
    { value: "mid", label: "Mid" },
    { value: "high", label: "High" },
  ];

  return (
    <div className="relative h-full w-full min-h-[300px]">
      <Map center={[70.9, 26.9]} zoom={8}>
        <AirDefenseDeckOverlay
          coveragePolygons={coveragePolygons}
          sweepLines={sweepLines}
          siteData={siteData}
          labelData={labelData}
        />
      </Map>

      <MapPanel className="absolute top-3 right-3 z-10 w-[260px]">
        <MapPanelHeader>
          <MapPanelTitle>Air Defense</MapPanelTitle>
        </MapPanelHeader>
        <MapPanelContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Altitude Layer</h3>
            <div className="flex gap-1">
              {altitudeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setActiveAltitude(opt.value)}
                  className={
                    "flex flex-1 items-center justify-center rounded-md px-2 py-1.5 text-xs font-medium transition-colors " +
                    (activeAltitude === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent")
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Radar Tiers</h3>
            <div className="space-y-1">
              {TIER_CONFIGS.map((config) => {
                const Icon = TIER_ICONS[config.tier];
                const active = activeTiers.has(config.tier);
                return (
                  <button
                    key={config.tier}
                    onClick={() => toggleTier(config.tier)}
                    className={
                      "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs transition-colors " +
                      (active
                        ? "bg-primary/15 text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground")
                    }
                  >
                    <span className={"size-2.5 shrink-0 rounded-full " + TIER_DOT_COLORS[config.tier]} />
                    <Icon className="size-3.5" />
                    <span className="font-mono font-bold">{config.label}</span>
                    <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                      {config.range} km
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Sweep Speed: {sweepSpeed}x</h3>
            <input
              type="range"
              min={0.5}
              max={4}
              step={0.5}
              value={sweepSpeed}
              onChange={(e) => setSweepSpeed(Number(e.target.value))}
              className="w-full h-1 accent-primary"
            />
          </div>

          <div className="space-y-1.5 rounded-lg border border-border bg-muted/50 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Stats
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Sites</span>
                <p className="font-mono font-bold">{stats.totalSites}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Active Tiers</span>
                <p className="font-mono font-bold">{stats.activeTiers}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Coverage</span>
                <p className="font-mono font-bold">{stats.coverageAreaKm2.toLocaleString()} km²</p>
              </div>
              <div>
                <span className="text-muted-foreground">Gaps</span>
                <p className="font-mono font-bold">{stats.gapCount}</p>
              </div>
            </div>
          </div>
        </MapPanelContent>
      </MapPanel>
    </div>
  );
}
