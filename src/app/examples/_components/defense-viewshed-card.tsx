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
import { PolygonLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";

interface Observer {
  id: string;
  position: [number, number];
  heightM: number;
  label: string;
}

interface ViewshedPolygon {
  observerId: string;
  polygon: [number, number][];
}

const BASE_RANGE_M = 4000;
const HEIGHT_OPTIONS = [2, 5, 10, 20, 30];
const MAX_OBSERVERS = 4;
const RAY_COUNT = 72;
const EARTH_RADIUS = 6371000;
const OBSERVER_LABELS = ["OBS-1", "OBS-2", "OBS-3", "OBS-4"];

function destinationPoint(
  origin: [number, number],
  distanceMeters: number,
  bearingDeg: number,
): [number, number] {
  const lat1 = (origin[1] * Math.PI) / 180;
  const lon1 = (origin[0] * Math.PI) / 180;
  const brng = (bearingDeg * Math.PI) / 180;
  const d = distanceMeters / EARTH_RADIUS;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) +
      Math.cos(lat1) * Math.sin(d) * Math.cos(brng),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );
  return [(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI];
}

function generateViewshed(
  center: [number, number],
  heightM: number,
): [number, number][] {
  const heightMultiplier = Math.sqrt(heightM / 2);
  const points: [number, number][] = [];
  const step = 360 / RAY_COUNT;
  for (let angle = 0; angle < 360; angle += step) {
    const terrainFactor =
      0.5 +
      0.5 *
        (0.4 * Math.sin(angle * 0.05 + center[0] * 100) +
          0.3 * Math.cos(angle * 0.08 + center[1] * 100) +
          0.3 * Math.sin(angle * 0.15));
    const range = BASE_RANGE_M * heightMultiplier * Math.max(0.3, terrainFactor);
    points.push(destinationPoint(center, range, angle));
  }
  points.push(points[0]!);
  return points;
}

function computePolygonAreaKm2(polygon: [number, number][]): number {
  const coords = polygon.slice(0, -1);
  if (coords.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    const lon1 = (coords[i]![0] * Math.PI) / 180;
    const lon2 = (coords[j]![0] * Math.PI) / 180;
    const lat1 = (coords[i]![1] * Math.PI) / 180;
    const lat2 = (coords[j]![1] * Math.PI) / 180;
    area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  area = (Math.abs(area) * EARTH_RADIUS * EARTH_RADIUS) / 2;
  return area / 1e6;
}

function ViewshedOverlay({
  observers,
  viewshedPolygons,
  onMapClick,
}: {
  observers: Observer[];
  viewshedPolygons: ViewshedPolygon[];
  onMapClick: (pos: [number, number]) => void;
}) {
  const { map, isLoaded } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;
    const handleClick = (e: maplibregl.MapMouseEvent) => {
      onMapClickRef.current([e.lngLat.lng, e.lngLat.lat]);
    };
    const add = () => {
      overlay = new MapboxOverlay({ layers: [] });
      overlayRef.current = overlay;
      map.addControl(overlay as unknown as maplibregl.IControl);
    };
    if (map.isStyleLoaded()) add();
    else map.once("load", add);
    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
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
    const overlay = overlayRef.current;
    if (!overlay) return;
    overlay.setProps({
      layers: [
        new PolygonLayer({
          id: "viewshed-areas",
          data: viewshedPolygons,
          getPolygon: (d: ViewshedPolygon) => d.polygon,
          getFillColor: [0, 200, 100, 60],
          getLineColor: [0, 200, 100, 140],
          lineWidthMinPixels: 2,
          filled: true,
          stroked: true,
          pickable: false,
        }),
        new ScatterplotLayer({
          id: "viewshed-observers",
          data: observers,
          getPosition: (d: Observer) => d.position,
          getFillColor: [255, 220, 50, 230],
          getRadius: 10,
          radiusUnits: "pixels",
          stroked: true,
          getLineColor: [0, 0, 0, 200],
          lineWidthMinPixels: 2,
        }),
        new TextLayer({
          id: "viewshed-labels",
          data: observers,
          getPosition: (d: Observer) => d.position,
          getText: (d: Observer) => `${d.label} (${d.heightM}m)`,
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
  }, [observers, viewshedPolygons]);

  return null;
}

function heightLabel(h: number): string {
  if (h <= 2) return `${h}m Standing`;
  if (h <= 5) return `${h}m Crouching`;
  if (h <= 10) return `${h}m Vehicle`;
  if (h <= 20) return `${h}m Structure`;
  return `${h}m Tower`;
}

export function DefenseViewshedCard() {
  const { resolvedTheme } = useTheme();
  const [observers, setObservers] = useState<Observer[]>([]);
  const [observerHeight, setObserverHeight] = useState(2);
  const idRef = useRef(1);

  const viewshedPolygons = useMemo<ViewshedPolygon[]>(
    () =>
      observers.map((obs) => ({
        observerId: obs.id,
        polygon: generateViewshed(obs.position, obs.heightM),
      })),
    [observers],
  );

  const totalArea = useMemo(() => {
    let total = 0;
    for (const vp of viewshedPolygons) {
      total += computePolygonAreaKm2(vp.polygon);
    }
    return total;
  }, [viewshedPolygons]);

  const addObserver = useCallback(
    (lngLat: [number, number]) => {
      setObservers((prev) => {
        if (prev.length >= MAX_OBSERVERS) return prev;
        const label = OBSERVER_LABELS[prev.length] ?? `OBS-${prev.length + 1}`;
        return [
          ...prev,
          {
            id: `obs-${idRef.current++}`,
            position: lngLat,
            heightM: observerHeight,
            label,
          },
        ];
      });
    },
    [observerHeight],
  );

  const removeObserver = (id: string) =>
    setObservers((prev) => prev.filter((o) => o.id !== id));

  const clearAll = () => setObservers([]);

  const setHeight = (h: number) => {
    setObserverHeight(h);
    setObservers((prev) => prev.map((o) => ({ ...o, heightM: h })));
  };

  return (
    <div className="relative h-full w-full min-h-[300px]">
      <Map
        center={[77.5, 34.2]}
        zoom={12}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
      >
        <ViewshedOverlay
          observers={observers}
          viewshedPolygons={viewshedPolygons}
          onMapClick={addObserver}
        />
      </Map>

      <MapPanel className="absolute top-3 left-3 z-10 w-60">
        <MapPanelHeader>
          <MapPanelTitle>Viewshed</MapPanelTitle>
        </MapPanelHeader>
        <MapPanelContent className="space-y-3">
          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold">Observer Height</h3>
            <div className="flex flex-wrap gap-1">
              {HEIGHT_OPTIONS.map((h) => (
                <button
                  key={h}
                  onClick={() => setHeight(h)}
                  className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                    observerHeight === h
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {heightLabel(h)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold">
              Observers{" "}
              <span className="text-muted-foreground">
                ({observers.length}/{MAX_OBSERVERS})
              </span>
            </h3>
            <div className="space-y-1">
              {observers.map((obs) => (
                <div
                  key={obs.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <span className="size-2 shrink-0 rounded-full bg-amber-500" />
                  <span className="font-mono font-bold">{obs.label}</span>
                  <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[9px]">
                    {obs.heightM}m
                  </span>
                  <button
                    onClick={() => removeObserver(obs.id)}
                    className="ml-1 rounded p-0.5 hover:bg-destructive/15 hover:text-destructive"
                    aria-label="Remove observer"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {observers.length === 0 && (
                <p className="px-2 py-1.5 text-[11px] text-muted-foreground">
                  Click map to place observers
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/50 p-2.5 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Visible Area</span>
              <span className="font-mono font-semibold">
                {totalArea.toFixed(1)} km²
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Observer Count</span>
              <span className="font-mono font-semibold">
                {observers.length}
              </span>
            </div>
          </div>

          {observers.length > 0 && (
            <button
              onClick={clearAll}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-destructive/10 px-3 py-1.5 text-[11px] font-medium text-destructive transition-colors hover:bg-destructive/20"
            >
              Clear All
            </button>
          )}
        </MapPanelContent>
      </MapPanel>
    </div>
  );
}
