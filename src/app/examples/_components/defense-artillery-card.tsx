"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Map, useMap } from "@/registry/map";
import {
  MapPanel,
  MapPanelHeader,
  MapPanelTitle,
  MapPanelContent,
} from "@/registry/map-ui";
import { Target, CircleDot, Rocket, X, Trash2 } from "lucide-react";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { PolygonLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import type { Map as MapLibreMap, IControl, MapMouseEvent } from "maplibre-gl";

type WeaponType = "howitzer" | "mortar" | "mlrs";
type RGB = [number, number, number];
type RGBA = [number, number, number, number];

type WeaponConfig = {
  type: WeaponType;
  label: string;
  minRange: number;
  maxRange: number;
  color: RGB;
  defaultArcWidth: number;
};

type ArtilleryPosition = {
  id: string;
  position: [number, number];
  weaponType: WeaponType;
  bearing: number;
  arcWidth: number;
  minRange: number;
  maxRange: number;
  label: string;
};

type RangeFanPolygon = {
  positionId: string;
  polygon: [number, number][];
  color: RGBA;
};

type ArtilleryPositionDatum = {
  lng: number;
  lat: number;
  positionId: string;
  color: RGB;
  selected: boolean;
};

const EARTH_RADIUS = 6371000;
const MAX_POSITIONS = 6;
const NATO_LABELS = ["ALPHA", "BRAVO", "CHARLIE", "DELTA", "ECHO", "FOXTROT"];

const WEAPON_CONFIGS: WeaponConfig[] = [
  { type: "howitzer", label: "Howitzer", minRange: 4000, maxRange: 30000, color: [255, 100, 0], defaultArcWidth: 60 },
  { type: "mortar", label: "Mortar", minRange: 500, maxRange: 7000, color: [0, 200, 255], defaultArcWidth: 360 },
  { type: "mlrs", label: "MLRS", minRange: 15000, maxRange: 70000, color: [255, 60, 60], defaultArcWidth: 45 },
];

const WEAPON_ICONS: Record<WeaponType, React.ComponentType<{ className?: string }>> = {
  howitzer: Target,
  mortar: CircleDot,
  mlrs: Rocket,
};

const WEAPON_DOT_COLORS: Record<WeaponType, string> = {
  howitzer: "bg-orange-500",
  mortar: "bg-cyan-500",
  mlrs: "bg-red-500",
};

function destinationPoint(origin: [number, number], distanceMeters: number, bearingDeg: number): [number, number] {
  const lat1 = (origin[1] * Math.PI) / 180;
  const lon1 = (origin[0] * Math.PI) / 180;
  const brng = (bearingDeg * Math.PI) / 180;
  const d = distanceMeters / EARTH_RADIUS;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
  const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return [(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI];
}

function generateRangeFan(
  center: [number, number],
  bearing: number,
  arcWidth: number,
  minRange: number,
  maxRange: number,
  numPoints: number = 36,
): [number, number][] {
  const startAngle = bearing - arcWidth / 2;
  const endAngle = bearing + arcWidth / 2;
  const polygon: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const angle = startAngle + ((endAngle - startAngle) * i) / numPoints;
    polygon.push(destinationPoint(center, maxRange, angle));
  }
  for (let i = numPoints; i >= 0; i--) {
    const angle = startAngle + ((endAngle - startAngle) * i) / numPoints;
    polygon.push(destinationPoint(center, minRange, angle));
  }
  polygon.push(polygon[0]!);
  return polygon;
}

function getWeaponConfig(type: WeaponType): WeaponConfig {
  return WEAPON_CONFIGS.find((c) => c.type === type) ?? WEAPON_CONFIGS[0]!;
}

function createInitialPositions(): ArtilleryPosition[] {
  return [
    { id: "pos-1", position: [71.85, 26.95], weaponType: "howitzer", bearing: 180, arcWidth: 60, minRange: 4000, maxRange: 30000, label: "ALPHA-1" },
    { id: "pos-2", position: [71.95, 26.85], weaponType: "mortar", bearing: 90, arcWidth: 360, minRange: 500, maxRange: 7000, label: "BRAVO-1" },
    { id: "pos-3", position: [71.8, 26.8], weaponType: "mlrs", bearing: 45, arcWidth: 45, minRange: 15000, maxRange: 70000, label: "CHARLIE-1" },
  ];
}

function ArtilleryDeckOverlay({
  rangeFans,
  positions,
  selectedId,
  onMapClick,
}: {
  rangeFans: RangeFanPolygon[];
  positions: ArtilleryPosition[];
  selectedId: string | null;
  onMapClick: (lngLat: [number, number]) => void;
}) {
  const { map, isLoaded } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const clickCb = useRef(onMapClick);
  useEffect(() => {
    clickCb.current = onMapClick;
  });

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;
    const handler = (e: MapMouseEvent) => {
      clickCb.current([e.lngLat.lng, e.lngLat.lat]);
    };
    const addOverlay = () => {
      overlay = new MapboxOverlay({ layers: [] });
      overlayRef.current = overlay;
      (map as MapLibreMap).addControl(overlay as unknown as IControl);
    };
    if (map.isStyleLoaded()) addOverlay();
    else map.once("load", addOverlay);
    map.on("click", handler);
    return () => {
      map.off("load", addOverlay);
      map.off("click", handler);
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

    const positionData: ArtilleryPositionDatum[] = positions.map((pos) => {
      const c = getWeaponConfig(pos.weaponType).color;
      return {
        lng: pos.position[0],
        lat: pos.position[1],
        positionId: pos.id,
        color: c,
        selected: pos.id === selectedId,
      };
    });

    const labelData = positions.map((p) => ({ position: p.position, text: p.label }));

    overlay.setProps({
      layers: [
        new PolygonLayer<RangeFanPolygon>({
          id: "artillery-fans",
          data: rangeFans,
          getPolygon: (d) => d.polygon,
          getFillColor: (d) => d.color,
          getLineColor: (d) => [d.color[0], d.color[1], d.color[2], 180],
          lineWidthMinPixels: 2,
          filled: true,
          stroked: true,
          pickable: false,
          opacity: 1,
        }),
        new ScatterplotLayer<ArtilleryPositionDatum>({
          id: "artillery-positions",
          data: positionData,
          getPosition: (d) => [d.lng, d.lat],
          getFillColor: (d) => [d.color[0], d.color[1], d.color[2], 220],
          getRadius: (d) => (d.selected ? 12 : 8),
          radiusUnits: "pixels",
          stroked: true,
          getLineColor: [255, 255, 255, 200],
          lineWidthMinPixels: 2,
          pickable: true,
        }),
        new TextLayer<{ position: [number, number]; text: string }>({
          id: "artillery-labels",
          data: labelData,
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
        }),
      ],
    });
  }, [rangeFans, positions, selectedId]);

  return null;
}

export function DefenseArtilleryCard() {
  const [positions, setPositions] = useState<ArtilleryPosition[]>(createInitialPositions);
  const [selectedId, setSelectedId] = useState<string | null>("pos-1");
  const [activeWeaponType, setActiveWeaponType] = useState<WeaponType>("howitzer");
  const nextIdRef = useRef(4);

  const rangeFans = useMemo<RangeFanPolygon[]>(
    () =>
      positions.map((pos) => {
        const c = getWeaponConfig(pos.weaponType).color;
        return {
          positionId: pos.id,
          polygon: generateRangeFan(pos.position, pos.bearing, pos.arcWidth, pos.minRange, pos.maxRange),
          color: [c[0], c[1], c[2], 50],
        };
      }),
    [positions],
  );

  const selectedPos = useMemo(
    () => positions.find((p) => p.id === selectedId) ?? null,
    [positions, selectedId],
  );

  const activeConfig = useMemo(
    () => WEAPON_CONFIGS.find((c) => c.type === activeWeaponType) ?? WEAPON_CONFIGS[0]!,
    [activeWeaponType],
  );

  const addPosition = (lngLat: [number, number]) => {
    setPositions((prev) => {
      if (prev.length >= MAX_POSITIONS) return prev;
      const config = getWeaponConfig(activeWeaponType);
      const labelIndex = prev.length;
      const nato = NATO_LABELS[labelIndex] ?? `UNIT-${labelIndex + 1}`;
      const id = `pos-${nextIdRef.current++}`;
      setSelectedId(id);
      return [
        ...prev,
        {
          id,
          position: lngLat,
          weaponType: activeWeaponType,
          bearing: 0,
          arcWidth: config.defaultArcWidth,
          minRange: config.minRange,
          maxRange: config.maxRange,
          label: `${nato}-1`,
        },
      ];
    });
  };

  const removePosition = (id: string) => {
    setPositions((prev) => prev.filter((p) => p.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  };

  const clearAll = () => {
    setPositions([]);
    setSelectedId(null);
  };

  const updateBearing = (bearing: number) => {
    if (!selectedId) return;
    setPositions((prev) =>
      prev.map((p) => (p.id === selectedId ? { ...p, bearing } : p)),
    );
  };

  return (
    <div className="relative h-full w-full min-h-[300px]">
      <Map center={[71.9, 26.9]} zoom={10}>
        <ArtilleryDeckOverlay
          rangeFans={rangeFans}
          positions={positions}
          selectedId={selectedId}
          onMapClick={addPosition}
        />
      </Map>

      <MapPanel className="absolute top-3 right-3 z-10 w-[280px]">
        <MapPanelHeader>
          <MapPanelTitle>Artillery</MapPanelTitle>
        </MapPanelHeader>
        <MapPanelContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Weapon Type</h3>
            <div className="flex gap-1">
              {WEAPON_CONFIGS.map((config) => {
                const Icon = WEAPON_ICONS[config.type];
                return (
                  <button
                    key={config.type}
                    onClick={() => setActiveWeaponType(config.type)}
                    className={
                      "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors " +
                      (activeWeaponType === config.type
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent")
                    }
                  >
                    <Icon className="size-3.5" />
                    {config.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Range: {(activeConfig.minRange / 1000).toFixed(1)}–
              {(activeConfig.maxRange / 1000).toFixed(0)} km
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">
              Positions{" "}
              <span className="text-muted-foreground">
                ({positions.length}/{MAX_POSITIONS})
              </span>
            </h3>
            <div className="space-y-1">
              {positions.map((pos) => (
                <button
                  key={pos.id}
                  onClick={() =>
                    setSelectedId((cur) => (cur === pos.id ? null : pos.id))
                  }
                  className={
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs transition-colors " +
                    (selectedId === pos.id
                      ? "bg-primary/15 text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground")
                  }
                >
                  <span className={"size-2.5 shrink-0 rounded-full " + WEAPON_DOT_COLORS[pos.weaponType]} />
                  <span className="font-mono font-bold">{pos.label}</span>
                  <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase">
                    {pos.weaponType}
                  </span>
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePosition(pos.id);
                    }}
                    className="ml-1 rounded p-0.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                  >
                    <X className="size-3" />
                  </span>
                </button>
              ))}
            </div>
          </div>

          {selectedPos && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Bearing: {selectedPos.bearing}°</h3>
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={selectedPos.bearing}
                onChange={(e) => updateBearing(Number(e.target.value))}
                className="w-full h-1 accent-primary"
              />
            </div>
          )}

          {positions.length > 0 && (
            <button
              onClick={clearAll}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
            >
              <Trash2 className="size-3.5" />
              Clear All
            </button>
          )}

          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              Click on the map to place artillery positions (max 6). Select a
              position to adjust its bearing.
            </p>
          </div>
        </MapPanelContent>
      </MapPanel>
    </div>
  );
}
