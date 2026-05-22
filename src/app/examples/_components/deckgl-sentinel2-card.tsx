"use client";

import { useEffect, useRef, useState } from "react";
import { Map, useMap } from "@/registry/map";
import {
  MapPanel,
  MapPanelContent,
  MapPanelDescription,
  MapPanelHeader,
  MapPanelTitle,
} from "@/registry/map-ui";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { TileLayer } from "@deck.gl/geo-layers";
import { BitmapLayer } from "@deck.gl/layers";

interface Scene {
  title: string;
  baseUrl: string;
  center: [number, number];
  zoom: number;
}

interface Preset {
  id: string;
  title: string;
  sources: Record<string, string>;
  composite: { r: string; g?: string; b?: string };
  tint: [number, number, number];
}

const SCENES: Scene[] = [
  {
    title: "Torres del Paine, Chile",
    baseUrl:
      "https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/18/F/XJ/2026/4/S2C_18FXJ_20260406_0_L2A",
    center: [-73.0, -51.0],
    zoom: 9,
  },
  {
    title: "Salar de Uyuni, Bolivia",
    baseUrl:
      "https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/19/K/EU/2026/4/S2A_19KEU_20260414_0_L2A",
    center: [-67.65, -20.13],
    zoom: 9,
  },
  {
    title: "Mount Etna, Italy",
    baseUrl:
      "https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/33/S/VB/2024/7/S2B_33SVB_20240725_0_L2A",
    center: [15.0, 37.75],
    zoom: 9,
  },
  {
    title: "Nile Delta, Egypt",
    baseUrl:
      "https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/36/R/TV/2026/4/S2A_36RTV_20260412_1_L2A",
    center: [31.0, 30.5],
    zoom: 9,
  },
];

const PRESETS: Preset[] = [
  {
    id: "true-color",
    title: "True Color (R · G · B)",
    sources: { red: "B04", green: "B03", blue: "B02" },
    composite: { r: "red", g: "green", b: "blue" },
    tint: [255, 255, 255],
  },
  {
    id: "false-color",
    title: "False Color (NIR · R · G)",
    sources: { nir: "B08", red: "B04", green: "B03" },
    composite: { r: "nir", g: "red", b: "green" },
    tint: [220, 80, 110],
  },
  {
    id: "swir",
    title: "SWIR (SWIR · NIR · R)",
    sources: { swir: "B12", nir: "B8A", red: "B04" },
    composite: { r: "swir", g: "nir", b: "red" },
    tint: [220, 160, 60],
  },
];

const IMAGERY_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

function Sentinel2Overlay() {
  const { map, isLoaded } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);

  // The Vue version uses VLayerDeckglMultiCOG, which streams individual
  // Sentinel-2 band COGs (B02/B03/B04/B08/B8A/B12) via geotiff.js and
  // composites them on the GPU. `geotiff` and `@developmentseed/deck.gl-cog`
  // are not available, so this fallback overlays a tiled satellite mosaic.
  useEffect(() => {
    if (!map || !isLoaded) return;
    const addOverlay = () => {
      const overlay = new MapboxOverlay({
        layers: [
          new TileLayer({
            id: "sentinel2-fallback",
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
  return null;
}

function Sentinel2Inner({
  sceneIdx,
  presetId,
}: {
  sceneIdx: number;
  presetId: string;
}) {
  const { map } = useMap();
  const scene = SCENES[sceneIdx] ?? SCENES[0]!;

  useEffect(() => {
    if (!map) return;
    map.flyTo({ center: scene.center, zoom: scene.zoom, duration: 1200 });
  }, [map, scene]);

  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0]!;
  const [tr, tg, tb] = preset.tint;
  const tintStyle =
    presetId === "true-color"
      ? undefined
      : {
          background: `linear-gradient(rgba(${tr},${tg},${tb},0.18), rgba(${tr},${tg},${tb},0.05))`,
        };

  return (
    <>
      <Sentinel2Overlay />
      {tintStyle ? (
        <div
          className="pointer-events-none absolute inset-0 z-[5] mix-blend-overlay"
          style={tintStyle}
          aria-hidden
        />
      ) : null}
    </>
  );
}

export function DeckglSentinel2Card() {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [presetId, setPresetId] = useState<string>("true-color");
  const scene = SCENES[sceneIdx] ?? SCENES[0]!;

  return (
    <div className="relative h-full w-full min-h-[300px]">
      <Map center={scene.center} zoom={scene.zoom} minZoom={6} theme="dark">
        <Sentinel2Inner sceneIdx={sceneIdx} presetId={presetId} />
      </Map>
      <div className="pointer-events-auto absolute top-3 left-3 z-10">
        <MapPanel className="w-72">
          <MapPanelHeader>
            <MapPanelTitle>Sentinel-2</MapPanelTitle>
            <MapPanelDescription>
              Multi-band COG compositing
            </MapPanelDescription>
          </MapPanelHeader>
          <MapPanelContent className="space-y-4">
            <p className="text-muted-foreground text-xs">
              Each band (B02, B03, B04, B8A, B08, B12) is fetched as a separate
              Cloud-Optimized GeoTIFF and composited on the GPU in the Vue
              source. Switch scene and composite below.
            </p>
            <div className="space-y-1.5">
              <label className="text-muted-foreground block font-mono text-[10px] tracking-[0.18em] uppercase">
                Scene
              </label>
              <select
                value={sceneIdx}
                onChange={(e) => setSceneIdx(Number(e.target.value))}
                className="border-border bg-background h-8 w-full rounded-md border px-2 text-xs"
              >
                {SCENES.map((s, idx) => (
                  <option key={s.baseUrl} value={idx}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-muted-foreground block font-mono text-[10px] tracking-[0.18em] uppercase">
                Composite
              </label>
              <select
                value={presetId}
                onChange={(e) => setPresetId(e.target.value)}
                className="border-border bg-background h-8 w-full rounded-md border px-2 text-xs"
              >
                {PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </MapPanelContent>
        </MapPanel>
      </div>
    </div>
  );
}
