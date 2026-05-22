"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Map, useMap } from "@/registry/map";
import {
  MapPanel,
  MapPanelContent,
  MapPanelHeader,
  MapPanelTitle,
} from "@/registry/map-ui";

type SpectralBand = "visual" | "thermal" | "nightvision";
type Orientation = "vertical" | "horizontal";

interface SpectralPair {
  id: string;
  label: string;
  before: SpectralBand;
  after: SpectralBand;
}

const SPECTRAL_PAIRS: SpectralPair[] = [
  { id: "vis-therm", label: "Visual / Thermal", before: "visual", after: "thermal" },
  { id: "vis-nv", label: "Visual / Night Vision", before: "visual", after: "nightvision" },
  { id: "therm-nv", label: "Thermal / Night Vision", before: "thermal", after: "nightvision" },
];

const BAND_LABELS: Record<SpectralBand, string> = {
  visual: "Optical/Visual",
  thermal: "Thermal/IR",
  nightvision: "Night Vision",
};

const SATELLITE_TILE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const BAND_PAINT: Record<SpectralBand, Record<string, number>> = {
  visual: { "raster-opacity": 1 },
  thermal: {
    "raster-hue-rotate": 30,
    "raster-saturation": 0.6,
    "raster-contrast": 0.4,
    "raster-brightness-max": 0.85,
  },
  nightvision: {
    "raster-hue-rotate": 120,
    "raster-saturation": -0.4,
    "raster-brightness-max": 0.65,
    "raster-contrast": 0.3,
  },
};

function SpectralRasterLayer({ band }: { band: SpectralBand }) {
  const { map, isLoaded } = useMap();
  const sourceId = "spectral-satellite-src";
  const layerId = "spectral-satellite-layer";

  useEffect(() => {
    if (!map || !isLoaded) return;

    const add = () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      map.addSource(sourceId, {
        type: "raster",
        tiles: [SATELLITE_TILE],
        tileSize: 256,
        attribution: "© Esri",
        maxzoom: 18,
      });
      const symbolLayer = map
        .getStyle()
        .layers?.find((l) => l.type === "symbol");
      map.addLayer(
        {
          id: layerId,
          type: "raster",
          source: sourceId,
          paint: BAND_PAINT[band] as Record<string, unknown>,
        },
        symbolLayer?.id,
      );
    };

    add();

    return () => {
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {
        // ignore
      }
    };
  }, [map, isLoaded, band]);

  return null;
}

export function DefenseSpectralCard() {
  const { resolvedTheme } = useTheme();
  const [pair, setPair] = useState<SpectralPair>(SPECTRAL_PAIRS[0]!);
  const [orientation, setOrientation] = useState<Orientation>("vertical");
  const [splitPct, setSplitPct] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const point = "touches" in e ? e.touches[0]! : (e as MouseEvent);
      const pct =
        orientation === "vertical"
          ? ((point.clientX - rect.left) / rect.width) * 100
          : ((point.clientY - rect.top) / rect.height) * 100;
      setSplitPct(Math.max(2, Math.min(98, pct)));
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [orientation]);

  const clipBefore =
    orientation === "vertical"
      ? `inset(0 ${100 - splitPct}% 0 0)`
      : `inset(0 0 ${100 - splitPct}% 0)`;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full min-h-[300px] overflow-hidden select-none"
    >
      <div className="absolute inset-0">
        <Map
          center={[77.5, 34.0]}
          zoom={10}
          theme={resolvedTheme === "dark" ? "dark" : "light"}
        >
          <SpectralRasterLayer band={pair.after} />
        </Map>
      </div>

      <div
        className="absolute inset-0 pointer-events-none"
        style={{ clipPath: clipBefore, WebkitClipPath: clipBefore }}
      >
        <div className="absolute inset-0 pointer-events-auto">
          <Map
            center={[77.5, 34.0]}
            zoom={10}
            theme={resolvedTheme === "dark" ? "dark" : "light"}
          >
            <SpectralRasterLayer band={pair.before} />
          </Map>
        </div>
      </div>

      <div
        className="absolute z-20 bg-white shadow-lg"
        style={
          orientation === "vertical"
            ? {
                left: `${splitPct}%`,
                top: 0,
                bottom: 0,
                width: 2,
                transform: "translateX(-1px)",
                cursor: "ew-resize",
              }
            : {
                top: `${splitPct}%`,
                left: 0,
                right: 0,
                height: 2,
                transform: "translateY(-1px)",
                cursor: "ns-resize",
              }
        }
        onMouseDown={() => (dragging.current = true)}
        onTouchStart={() => (dragging.current = true)}
      >
        <div
          className="absolute size-7 rounded-full border-2 border-white bg-foreground/80 shadow flex items-center justify-center text-background text-xs font-bold"
          style={
            orientation === "vertical"
              ? { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
              : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
          }
        >
          {orientation === "vertical" ? "⇆" : "⇅"}
        </div>
      </div>

      <MapPanel className="absolute top-3 right-3 z-30 w-56">
        <MapPanelHeader>
          <MapPanelTitle>Spectral</MapPanelTitle>
        </MapPanelHeader>
        <MapPanelContent className="space-y-4">
          <div>
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Spectral Pair
            </h4>
            <div className="flex flex-col gap-1.5">
              {SPECTRAL_PAIRS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPair(p)}
                  className={`rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors ${
                    pair.id === p.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Orientation
            </h4>
            <div className="flex gap-2">
              {(["vertical", "horizontal"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setOrientation(opt)}
                  className={`flex-1 rounded-md border px-2 py-1 text-xs transition-colors ${
                    orientation === opt
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border/50 bg-muted/30 p-2.5 space-y-1">
            <div className="text-[10px] font-medium text-muted-foreground">
              Active Bands
            </div>
            <div className="text-xs">Before: {BAND_LABELS[pair.before]}</div>
            <div className="text-xs">After: {BAND_LABELS[pair.after]}</div>
          </div>
        </MapPanelContent>
      </MapPanel>
    </div>
  );
}
