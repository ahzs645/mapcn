"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect } from "react";
import type { Layer, PickingInfo } from "@deck.gl/core";
import {
  GeohashLayer,
  GreatCircleLayer,
  H3ClusterLayer,
  H3HexagonLayer,
  MVTLayer,
  QuadkeyLayer,
  S2Layer,
  TerrainLayer,
  Tile3DLayer,
  TileLayer,
  TripsLayer,
  _WMSLayer as WMSLayer,
  type GeohashLayerProps,
  type GreatCircleLayerProps,
  type H3ClusterLayerProps,
  type H3HexagonLayerProps,
  type MVTLayerProps,
  type QuadkeyLayerProps,
  type S2LayerProps,
  type TerrainLayerProps,
  type Tile3DLayerProps,
  type TileLayerProps,
  type TripsLayerProps,
} from "@deck.gl/geo-layers";

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

type MapDeckGLTileLayerProps = WithIdAndEvents<TileLayerProps<unknown>> & {
  data: string | string[];
};
const MapDeckGLTileLayer =
  makeLayerComponent<MapDeckGLTileLayerProps>(TileLayer);

type MapDeckGLMVTLayerProps = WithIdAndEvents<MVTLayerProps<unknown>> & {
  data: string | string[];
};
const MapDeckGLMVTLayer = makeLayerComponent<MapDeckGLMVTLayerProps>(MVTLayer);

type MapDeckGLTile3DLayerProps = WithIdAndEvents<Tile3DLayerProps<unknown>> & {
  data: string;
};
const MapDeckGLTile3DLayer =
  makeLayerComponent<MapDeckGLTile3DLayerProps>(Tile3DLayer);

type MapDeckGLTerrainLayerProps = WithIdAndEvents<TerrainLayerProps>;
const MapDeckGLTerrainLayer =
  makeLayerComponent<MapDeckGLTerrainLayerProps>(TerrainLayer);

type MapDeckGLH3HexagonLayerProps = WithIdAndEvents<
  H3HexagonLayerProps<unknown>
> & {
  data: unknown[] | string;
};
const MapDeckGLH3HexagonLayer =
  makeLayerComponent<MapDeckGLH3HexagonLayerProps>(H3HexagonLayer);

type MapDeckGLH3ClusterLayerProps = WithIdAndEvents<
  H3ClusterLayerProps<unknown>
> & {
  data: unknown[] | string;
};
const MapDeckGLH3ClusterLayer =
  makeLayerComponent<MapDeckGLH3ClusterLayerProps>(H3ClusterLayer);

type MapDeckGLGreatCircleLayerProps = WithIdAndEvents<
  GreatCircleLayerProps<unknown>
> & {
  data: unknown[] | string;
};
const MapDeckGLGreatCircleLayer = makeLayerComponent<
  MapDeckGLGreatCircleLayerProps
>(GreatCircleLayer);

type MapDeckGLS2LayerProps = WithIdAndEvents<S2LayerProps<unknown>> & {
  data: unknown[] | string;
};
const MapDeckGLS2Layer = makeLayerComponent<MapDeckGLS2LayerProps>(S2Layer);

type MapDeckGLGeohashLayerProps = WithIdAndEvents<
  GeohashLayerProps<unknown>
> & {
  data: unknown[] | string;
};
const MapDeckGLGeohashLayer =
  makeLayerComponent<MapDeckGLGeohashLayerProps>(GeohashLayer);

type MapDeckGLQuadkeyLayerProps = WithIdAndEvents<
  QuadkeyLayerProps<unknown>
> & {
  data: unknown[] | string;
};
const MapDeckGLQuadkeyLayer =
  makeLayerComponent<MapDeckGLQuadkeyLayerProps>(QuadkeyLayer);

type MapDeckGLTripsLayerProps = WithIdAndEvents<TripsLayerProps<unknown>> & {
  data: unknown[] | string;
};
const MapDeckGLTripsLayer =
  makeLayerComponent<MapDeckGLTripsLayerProps>(TripsLayer);

type MapDeckGLWMSLayerProps = DeckLayerEventHandlers & {
  /** Unique layer id */
  id: string;
  /** WMS service URL or tile URL template */
  data: string;
  /** Service type — defaults to "wms" */
  serviceType?: "wms" | "template";
  /** WMS layer names to request */
  layers?: string[];
  /** Tile size in pixels (default 256) */
  tileSize?: number;
  /** Minimum zoom level for tiles */
  minZoom?: number;
  /** Maximum zoom level for tiles */
  maxZoom?: number;
  /** Layer opacity 0-1 */
  opacity?: number;
  /** Layer visibility */
  visible?: boolean;
  /** Whether the layer is pickable for events */
  pickable?: boolean;
};
const MapDeckGLWMSLayer = makeLayerComponent<MapDeckGLWMSLayerProps>(WMSLayer);

export {
  MapDeckGLTileLayer,
  MapDeckGLMVTLayer,
  MapDeckGLTile3DLayer,
  MapDeckGLTerrainLayer,
  MapDeckGLH3HexagonLayer,
  MapDeckGLH3ClusterLayer,
  MapDeckGLGreatCircleLayer,
  MapDeckGLS2Layer,
  MapDeckGLGeohashLayer,
  MapDeckGLQuadkeyLayer,
  MapDeckGLTripsLayer,
  MapDeckGLWMSLayer,
};

export type {
  MapDeckGLTileLayerProps,
  MapDeckGLMVTLayerProps,
  MapDeckGLTile3DLayerProps,
  MapDeckGLTerrainLayerProps,
  MapDeckGLH3HexagonLayerProps,
  MapDeckGLH3ClusterLayerProps,
  MapDeckGLGreatCircleLayerProps,
  MapDeckGLS2LayerProps,
  MapDeckGLGeohashLayerProps,
  MapDeckGLQuadkeyLayerProps,
  MapDeckGLTripsLayerProps,
  MapDeckGLWMSLayerProps,
};
