"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Map, useMap } from "@/registry/map";
import {
  MapPanel,
  MapPanelContent,
  MapPanelDescription,
  MapPanelHeader,
  MapPanelTitle,
} from "@/registry/map-ui";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { BitmapLayer } from "@deck.gl/layers";

const GRID_W = 360;
const GRID_H = 181;
const TEMP_MIN_K = 200;
const TEMP_MAX_K = 320;

// Synthetic 2m temperature field across the globe, parameterized by a
// forecast-run index. The Vue version pulls ECMWF Open Data GeoZarr via
// zarrita; that library is not in this project's deps. The renderer below
// keeps the same UX surface — a forecast-run slider + grayscale rescale
// 200 K → 320 K — so the visual story matches even though the underlying
// data is synthesised client-side rather than fetched from data.source.coop.
function buildTempImage(runIdx: number): ImageData {
  const pixels = new Uint8ClampedArray(GRID_W * GRID_H * 4);
  const phase = runIdx * 0.18;
  for (let y = 0; y < GRID_H; y++) {
    const lat = 90 - (y / (GRID_H - 1)) * 180;
    const cosLat = Math.cos((lat * Math.PI) / 180);
    const baseK = 273 + cosLat * 35; // hot equator, cold poles
    for (let x = 0; x < GRID_W; x++) {
      const lon = -180 + (x / GRID_W) * 360;
      const land =
        Math.sin((lon * Math.PI) / 60 + phase) *
          Math.cos((lat * Math.PI) / 50) *
          8 +
        Math.sin((lon * Math.PI) / 30 - phase * 1.5) * 4;
      const noise =
        Math.sin((x * 0.21 + y * 0.17 + phase * 3) * 1.0) * 2 +
        Math.cos((x * 0.07 - y * 0.11) * 1.0) * 2;
      const k = baseK + land + noise;
      const v = ((k - TEMP_MIN_K) / (TEMP_MAX_K - TEMP_MIN_K)) * 255;
      const c = Math.max(0, Math.min(255, v));
      const i = (y * GRID_W + x) * 4;
      pixels[i] = c;
      pixels[i + 1] = c;
      pixels[i + 2] = c;
      pixels[i + 3] = 200;
    }
  }
  return new ImageData(pixels, GRID_W, GRID_H);
}

function EcmwfOverlay({ runIdx }: { runIdx: number }) {
  const { map, isLoaded } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);

  const image = useMemo(() => buildTempImage(runIdx), [runIdx]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    const ensure = () => {
      if (!overlayRef.current) {
        overlayRef.current = new MapboxOverlay({ layers: [] });
        map.addControl(overlayRef.current as unknown as maplibregl.IControl);
      }
      overlayRef.current.setProps({
        layers: [
          new BitmapLayer({
            id: "ecmwf-temp",
            image,
            bounds: [-180, -90, 180, 90],
            opacity: 0.8,
          }),
        ],
      });
    };
    if (map.isStyleLoaded()) ensure();
    else map.once("load", ensure);
    return () => {
      map.off("load", ensure);
    };
  }, [map, isLoaded, image]);

  useEffect(() => {
    return () => {
      if (overlayRef.current && map) {
        try {
          map.removeControl(overlayRef.current as unknown as maplibregl.IControl);
        } catch {}
        overlayRef.current = null;
      }
    };
  }, [map]);

  return null;
}

const FORECAST_RUN_COUNT = 24;

export function DeckglZarrEcmwfCard() {
  const [runIdx, setRunIdx] = useState(FORECAST_RUN_COUNT - 1);

  return (
    <div className="relative h-full w-full min-h-[300px]">
      <Map center={[0, 30]} zoom={1.5} minZoom={0} theme="dark">
        <EcmwfOverlay runIdx={runIdx} />
      </Map>
      <div className="pointer-events-auto absolute top-3 left-3 z-10">
        <MapPanel className="w-72">
          <MapPanelHeader>
            <MapPanelTitle>ECMWF GeoZarr</MapPanelTitle>
            <MapPanelDescription>
              2m temperature, single time slice
            </MapPanelDescription>
          </MapPanelHeader>
          <MapPanelContent className="space-y-3">
            <p className="text-muted-foreground text-xs">
              Vue source streams{" "}
              <a
                href="https://dynamical.org"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                ECMWF Open Data
              </a>{" "}
              via{" "}
              <a
                href="https://github.com/manzt/zarrita.js"
                target="_blank"
                rel="noreferrer"
                className="text-primary font-mono hover:underline"
              >
                zarrita
              </a>
              . That dependency is not available here, so a synthetic
              temperature field is rendered with the same 200 K → 320 K
              grayscale rescale.
            </p>
            <div>
              <label className="text-muted-foreground mb-1.5 block font-mono text-[10px] tracking-[0.18em] uppercase">
                Forecast Run
              </label>
              <input
                type="range"
                min={0}
                max={FORECAST_RUN_COUNT - 1}
                step={1}
                value={runIdx}
                onChange={(e) => setRunIdx(Number(e.target.value))}
                className="w-full"
              />
              <div className="text-muted-foreground mt-1.5 flex justify-between font-mono text-[10px] tabular-nums">
                <span>0</span>
                <span>{runIdx}</span>
                <span>{FORECAST_RUN_COUNT - 1}</span>
              </div>
            </div>
          </MapPanelContent>
        </MapPanel>
      </div>
    </div>
  );
}
