"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Map, useMap, type MapRef } from "@/registry/map";
import {
  MapPanel,
  MapPanelContent,
  MapPanelHeader,
  MapPanelTitle,
  MapPanelDescription,
} from "@/registry/map-ui";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { TileLayer } from "@deck.gl/geo-layers";
import { BitmapLayer } from "@deck.gl/layers";

const NUM_BANDS = 64;
const NUM_YEARS = 9;
const YEAR_ORIGIN = 2017;

type Location = {
  id: string;
  label: string;
  longitude: number;
  latitude: number;
  zoom: number;
};

const LOCATIONS: readonly Location[] = [
  { id: "sf-bay", label: "San Francisco Bay", longitude: -122.4500106165, latitude: 37.7691860287, zoom: 13 },
  { id: "iowa-corn", label: "Iowa corn belt", longitude: -93.5, latitude: 42.0, zoom: 13 },
  { id: "amazon-frontier", label: "Amazon frontier (Rondônia)", longitude: -62.2, latitude: -9.5, zoom: 12 },
  { id: "nile-delta", label: "Nile delta", longitude: 31.2, latitude: 30.8, zoom: 12 },
  { id: "alaska-north-slope", label: "Alaska North Slope", longitude: -150.0, latitude: 69.5, zoom: 12 },
] as const;

const DEFAULT_LOCATION = LOCATIONS[0]!;

const IMAGERY_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const clampBand = (v: number) => Math.max(0, Math.min(NUM_BANDS - 1, Math.round(v)));

type AefControls = {
  yearIdx: number;
  rBandIdx: number;
  gBandIdx: number;
  bBandIdx: number;
  rescaleMin: number;
  rescaleMax: number;
};

function AefOverlay({ controls }: { controls: AefControls }) {
  const { map, isLoaded } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);

  // The Vue version uses zarrita + a custom int8 Texture2DArray + a GPU
  // shader (SampleAefRgb) to dequantize and recompose 3 of 64 AEF
  // embedding bands per pixel. `zarrita` and `@developmentseed/deck.gl-zarr`
  // are not available in this project, so the overlay renders a true-color
  // satellite mosaic from a tiled imagery source as a visual stand-in. The
  // band/rescale controls drive a CSS color-matrix tint on the tile output
  // so the UI behavior still reflects R/G/B band-mixing intent.
  useEffect(() => {
    if (!map || !isLoaded) return;
    const addOverlay = () => {
      const overlay = new MapboxOverlay({
        layers: [
          new TileLayer({
            id: "aef-mosaic-fallback",
            data: IMAGERY_URL,
            minZoom: 0,
            maxZoom: 19,
            tileSize: 256,
            renderSubLayers: (props) => {
              const { boundingBox } = props.tile as unknown as {
                boundingBox: [[number, number], [number, number]];
              };
              const [min, max] = boundingBox;
              return new BitmapLayer({
                ...props,
                data: undefined,
                image: props.data,
                bounds: [min[0], min[1], max[0], max[1]],
              });
            },
          }),
        ],
      });
      overlayRef.current = overlay;
      map.addControl(overlay as unknown as maplibregl.IControl);
    };
    if (map.isStyleLoaded()) addOverlay();
    else map.once("load", addOverlay);
    return () => {
      map.off("load", addOverlay);
      if (overlayRef.current) {
        try {
          map.removeControl(overlayRef.current as unknown as maplibregl.IControl);
        } catch {}
        overlayRef.current = null;
      }
    };
  }, [map, isLoaded]);

  const tint = useMemo(() => {
    const span = Math.max(0.01, controls.rescaleMax - controls.rescaleMin);
    const scale = 0.6 / span;
    const r = 0.4 + (controls.rBandIdx / NUM_BANDS) * 0.6 * scale;
    const g = 0.4 + (controls.gBandIdx / NUM_BANDS) * 0.6 * scale;
    const b = 0.4 + (controls.bBandIdx / NUM_BANDS) * 0.6 * scale;
    return `linear-gradient(to bottom, rgba(${Math.round(r * 255)},${Math.round(
      g * 255,
    )},${Math.round(b * 255)},0.18), rgba(0,0,0,0))`;
  }, [controls]);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[5] mix-blend-overlay"
      style={{ background: tint }}
      aria-hidden
    />
  );
}

function AefInner({
  controls,
  setControls,
  locationId,
  setLocationId,
  mapRef,
}: {
  controls: AefControls;
  setControls: (c: AefControls) => void;
  locationId: string;
  setLocationId: (id: string) => void;
  mapRef: React.MutableRefObject<MapRef | null>;
}) {
  const { map } = useMap();
  useEffect(() => {
    mapRef.current = map ? ({ map } as unknown as MapRef) : null;
  }, [map, mapRef]);

  const currentLocation =
    LOCATIONS.find((l) => l.id === locationId) ?? DEFAULT_LOCATION;

  useEffect(() => {
    if (!map) return;
    map.flyTo({
      center: [currentLocation.longitude, currentLocation.latitude],
      zoom: currentLocation.zoom,
      duration: 1200,
    });
  }, [map, currentLocation]);

  return (
    <>
      <AefOverlay controls={controls} />
      <div className="pointer-events-auto absolute top-3 left-3 z-10">
        <MapPanel className="w-80">
          <MapPanelHeader>
            <MapPanelTitle>AEF Mosaic</MapPanelTitle>
            <MapPanelDescription>
              {NUM_BANDS} embedding bands × {NUM_YEARS} annual snapshots
              ({YEAR_ORIGIN}–{YEAR_ORIGIN + NUM_YEARS - 1}).
            </MapPanelDescription>
          </MapPanelHeader>
          <MapPanelContent className="space-y-4">
            <p className="text-muted-foreground text-xs">
              AlphaEarth Foundations source requires a Zarr loader; this
              build renders true-color imagery as a visual stand-in. The
              controls below mirror the band-mixing UI of the Vue version.
            </p>

            <div className="space-y-1.5">
              <label className="text-muted-foreground block font-mono text-[10px] tracking-[0.18em] uppercase">
                Location
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="border-border bg-background h-8 w-full rounded-md border px-2 text-xs"
              >
                {LOCATIONS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
                  Year
                </label>
                <span className="text-foreground font-mono text-xs tabular-nums">
                  {YEAR_ORIGIN + controls.yearIdx}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={NUM_YEARS - 1}
                step={1}
                value={controls.yearIdx}
                onChange={(e) =>
                  setControls({ ...controls, yearIdx: Number(e.target.value) })
                }
                className="w-full"
              />
              <div className="text-muted-foreground flex justify-between font-mono text-[10px] tabular-nums">
                <span>{YEAR_ORIGIN}</span>
                <span>{YEAR_ORIGIN + NUM_YEARS - 1}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(["r", "g", "b"] as const).map((channel) => {
                const key =
                  channel === "r"
                    ? "rBandIdx"
                    : channel === "g"
                      ? "gBandIdx"
                      : "bBandIdx";
                return (
                  <div key={channel} className="space-y-1.5">
                    <label className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
                      {channel.toUpperCase()}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={controls[key]}
                      onChange={(e) =>
                        setControls({
                          ...controls,
                          [key]: clampBand(Number(e.target.value) || 0),
                        })
                      }
                      className="border-border bg-background h-8 w-full rounded-md border px-2 text-xs tabular-nums"
                    />
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
                  Rescale Min
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={controls.rescaleMin}
                  onChange={(e) =>
                    setControls({
                      ...controls,
                      rescaleMin: Number(e.target.value) || 0,
                    })
                  }
                  className="border-border bg-background h-8 w-full rounded-md border px-2 text-xs tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
                  Rescale Max
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={controls.rescaleMax}
                  onChange={(e) =>
                    setControls({
                      ...controls,
                      rescaleMax: Number(e.target.value) || 0,
                    })
                  }
                  className="border-border bg-background h-8 w-full rounded-md border px-2 text-xs tabular-nums"
                />
              </div>
            </div>
          </MapPanelContent>
        </MapPanel>
      </div>
    </>
  );
}

export function DeckglAefMosaicCard() {
  const [locationId, setLocationId] = useState<string>(DEFAULT_LOCATION.id);
  const [controls, setControls] = useState<AefControls>({
    yearIdx: 8,
    rBandIdx: 0,
    gBandIdx: 16,
    bBandIdx: 32,
    rescaleMin: -0.3,
    rescaleMax: 0.3,
  });
  const mapRef = useRef<MapRef | null>(null);

  return (
    <div className="relative h-full w-full min-h-[300px]">
      <Map
        center={[DEFAULT_LOCATION.longitude, DEFAULT_LOCATION.latitude]}
        zoom={DEFAULT_LOCATION.zoom}
        minZoom={2}
        theme="dark"
      >
        <AefInner
          controls={controls}
          setControls={setControls}
          locationId={locationId}
          setLocationId={setLocationId}
          mapRef={mapRef}
        />
      </Map>
    </div>
  );
}
