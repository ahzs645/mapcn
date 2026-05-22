"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type MapLibreGL from "maplibre-gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
import type { Layer, PickingInfo } from "@deck.gl/core";
import {
  ArcLayer,
  BitmapLayer,
  ColumnLayer,
  GeoJsonLayer,
  GridCellLayer,
  IconLayer,
  LineLayer,
  PathLayer,
  PointCloudLayer,
  PolygonLayer,
  ScatterplotLayer,
  SolidPolygonLayer,
  TextLayer,
  type ArcLayerProps,
  type BitmapLayerProps,
  type ColumnLayerProps,
  type GeoJsonLayerProps,
  type GridCellLayerProps,
  type IconLayerProps,
  type LineLayerProps,
  type PathLayerProps,
  type PointCloudLayerProps,
  type PolygonLayerProps,
  type ScatterplotLayerProps,
  type SolidPolygonLayerProps,
  type TextLayerProps,
} from "@deck.gl/layers";

import { useMap } from "@/registry/map";

type LayerEntry = {
  id: string;
  layer: Layer;
};

type DeckGLContextValue = {
  registerLayer: (entry: LayerEntry) => void;
  unregisterLayer: (id: string) => void;
};

const DeckGLContext = createContext<DeckGLContextValue | null>(null);

/**
 * Module-level overlay registry. Keyed by maplibre Map instance so multiple
 * <Map> instances on the page each get their own implicit overlay. Used as a
 * fallback when no <MapDeckGLOverlay /> ancestor is present.
 */
type ImplicitOverlayState = {
  overlay: MapboxOverlay;
  layers: Map<string, Layer>;
  refCount: number;
};

const implicitOverlays = new WeakMap<MapLibreGL.Map, ImplicitOverlayState>();

function acquireImplicitOverlay(map: MapLibreGL.Map): ImplicitOverlayState {
  let state = implicitOverlays.get(map);
  if (!state) {
    const overlay = new MapboxOverlay({ layers: [] });
    map.addControl(overlay as unknown as MapLibreGL.IControl);
    state = { overlay, layers: new Map(), refCount: 0 };
    implicitOverlays.set(map, state);
  }
  state.refCount += 1;
  return state;
}

function releaseImplicitOverlay(map: MapLibreGL.Map) {
  const state = implicitOverlays.get(map);
  if (!state) return;
  state.refCount -= 1;
  if (state.refCount <= 0) {
    try {
      map.removeControl(state.overlay as unknown as MapLibreGL.IControl);
    } catch {
      // ignore
    }
    implicitOverlays.delete(map);
  }
}

function flushOverlay(state: ImplicitOverlayState) {
  state.overlay.setProps({ layers: Array.from(state.layers.values()) });
}

function useDeckGLOverlay(): DeckGLContextValue {
  const explicit = useContext(DeckGLContext);
  const { map, isLoaded } = useMap();
  const stateRef = useRef<ImplicitOverlayState | null>(null);

  useEffect(() => {
    if (explicit) return;
    if (!map || !isLoaded) return;
    stateRef.current = acquireImplicitOverlay(map);
    return () => {
      stateRef.current = null;
      releaseImplicitOverlay(map);
    };
  }, [explicit, map, isLoaded]);

  const implicitValue = useMemo<DeckGLContextValue>(
    () => ({
      registerLayer: ({ id, layer }) => {
        const state = stateRef.current;
        if (!state) return;
        state.layers.set(id, layer);
        flushOverlay(state);
      },
      unregisterLayer: (id) => {
        const state = stateRef.current;
        if (!state) return;
        state.layers.delete(id);
        flushOverlay(state);
      },
    }),
    [],
  );

  return explicit ?? implicitValue;
}

type MapDeckGLOverlayProps = {
  /** Layer components that contribute deck.gl layers to this overlay */
  children?: ReactNode;
  /** deck.gl interleaved mode — if true, layers are interleaved with map layers (default: false) */
  interleaved?: boolean;
};

/**
 * Optional explicit deck.gl overlay container. When omitted, each
 * MapDeckGL*Layer component manages its own overlay. Wrap layers in this
 * component to share a single overlay (recommended for multiple layers).
 */
function MapDeckGLOverlay({
  children,
  interleaved = false,
}: MapDeckGLOverlayProps) {
  const { map, isLoaded } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const layersRef = useRef<Map<string, Layer>>(new Map());

  useEffect(() => {
    if (!map || !isLoaded) return;
    const overlay = new MapboxOverlay({ interleaved, layers: [] });
    overlayRef.current = overlay;
    map.addControl(overlay as unknown as MapLibreGL.IControl);
    overlay.setProps({ layers: Array.from(layersRef.current.values()) });
    return () => {
      try {
        map.removeControl(overlay as unknown as MapLibreGL.IControl);
      } catch {
        // ignore
      }
      overlayRef.current = null;
    };
  }, [map, isLoaded, interleaved]);

  const flush = useCallback(() => {
    overlayRef.current?.setProps({
      layers: Array.from(layersRef.current.values()),
    });
  }, []);

  const registerLayer = useCallback(
    (entry: LayerEntry) => {
      layersRef.current.set(entry.id, entry.layer);
      flush();
    },
    [flush],
  );

  const unregisterLayer = useCallback(
    (id: string) => {
      layersRef.current.delete(id);
      flush();
    },
    [flush],
  );

  const value = useMemo(
    () => ({ registerLayer, unregisterLayer }),
    [registerLayer, unregisterLayer],
  );

  return (
    <DeckGLContext.Provider value={value}>{children}</DeckGLContext.Provider>
  );
}

type DeckLayerEventHandlers = {
  /** Callback when a feature is clicked */
  onClick?: (info: PickingInfo) => void;
  /** Callback when the cursor hovers a feature */
  onHover?: (info: PickingInfo) => void;
};

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

/**
 * Low-level escape hatch: register an arbitrary deck.gl Layer instance with
 * the surrounding overlay. Prefer the typed wrappers below when possible.
 */
type MapDeckGLLayerProps = {
  /** Unique layer id */
  id: string;
  /** A constructed deck.gl Layer instance */
  layer: Layer;
};

function MapDeckGLLayer({ id, layer }: MapDeckGLLayerProps) {
  useRegisteredLayer(id, layer);
  return null;
}

type WithIdAndEvents<P> = Partial<P> &
  DeckLayerEventHandlers & {
    id: string;
  };

type DeckLayerCtor = new (props: any) => Layer;

function makeLayerComponent<TProps>(Ctor: DeckLayerCtor) {
  function LayerComponent(props: WithIdAndEvents<TProps>) {
    const layer = new Ctor(props as unknown as Record<string, unknown>);
    useRegisteredLayer(props.id, layer);
    return null;
  }
  return LayerComponent;
}

type MapDeckGLScatterplotLayerProps = WithIdAndEvents<
  ScatterplotLayerProps<unknown>
> & {
  data: unknown[] | string;
};
const MapDeckGLScatterplotLayer =
  makeLayerComponent<MapDeckGLScatterplotLayerProps>(ScatterplotLayer);

type MapDeckGLArcLayerProps = WithIdAndEvents<ArcLayerProps<unknown>> & {
  data: unknown[] | string;
};
const MapDeckGLArcLayer = makeLayerComponent<MapDeckGLArcLayerProps>(ArcLayer);

type MapDeckGLLineLayerProps = WithIdAndEvents<LineLayerProps<unknown>> & {
  data: unknown[] | string;
};
const MapDeckGLLineLayer =
  makeLayerComponent<MapDeckGLLineLayerProps>(LineLayer);

type MapDeckGLPathLayerProps = WithIdAndEvents<PathLayerProps<unknown>> & {
  data: unknown[] | string;
};
const MapDeckGLPathLayer =
  makeLayerComponent<MapDeckGLPathLayerProps>(PathLayer);

type MapDeckGLPolygonLayerProps = WithIdAndEvents<PolygonLayerProps<unknown>> & {
  data: unknown[] | string;
};
const MapDeckGLPolygonLayer =
  makeLayerComponent<MapDeckGLPolygonLayerProps>(PolygonLayer);

type MapDeckGLGeoJsonLayerProps = WithIdAndEvents<GeoJsonLayerProps<unknown>> & {
  data: unknown[] | string | object;
};
const MapDeckGLGeoJsonLayer =
  makeLayerComponent<MapDeckGLGeoJsonLayerProps>(GeoJsonLayer);

type MapDeckGLIconLayerProps = WithIdAndEvents<IconLayerProps<unknown>> & {
  data: unknown[] | string;
};
const MapDeckGLIconLayer =
  makeLayerComponent<MapDeckGLIconLayerProps>(IconLayer);

type MapDeckGLTextLayerProps = WithIdAndEvents<TextLayerProps<unknown>> & {
  data: unknown[] | string;
};
const MapDeckGLTextLayer =
  makeLayerComponent<MapDeckGLTextLayerProps>(TextLayer);

type MapDeckGLColumnLayerProps = WithIdAndEvents<ColumnLayerProps<unknown>> & {
  data: unknown[] | string;
};
const MapDeckGLColumnLayer =
  makeLayerComponent<MapDeckGLColumnLayerProps>(ColumnLayer);

type MapDeckGLBitmapLayerProps = WithIdAndEvents<BitmapLayerProps>;
const MapDeckGLBitmapLayer =
  makeLayerComponent<MapDeckGLBitmapLayerProps>(BitmapLayer);

type MapDeckGLPointCloudLayerProps = WithIdAndEvents<
  PointCloudLayerProps<unknown>
> & {
  data: unknown[] | string;
};
const MapDeckGLPointCloudLayer =
  makeLayerComponent<MapDeckGLPointCloudLayerProps>(PointCloudLayer);

type MapDeckGLGridCellLayerProps = WithIdAndEvents<
  GridCellLayerProps<unknown>
> & {
  data: unknown[] | string;
};
const MapDeckGLGridCellLayer =
  makeLayerComponent<MapDeckGLGridCellLayerProps>(GridCellLayer);

type MapDeckGLSolidPolygonLayerProps = WithIdAndEvents<
  SolidPolygonLayerProps<unknown>
> & {
  data: unknown[] | string;
};
const MapDeckGLSolidPolygonLayer = makeLayerComponent<
  MapDeckGLSolidPolygonLayerProps
>(SolidPolygonLayer);

export type {
  MapDeckGLOverlayProps,
  MapDeckGLLayerProps,
  MapDeckGLScatterplotLayerProps,
  MapDeckGLArcLayerProps,
  MapDeckGLLineLayerProps,
  MapDeckGLPathLayerProps,
  MapDeckGLPolygonLayerProps,
  MapDeckGLGeoJsonLayerProps,
  MapDeckGLIconLayerProps,
  MapDeckGLTextLayerProps,
  MapDeckGLColumnLayerProps,
  MapDeckGLBitmapLayerProps,
  MapDeckGLPointCloudLayerProps,
  MapDeckGLGridCellLayerProps,
  MapDeckGLSolidPolygonLayerProps,
  DeckLayerEventHandlers,
  DeckGLContextValue,
  LayerEntry,
};

export {
  MapDeckGLOverlay,
  MapDeckGLLayer,
  MapDeckGLScatterplotLayer,
  MapDeckGLArcLayer,
  MapDeckGLLineLayer,
  MapDeckGLPathLayer,
  MapDeckGLPolygonLayer,
  MapDeckGLGeoJsonLayer,
  MapDeckGLIconLayer,
  MapDeckGLTextLayer,
  MapDeckGLColumnLayer,
  MapDeckGLBitmapLayer,
  MapDeckGLPointCloudLayer,
  MapDeckGLGridCellLayer,
  MapDeckGLSolidPolygonLayer,
  useDeckGLOverlay,
};
