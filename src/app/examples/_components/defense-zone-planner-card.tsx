"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Map, useMap } from "@/registry/map";
import {
  MapPanel,
  MapPanelContent,
  MapPanelHeader,
  MapPanelTitle,
} from "@/registry/map-ui";
import { MapboxOverlay } from "@deck.gl/mapbox";
import type { Layer } from "@deck.gl/core";
import {
  PathLayer,
  PolygonLayer,
  ScatterplotLayer,
  TextLayer,
} from "@deck.gl/layers";

type ZoneType = "minefield" | "restricted" | "hazard";
type DrawMode = "polygon" | "rectangle" | "select" | "static";

interface DangerZone {
  id: string;
  type: ZoneType;
  label: string;
  polygon: [number, number][];
  areaKm2: number;
  color: [number, number, number, number];
}

const ZONE_COLORS: Record<ZoneType, [number, number, number, number]> = {
  minefield: [255, 60, 60, 60],
  restricted: [255, 165, 0, 60],
  hazard: [255, 200, 0, 60],
};

const OUTLINE_COLORS: Record<ZoneType, [number, number, number]> = {
  minefield: [255, 60, 60],
  restricted: [255, 165, 0],
  hazard: [255, 200, 0],
};

const ZONE_TYPE_OPTIONS: { value: ZoneType; label: string; dot: string }[] = [
  { value: "minefield", label: "Minefield", dot: "bg-red-500" },
  { value: "restricted", label: "Restricted", dot: "bg-orange-500" },
  { value: "hazard", label: "Hazard", dot: "bg-yellow-500" },
];

const DRAW_MODES: { value: DrawMode; label: string; icon: string }[] = [
  { value: "polygon", label: "Polygon", icon: "⬠" },
  { value: "rectangle", label: "Rectangle", icon: "▭" },
  { value: "select", label: "Select", icon: "↖" },
  { value: "static", label: "View", icon: "👁" },
];

function computeAreaKm2(polygon: [number, number][]): number {
  if (polygon.length < 4) return 0;
  const toRad = Math.PI / 180;
  const R = 6371;
  let area = 0;
  for (let i = 0; i < polygon.length - 1; i++) {
    const [lng1, lat1] = polygon[i]!;
    const [lng2, lat2] = polygon[i + 1]!;
    area +=
      (lng2 - lng1) *
      toRad *
      (2 + Math.sin(lat1 * toRad) + Math.sin(lat2 * toRad));
  }
  return Math.abs((area * R * R) / 2);
}

function polygonCentroid(polygon: [number, number][]): [number, number] {
  const pts =
    polygon.length > 1 && polygon[0]![0] === polygon[polygon.length - 1]![0]
      ? polygon.slice(0, -1)
      : polygon;
  let cx = 0;
  let cy = 0;
  for (const [x, y] of pts) {
    cx += x;
    cy += y;
  }
  return [cx / pts.length, cy / pts.length];
}

const PRESET_ZONES_RAW: Omit<DangerZone, "areaKm2">[] = [
  {
    id: "preset-alpha",
    type: "minefield",
    label: "Minefield Alpha",
    polygon: [
      [71.35, 26.62],
      [71.42, 26.65],
      [71.45, 26.6],
      [71.4, 26.56],
      [71.35, 26.62],
    ],
    color: ZONE_COLORS.minefield,
  },
  {
    id: "preset-bravo",
    type: "restricted",
    label: "Restricted Zone Bravo",
    polygon: [
      [71.55, 26.52],
      [71.65, 26.55],
      [71.68, 26.48],
      [71.58, 26.45],
      [71.55, 26.52],
    ],
    color: ZONE_COLORS.restricted,
  },
  {
    id: "preset-charlie",
    type: "hazard",
    label: "Hazard Area Charlie",
    polygon: [
      [71.45, 26.32],
      [71.55, 26.35],
      [71.58, 26.28],
      [71.48, 26.25],
      [71.45, 26.32],
    ],
    color: ZONE_COLORS.hazard,
  },
];

const PRESET_ZONES: DangerZone[] = PRESET_ZONES_RAW.map((z) => ({
  ...z,
  areaKm2: computeAreaKm2(z.polygon),
}));

function ZoneOverlay({
  zones,
  drawPoints,
  rectStart,
  rectEnd,
  drawMode,
  activeZoneType,
  onMapClick,
  onMapMouseMove,
  onMapDblClick,
  onMapMouseDown,
  onMapMouseUp,
}: {
  zones: DangerZone[];
  drawPoints: [number, number][];
  rectStart: [number, number] | null;
  rectEnd: [number, number] | null;
  drawMode: DrawMode;
  activeZoneType: ZoneType;
  onMapClick: (pos: [number, number]) => void;
  onMapMouseMove: (pos: [number, number]) => void;
  onMapDblClick: () => void;
  onMapMouseDown: (pos: [number, number]) => void;
  onMapMouseUp: () => void;
}) {
  const { map, isLoaded } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const handlersRef = useRef({
    onMapClick,
    onMapMouseMove,
    onMapDblClick,
    onMapMouseDown,
    onMapMouseUp,
    drawMode,
  });
  useEffect(() => {
    handlersRef.current = {
      onMapClick,
      onMapMouseMove,
      onMapDblClick,
      onMapMouseDown,
      onMapMouseUp,
      drawMode,
    };
  }, [
    onMapClick,
    onMapMouseMove,
    onMapDblClick,
    onMapMouseDown,
    onMapMouseUp,
    drawMode,
  ]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;
    const handleClick = (e: maplibregl.MapMouseEvent) => {
      handlersRef.current.onMapClick([e.lngLat.lng, e.lngLat.lat]);
    };
    const handleMove = (e: maplibregl.MapMouseEvent) => {
      handlersRef.current.onMapMouseMove([e.lngLat.lng, e.lngLat.lat]);
    };
    const handleDbl = () => handlersRef.current.onMapDblClick();
    const handleDown = (e: maplibregl.MapMouseEvent) => {
      if (handlersRef.current.drawMode === "rectangle") {
        e.preventDefault();
        handlersRef.current.onMapMouseDown([e.lngLat.lng, e.lngLat.lat]);
      }
    };
    const handleUp = () => {
      if (handlersRef.current.drawMode === "rectangle") {
        handlersRef.current.onMapMouseUp();
      }
    };
    const add = () => {
      overlay = new MapboxOverlay({ layers: [] });
      overlayRef.current = overlay;
      map.addControl(overlay as unknown as maplibregl.IControl);
    };
    if (map.isStyleLoaded()) add();
    else map.once("load", add);
    map.on("click", handleClick);
    map.on("mousemove", handleMove);
    map.on("dblclick", handleDbl);
    map.on("mousedown", handleDown);
    map.on("mouseup", handleUp);
    return () => {
      map.off("click", handleClick);
      map.off("mousemove", handleMove);
      map.off("dblclick", handleDbl);
      map.off("mousedown", handleDown);
      map.off("mouseup", handleUp);
      map.off("load", add);
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
    if (!map) return;
    const canvas = map.getCanvas();
    canvas.style.cursor =
      drawMode === "polygon" || drawMode === "rectangle"
        ? "crosshair"
        : "";
    if (drawMode === "rectangle") {
      map.dragPan.disable();
    } else {
      map.dragPan.enable();
    }
    if (drawMode === "polygon" || drawMode === "rectangle") {
      map.doubleClickZoom.disable();
    } else {
      map.doubleClickZoom.enable();
    }
  }, [map, drawMode]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const inProgressLayers: Layer[] = [];

    if (drawMode === "polygon" && drawPoints.length > 0) {
      const outline = OUTLINE_COLORS[activeZoneType];
      inProgressLayers.push(
        new PathLayer({
          id: "draw-path",
          data: [{ path: drawPoints }],
          getPath: (d: { path: [number, number][] }) => d.path,
          getColor: [outline[0], outline[1], outline[2], 220],
          getWidth: 2,
          widthUnits: "pixels",
        }),
        new ScatterplotLayer({
          id: "draw-points",
          data: drawPoints,
          getPosition: (d: [number, number]) => d,
          getFillColor: [outline[0], outline[1], outline[2], 255],
          getRadius: 5,
          radiusUnits: "pixels",
          stroked: true,
          getLineColor: [255, 255, 255, 220],
          lineWidthMinPixels: 1.5,
        }),
      );
    }

    if (
      drawMode === "rectangle" &&
      rectStart &&
      rectEnd &&
      (rectStart[0] !== rectEnd[0] || rectStart[1] !== rectEnd[1])
    ) {
      const outline = OUTLINE_COLORS[activeZoneType];
      const fill = ZONE_COLORS[activeZoneType];
      const rect: [number, number][] = [
        [rectStart[0], rectStart[1]],
        [rectEnd[0], rectStart[1]],
        [rectEnd[0], rectEnd[1]],
        [rectStart[0], rectEnd[1]],
        [rectStart[0], rectStart[1]],
      ];
      inProgressLayers.push(
        new PolygonLayer({
          id: "draw-rect",
          data: [{ polygon: rect }],
          getPolygon: (d: { polygon: [number, number][] }) => d.polygon,
          getFillColor: fill,
          getLineColor: outline,
          getLineWidth: 2,
          lineWidthUnits: "pixels",
          filled: true,
          stroked: true,
        }),
      );
    }

    overlay.setProps({
      layers: [
        new PolygonLayer({
          id: "zone-polygons",
          data: zones,
          getPolygon: (d: DangerZone) => d.polygon,
          getFillColor: (d: DangerZone) => d.color,
          getLineColor: (d: DangerZone) => OUTLINE_COLORS[d.type],
          getLineWidth: 2,
          lineWidthUnits: "pixels",
          stroked: true,
          filled: true,
        }),
        new ScatterplotLayer({
          id: "zone-centers",
          data: zones,
          getPosition: (d: DangerZone) => polygonCentroid(d.polygon),
          getFillColor: (d: DangerZone) => OUTLINE_COLORS[d.type],
          getRadius: 5,
          radiusUnits: "pixels",
          stroked: true,
          getLineColor: [255, 255, 255, 180],
          lineWidthMinPixels: 1,
        }),
        new TextLayer({
          id: "zone-labels",
          data: zones,
          getPosition: (d: DangerZone) => polygonCentroid(d.polygon),
          getText: (d: DangerZone) => d.label,
          getColor: [255, 255, 255, 230],
          getSize: 13,
          getPixelOffset: [0, -16],
          fontFamily: "monospace",
          fontWeight: 700,
          outlineWidth: 3,
          outlineColor: [0, 0, 0, 200],
          billboard: true,
        }),
        ...inProgressLayers,
      ],
    });
  }, [zones, drawPoints, rectStart, rectEnd, drawMode, activeZoneType]);

  return null;
}

export function DefenseZonePlannerCard() {
  const { resolvedTheme } = useTheme();
  const [zones, setZones] = useState<DangerZone[]>(PRESET_ZONES);
  const [drawMode, setDrawMode] = useState<DrawMode>("static");
  const [activeZoneType, setActiveZoneType] = useState<ZoneType>("minefield");
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const [rectStart, setRectStart] = useState<[number, number] | null>(null);
  const [rectEnd, setRectEnd] = useState<[number, number] | null>(null);
  const counterRef = useRef(0);

  const addZone = useCallback(
    (polygon: [number, number][]) => {
      counterRef.current++;
      const type = activeZoneType;
      const zone: DangerZone = {
        id: `zone-${Date.now()}-${counterRef.current}`,
        type,
        label: `${type.charAt(0).toUpperCase() + type.slice(1)} ${counterRef.current}`,
        polygon,
        areaKm2: computeAreaKm2(polygon),
        color: ZONE_COLORS[type],
      };
      setZones((prev) => [...prev, zone]);
    },
    [activeZoneType],
  );

  const handleMapClick = useCallback(
    (pos: [number, number]) => {
      if (drawMode === "polygon") {
        setDrawPoints((prev) => [...prev, pos]);
      }
    },
    [drawMode],
  );

  const handleMapMouseMove = useCallback(
    (pos: [number, number]) => {
      if (drawMode === "rectangle" && rectStart) {
        setRectEnd(pos);
      }
    },
    [drawMode, rectStart],
  );

  const handleMapDblClick = useCallback(() => {
    if (drawMode === "polygon" && drawPoints.length >= 3) {
      const closed: [number, number][] = [...drawPoints, drawPoints[0]!];
      addZone(closed);
      setDrawPoints([]);
    }
  }, [drawMode, drawPoints, addZone]);

  const handleMapMouseDown = useCallback((pos: [number, number]) => {
    setRectStart(pos);
    setRectEnd(pos);
  }, []);

  const handleMapMouseUp = useCallback(() => {
    if (
      rectStart &&
      rectEnd &&
      (rectStart[0] !== rectEnd[0] || rectStart[1] !== rectEnd[1])
    ) {
      const rect: [number, number][] = [
        [rectStart[0], rectStart[1]],
        [rectEnd[0], rectStart[1]],
        [rectEnd[0], rectEnd[1]],
        [rectStart[0], rectEnd[1]],
        [rectStart[0], rectStart[1]],
      ];
      addZone(rect);
    }
    setRectStart(null);
    setRectEnd(null);
  }, [rectStart, rectEnd, addZone]);

  const setMode = (mode: DrawMode) => {
    setDrawMode(mode);
    setDrawPoints([]);
    setRectStart(null);
    setRectEnd(null);
  };

  const removeZone = (id: string) =>
    setZones((prev) => prev.filter((z) => z.id !== id));

  const clearAll = () => {
    setZones([]);
    setDrawPoints([]);
    setRectStart(null);
    setRectEnd(null);
  };

  const dotForType = useMemo(
    () =>
      Object.fromEntries(
        ZONE_TYPE_OPTIONS.map((o) => [o.value, o.dot] as const),
      ),
    [],
  );

  return (
    <div className="relative h-full w-full min-h-[300px]">
      <Map
        center={[71.5, 26.5]}
        zoom={11}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
      >
        <ZoneOverlay
          zones={zones}
          drawPoints={drawPoints}
          rectStart={rectStart}
          rectEnd={rectEnd}
          drawMode={drawMode}
          activeZoneType={activeZoneType}
          onMapClick={handleMapClick}
          onMapMouseMove={handleMapMouseMove}
          onMapDblClick={handleMapDblClick}
          onMapMouseDown={handleMapMouseDown}
          onMapMouseUp={handleMapMouseUp}
        />
      </Map>

      <MapPanel className="absolute top-3 left-3 z-10 w-64">
        <MapPanelHeader>
          <MapPanelTitle>Zone Planner</MapPanelTitle>
        </MapPanelHeader>
        <MapPanelContent className="space-y-3">
          <div className="text-xs font-semibold">Draw Mode</div>
          <div className="flex items-center gap-1">
            {DRAW_MODES.map((mode) => (
              <button
                key={mode.value}
                onClick={() => setMode(mode.value)}
                title={mode.label}
                className={`flex size-8 items-center justify-center rounded-md text-sm transition-colors ${
                  drawMode === mode.value
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
              >
                {mode.icon}
              </button>
            ))}
          </div>

          <div className="text-xs font-semibold">Zone Type</div>
          <div className="flex flex-wrap items-center gap-1.5">
            {ZONE_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setActiveZoneType(opt.value)}
                className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                  activeZoneType === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
              >
                <span className={`size-2 rounded-full ${opt.dot}`} />
                {opt.label}
              </button>
            ))}
          </div>

          {drawMode === "polygon" && (
            <p className="text-[10px] text-muted-foreground">
              Click to add vertices, double-click to finish (need 3+ points).
            </p>
          )}
          {drawMode === "rectangle" && (
            <p className="text-[10px] text-muted-foreground">
              Click and drag to draw a rectangle.
            </p>
          )}

          <div className="border-t border-border" />

          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold">Zones ({zones.length})</div>
            {zones.length > 0 && (
              <button
                onClick={clearAll}
                className="text-[11px] text-destructive hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          {zones.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              Draw polygons on the map to add danger zones.
            </p>
          ) : (
            <div className="flex max-h-44 flex-col gap-1 overflow-y-auto">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-1.5"
                >
                  <span
                    className={`size-2.5 shrink-0 rounded-full ${dotForType[zone.type]}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] font-medium">
                      {zone.label}
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                      {zone.areaKm2.toFixed(1)} km²
                    </div>
                  </div>
                  <button
                    onClick={() => removeZone(zone.id)}
                    className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remove zone"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </MapPanelContent>
      </MapPanel>
    </div>
  );
}
