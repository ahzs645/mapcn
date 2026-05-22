"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect } from "react";
import type { Color, Layer, PickingInfo } from "@deck.gl/core";

import { useDeckGLOverlay } from "@/registry/map-deckgl-core";

type ColorStop = [number, [number, number, number, number]];

type WindDataPoint = {
  longitude: number;
  latitude: number;
  /** Eastward (zonal) component of wind in m/s */
  u: number;
  /** Northward (meridional) component of wind in m/s */
  v: number;
};

type MapDeckGLWindParticleLayerProps = {
  /** Unique layer id */
  id: string;
  /** URL to an RGB-encoded wind image (u in R, v in G) */
  imageUrl?: string;
  /** Inline wind grid samples (alternative to imageUrl) */
  windData?: WindDataPoint[];
  /** Geographic bounds [west, south, east, north] for the wind data */
  bounds?: [number, number, number, number];
  /** Minimum encoded u value (m/s) */
  uMin?: number;
  /** Maximum encoded u value (m/s) */
  uMax?: number;
  /** Minimum encoded v value (m/s) */
  vMin?: number;
  /** Maximum encoded v value (m/s) */
  vMax?: number;
  /** Number of particles to simulate (default 8192) */
  numParticles?: number;
  /** Maximum age of a particle in frames before respawning (default 30) */
  maxAge?: number;
  /** Multiplier on wind vectors when stepping particles (default 50) */
  speedFactor?: number;
  /** Solid particle color (used when colorRamp is not provided) */
  color?: Color;
  /** Gradient ramp keyed by normalized speed (0–1) */
  colorRamp?: ColorStop[];
  /** Speed range that the colorRamp maps to (m/s) */
  speedRange?: [number, number];
  /** Particle stroke width in pixels (default 1.5) */
  width?: number;
  /** Whether the animation runs (default true) */
  animate?: boolean;
  /** Layer opacity 0–1 (default 1) */
  opacity?: number;
  /** Layer visibility (default true) */
  visible?: boolean;
  /** Whether the layer is pickable (default false) */
  pickable?: boolean;
  /** maplibre layer id to insert before */
  beforeId?: string;
  /** Callback when a particle is clicked */
  onClick?: (info: PickingInfo) => void;
  /** Callback when the cursor hovers a particle */
  onHover?: (info: PickingInfo) => void;
  /** Fired once the wind image/data has loaded */
  onLoaded?: () => void;
  /** Fired if loading the wind image fails */
  onError?: (error: Error) => void;
};

type WindLayerCtor = new (props: any) => Layer;

let cachedWindLayerCtor: WindLayerCtor | null | undefined;

async function loadWindLayerCtor(): Promise<WindLayerCtor | null> {
  if (cachedWindLayerCtor !== undefined) return cachedWindLayerCtor;
  try {
    const mod = (await import(
      // @ts-expect-error - optional dependency
      /* @vite-ignore */ "maplibre-gl-wind"
    )) as unknown as { WindLayer?: WindLayerCtor };
    cachedWindLayerCtor = mod.WindLayer ?? null;
  } catch {
    cachedWindLayerCtor = null;
  }
  return cachedWindLayerCtor;
}

/**
 * WebGL wind particle layer (port of @geoql/v-maplibre's VLayerDeckglWindParticle).
 *
 * Requires the optional `maplibre-gl-wind` package to be installed. When not
 * available, the component renders nothing and logs a one-time warning.
 */
function MapDeckGLWindParticleLayer(props: MapDeckGLWindParticleLayerProps) {
  const {
    bounds = [-180, -90, 180, 90],
    uMin = -50,
    uMax = 50,
    vMin = -50,
    vMax = 50,
    numParticles = 8192,
    maxAge = 30,
    speedFactor = 50,
    color = [255, 255, 255, 200] as Color,
    colorRamp = [
      [0.0, [59, 130, 189, 255]],
      [0.1, [102, 194, 165, 255]],
      [0.2, [171, 221, 164, 255]],
      [0.3, [230, 245, 152, 255]],
      [0.4, [254, 224, 139, 255]],
      [0.5, [253, 174, 97, 255]],
      [0.6, [244, 109, 67, 255]],
      [1.0, [213, 62, 79, 255]],
    ] as ColorStop[],
    speedRange = [0, 30] as [number, number],
    width = 1.5,
    animate = true,
    opacity = 1,
    visible = true,
    pickable = false,
  } = props;

  const { registerLayer, unregisterLayer } = useDeckGLOverlay();

  useEffect(() => {
    let cancelled = false;
    let registered = false;

    loadWindLayerCtor().then((Ctor) => {
      if (cancelled) return;
      if (!Ctor) {
        if (typeof console !== "undefined") {
          console.warn(
            "[MapDeckGLWindParticleLayer] 'maplibre-gl-wind' is not installed. " +
              "Install it to render wind particle layers.",
          );
        }
        return;
      }
      const layer = new Ctor({
        id: props.id,
        imageUrl: props.imageUrl,
        windData: props.windData,
        bounds,
        uMin,
        uMax,
        vMin,
        vMax,
        numParticles,
        maxAge,
        speedFactor,
        color,
        colorRamp,
        speedRange,
        width,
        animate,
        opacity,
        visible,
        pickable,
        beforeId: props.beforeId,
        onClick: props.onClick,
        onHover: props.onHover,
        onLoaded: props.onLoaded,
        onError: props.onError,
      });
      registerLayer({ id: props.id, layer });
      registered = true;
    });

    return () => {
      cancelled = true;
      if (registered) unregisterLayer(props.id);
    };
     
  });

  useEffect(() => {
    return () => unregisterLayer(props.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.id]);

  return null;
}

export { MapDeckGLWindParticleLayer };
export type {
  MapDeckGLWindParticleLayerProps,
  WindDataPoint,
  ColorStop as WindColorStop,
};
