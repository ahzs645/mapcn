"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect } from "react";
import type { Layer, PickingInfo } from "@deck.gl/core";
import {
  ContourLayer,
  GridLayer,
  HeatmapLayer,
  HexagonLayer,
  ScreenGridLayer,
  type ContourLayerProps,
  type GridLayerProps,
  type HeatmapLayerProps,
  type HexagonLayerProps,
  type ScreenGridLayerProps,
} from "@deck.gl/aggregation-layers";

import { useDeckGLOverlay } from "@/registry/map-deckgl-core";

type DeckLayerEventHandlers = {
  /** Callback when a feature is clicked */
  onClick?: (info: PickingInfo) => void;
  /** Callback when the cursor hovers a feature */
  onHover?: (info: PickingInfo) => void;
};

type WithIdAndEvents<P> = Partial<P> &
  DeckLayerEventHandlers & {
    id: string;
  };

type DeckLayerCtor = new (props: any) => Layer;

function useRegisteredLayer(id: string, layer: Layer) {
  const { registerLayer, unregisterLayer } = useDeckGLOverlay();

  useEffect(() => {
    registerLayer({ id, layer });
     
  });

  useEffect(() => {
    return () => unregisterLayer(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
}

function makeLayerComponent<TProps>(Ctor: DeckLayerCtor) {
  function LayerComponent(props: WithIdAndEvents<TProps>) {
    const layer = new Ctor(props as unknown as Record<string, unknown>);
    useRegisteredLayer(props.id, layer);
    return null;
  }
  return LayerComponent;
}

type MapDeckGLHeatmapLayerProps = WithIdAndEvents<
  HeatmapLayerProps<unknown>
> & {
  data: unknown[] | string;
};
const MapDeckGLHeatmapLayer =
  makeLayerComponent<MapDeckGLHeatmapLayerProps>(HeatmapLayer);

type MapDeckGLHexagonLayerProps = WithIdAndEvents<
  HexagonLayerProps<unknown>
> & {
  data: unknown[] | string;
};
const MapDeckGLHexagonLayer =
  makeLayerComponent<MapDeckGLHexagonLayerProps>(HexagonLayer);

type MapDeckGLGridLayerProps = WithIdAndEvents<GridLayerProps<unknown>> & {
  data: unknown[] | string;
};
const MapDeckGLGridLayer =
  makeLayerComponent<MapDeckGLGridLayerProps>(GridLayer);

type MapDeckGLContourLayerProps = WithIdAndEvents<
  ContourLayerProps<unknown>
> & {
  data: unknown[] | string;
};
const MapDeckGLContourLayer =
  makeLayerComponent<MapDeckGLContourLayerProps>(ContourLayer);

type MapDeckGLScreenGridLayerProps = WithIdAndEvents<
  ScreenGridLayerProps<unknown>
> & {
  data: unknown[] | string;
};
const MapDeckGLScreenGridLayer =
  makeLayerComponent<MapDeckGLScreenGridLayerProps>(ScreenGridLayer);

export {
  MapDeckGLHeatmapLayer,
  MapDeckGLHexagonLayer,
  MapDeckGLGridLayer,
  MapDeckGLContourLayer,
  MapDeckGLScreenGridLayer,
};

export type {
  MapDeckGLHeatmapLayerProps,
  MapDeckGLHexagonLayerProps,
  MapDeckGLGridLayerProps,
  MapDeckGLContourLayerProps,
  MapDeckGLScreenGridLayerProps,
};
