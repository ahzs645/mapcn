"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect } from "react";
import type { Layer, PickingInfo } from "@deck.gl/core";
import {
  ScenegraphLayer,
  SimpleMeshLayer,
  type ScenegraphLayerProps,
  type SimpleMeshLayerProps,
} from "@deck.gl/mesh-layers";

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

type MapDeckGLSimpleMeshLayerProps = WithIdAndEvents<
  SimpleMeshLayerProps<unknown>
> & {
  data: unknown[] | string;
};
const MapDeckGLSimpleMeshLayer = makeLayerComponent<
  MapDeckGLSimpleMeshLayerProps
>(SimpleMeshLayer);

type MapDeckGLScenegraphLayerProps = WithIdAndEvents<
  ScenegraphLayerProps<unknown>
> & {
  data: unknown[] | string;
};
const MapDeckGLScenegraphLayer = makeLayerComponent<
  MapDeckGLScenegraphLayerProps
>(ScenegraphLayer);

export { MapDeckGLSimpleMeshLayer, MapDeckGLScenegraphLayer };
export type { MapDeckGLSimpleMeshLayerProps, MapDeckGLScenegraphLayerProps };
