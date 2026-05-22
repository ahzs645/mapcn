"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect } from "react";
import type { Color, Layer, PickingInfo } from "@deck.gl/core";

import { useDeckGLOverlay } from "@/registry/map-deckgl-core";

type MapDeckGLCOGLayerProps = {
  /** Unique layer id */
  id: string;
  /** Cloud-optimized GeoTIFF URL or buffer */
  geotiff: string | ArrayBuffer | Blob | object;
  /** Tile size in pixels (default 256) */
  tileSize?: number;
  /** Maximum zoom level */
  maxZoom?: number;
  /** Minimum zoom level (default 0) */
  minZoom?: number;
  /** Maximum number of cached tiles */
  maxCacheSize?: number;
  /** Refinement strategy when zooming */
  refinementStrategy?: "best-available" | "no-overlap" | "never";
  /** Maximum concurrent tile requests (default 6) */
  maxRequests?: number;
  /** Layer opacity (default 1) */
  opacity?: number;
  /** Layer visibility (default true) */
  visible?: boolean;
  /** Whether the layer is pickable (default false) */
  pickable?: boolean;
  /** Highlight picked feature (default false) */
  autoHighlight?: boolean;
  /** Highlight color */
  highlightColor?: Color;
  /** maplibre layer id to insert before */
  beforeId?: string;
  /** Show tile debug overlay (default false) */
  debug?: boolean;
  /** Opacity of the debug overlay (default 0.25) */
  debugOpacity?: number;
  /** Callback when a feature is clicked */
  onClick?: (info: PickingInfo) => void;
  /** Callback when the cursor hovers a feature */
  onHover?: (info: PickingInfo) => void;
  /** Callback fired when the COG is loaded, with georeferenced bounds */
  onGeotiffLoad?: (
    tiff: unknown,
    options: {
      geographicBounds: {
        west: number;
        south: number;
        east: number;
        north: number;
      };
    },
  ) => void;
};

type CogLayerCtor = new (props: any) => Layer;

let cachedCogLayerCtor: CogLayerCtor | null | undefined;

async function loadCogLayerCtor(): Promise<CogLayerCtor | null> {
  if (cachedCogLayerCtor !== undefined) return cachedCogLayerCtor;
  try {
    const mod = (await import(
      // @ts-expect-error - optional dependency
      /* @vite-ignore */ "@deck.gl-community/geotiff-layer"
    )) as unknown as { CogTilesLayer?: CogLayerCtor };
    cachedCogLayerCtor = mod.CogTilesLayer ?? null;
  } catch {
    cachedCogLayerCtor = null;
  }
  return cachedCogLayerCtor;
}

/**
 * Cloud-Optimized GeoTIFF (COG) layer.
 *
 * Requires the optional `@deck.gl-community/geotiff-layer` package to be
 * installed. When not available, the component renders nothing and logs a
 * one-time warning.
 */
function MapDeckGLCOGLayer(props: MapDeckGLCOGLayerProps) {
  const { registerLayer, unregisterLayer } = useDeckGLOverlay();

  useEffect(() => {
    let cancelled = false;
    let registered = false;

    loadCogLayerCtor().then((Ctor) => {
      if (cancelled) return;
      if (!Ctor) {
        if (typeof console !== "undefined") {
          console.warn(
            "[MapDeckGLCOGLayer] '@deck.gl-community/geotiff-layer' is not installed. " +
              "Install it to render COG layers.",
          );
        }
        return;
      }
      const layer = new Ctor({
        ...props,
        onGeotiffLoad: props.onGeotiffLoad,
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

export { MapDeckGLCOGLayer };
export type { MapDeckGLCOGLayerProps };
