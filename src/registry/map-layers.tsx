"use client";

import MapLibreGL from "maplibre-gl";
import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";

// Re-export useMap from main registry
// Users should import { useMap } from "@/registry/map"
// This file uses it internally via the same context

// We need to access the MapContext from the main registry
// To avoid circular deps, we import useMap from the main registry
import { useMap } from "@/registry/map";

// ─── MapGeoJsonLayer ─────────────────────────────────────────────────────────

type MapGeoJsonLayerProps = {
  /** Optional unique identifier for the layer */
  id?: string;
  /** GeoJSON data or URL to a GeoJSON file */
  data: GeoJSON.GeoJSON | string;
  /** Layer rendering type (default: "fill") */
  type?: "fill" | "line" | "circle" | "symbol";
  /** MapLibre paint properties for the layer type */
  paint?: Record<string, unknown>;
  /** MapLibre layout properties for the layer type */
  layout?: Record<string, unknown>;
  /** MapLibre filter expression */
  filter?: unknown[];
  /** Insert this layer before the specified layer id */
  before?: string;
  /** Callback when a feature is clicked */
  onClick?: (
    features: MapLibreGL.MapGeoJSONFeature[],
    lngLat: { lng: number; lat: number }
  ) => void;
  /** Callback when mouse enters a feature */
  onMouseEnter?: (features: MapLibreGL.MapGeoJSONFeature[]) => void;
  /** Callback when mouse leaves the layer */
  onMouseLeave?: () => void;
  /** Whether the layer is interactive (default: true) */
  interactive?: boolean;
};

const defaultPaint: Record<string, Record<string, unknown>> = {
  fill: { "fill-color": "#088", "fill-opacity": 0.6 },
  line: { "line-color": "#088", "line-width": 2 },
  circle: { "circle-color": "#088", "circle-radius": 6 },
  symbol: {},
};

function MapGeoJsonLayer({
  id: propId,
  data,
  type = "fill",
  paint,
  layout,
  filter,
  before,
  onClick,
  onMouseEnter,
  onMouseLeave,
  interactive = true,
}: MapGeoJsonLayerProps) {
  const { map, isLoaded } = useMap();
  const autoId = useId();
  const id = propId ?? autoId;
  const sourceId = `geojson-source-${id}`;
  const layerId = `geojson-layer-${id}`;

  const callbacksRef = useRef({ onClick, onMouseEnter, onMouseLeave });
  callbacksRef.current = { onClick, onMouseEnter, onMouseLeave };

  // Add source and layer
  useEffect(() => {
    if (!isLoaded || !map) return;

    map.addSource(sourceId, {
      type: "geojson",
      data: typeof data === "string" ? data : data,
    });

    const layerSpec: MapLibreGL.LayerSpecification = {
      id: layerId,
      type: type as MapLibreGL.LayerSpecification["type"],
      source: sourceId,
      paint: paint ?? defaultPaint[type] ?? {},
      ...(layout && { layout }),
      ...(filter && { filter }),
    } as MapLibreGL.LayerSpecification;

    map.addLayer(layerSpec, before);

    return () => {
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, map]);

  // Update data
  useEffect(() => {
    if (!isLoaded || !map) return;
    const source = map.getSource(sourceId) as MapLibreGL.GeoJSONSource;
    if (source) {
      source.setData(typeof data === "string" ? data : data);
    }
  }, [isLoaded, map, data, sourceId]);

  // Update paint properties
  useEffect(() => {
    if (!isLoaded || !map || !map.getLayer(layerId)) return;
    const p = paint ?? defaultPaint[type] ?? {};
    for (const [key, value] of Object.entries(p)) {
      map.setPaintProperty(layerId, key, value);
    }
  }, [isLoaded, map, layerId, paint, type]);

  // Update layout properties
  useEffect(() => {
    if (!isLoaded || !map || !map.getLayer(layerId) || !layout) return;
    for (const [key, value] of Object.entries(layout)) {
      map.setLayoutProperty(layerId, key, value);
    }
  }, [isLoaded, map, layerId, layout]);

  // Update filter
  useEffect(() => {
    if (!isLoaded || !map || !map.getLayer(layerId)) return;
    if (filter) {
      map.setFilter(layerId, filter as MapLibreGL.FilterSpecification);
    }
  }, [isLoaded, map, layerId, filter]);

  // Handle events
  useEffect(() => {
    if (!isLoaded || !map || !interactive) return;

    const handleClick = (
      e: MapLibreGL.MapMouseEvent & {
        features?: MapLibreGL.MapGeoJSONFeature[];
      }
    ) => {
      if (e.features?.length) {
        callbacksRef.current.onClick?.(e.features, e.lngLat);
      }
    };
    const handleMouseEnter = (
      e: MapLibreGL.MapMouseEvent & {
        features?: MapLibreGL.MapGeoJSONFeature[];
      }
    ) => {
      map.getCanvas().style.cursor = "pointer";
      if (e.features?.length) {
        callbacksRef.current.onMouseEnter?.(e.features);
      }
    };
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
      callbacksRef.current.onMouseLeave?.();
    };

    map.on("click", layerId, handleClick);
    map.on("mouseenter", layerId, handleMouseEnter);
    map.on("mouseleave", layerId, handleMouseLeave);

    return () => {
      map.off("click", layerId, handleClick);
      map.off("mouseenter", layerId, handleMouseEnter);
      map.off("mouseleave", layerId, handleMouseLeave);
    };
  }, [isLoaded, map, layerId, interactive]);

  return null;
}

// ─── MapHeatmapLayer ─────────────────────────────────────────────────────────

type MapHeatmapLayerProps = {
  /** Optional unique identifier */
  id?: string;
  /** GeoJSON point data or URL */
  data: GeoJSON.FeatureCollection<GeoJSON.Point> | string;
  /** Weight of each point (number or data-driven expression). Default: 1 */
  weight?: number | unknown[];
  /** Global intensity multiplier (default: 1) */
  intensity?: number;
  /** Radius of influence in pixels (default: 20) */
  radius?: number;
  /** Layer opacity (default: 0.7) */
  opacity?: number;
  /** Custom color ramp as a MapLibre interpolate expression */
  colorRamp?: unknown[];
};

const defaultColorRamp = [
  "interpolate",
  ["linear"],
  ["heatmap-density"],
  0, "rgba(33,102,172,0)",
  0.2, "rgb(103,169,207)",
  0.4, "rgb(209,229,240)",
  0.6, "rgb(253,219,199)",
  0.8, "rgb(239,138,98)",
  1, "rgb(178,24,43)",
];

function MapHeatmapLayer({
  id: propId,
  data,
  weight = 1,
  intensity = 1,
  radius = 20,
  opacity = 0.7,
  colorRamp,
}: MapHeatmapLayerProps) {
  const { map, isLoaded } = useMap();
  const autoId = useId();
  const id = propId ?? autoId;
  const sourceId = `heatmap-source-${id}`;
  const layerId = `heatmap-layer-${id}`;

  // Add source and layer
  useEffect(() => {
    if (!isLoaded || !map) return;

    map.addSource(sourceId, {
      type: "geojson",
      data,
    });

    map.addLayer({
      id: layerId,
      type: "heatmap",
      source: sourceId,
      paint: {
        "heatmap-weight": weight as number,
        "heatmap-intensity": intensity,
        "heatmap-radius": radius,
        "heatmap-opacity": opacity,
        "heatmap-color": (colorRamp ?? defaultColorRamp) as unknown as MapLibreGL.PropertyValueSpecification<string>,
      },
    } as MapLibreGL.LayerSpecification);

    return () => {
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, map]);

  // Update data
  useEffect(() => {
    if (!isLoaded || !map) return;
    const source = map.getSource(sourceId) as MapLibreGL.GeoJSONSource;
    if (source) {
      source.setData(typeof data === "string" ? data : data);
    }
  }, [isLoaded, map, data, sourceId]);

  // Update paint properties
  useEffect(() => {
    if (!isLoaded || !map || !map.getLayer(layerId)) return;
    map.setPaintProperty(layerId, "heatmap-weight", weight);
    map.setPaintProperty(layerId, "heatmap-intensity", intensity);
    map.setPaintProperty(layerId, "heatmap-radius", radius);
    map.setPaintProperty(layerId, "heatmap-opacity", opacity);
    if (colorRamp) {
      map.setPaintProperty(layerId, "heatmap-color", colorRamp);
    }
  }, [isLoaded, map, layerId, weight, intensity, radius, opacity, colorRamp]);

  return null;
}

// ─── MapFillExtrusionLayer ───────────────────────────────────────────────────

type MapFillExtrusionLayerProps = {
  /** Optional unique identifier */
  id?: string;
  /** GeoJSON polygon data or URL */
  data: GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon> | string;
  /** Extrusion height in meters (number or data-driven expression) */
  height?: number | unknown[];
  /** Extrusion base height in meters (default: 0) */
  base?: number | unknown[];
  /** Extrusion color (default: "#aaa") */
  color?: string | unknown[];
  /** Opacity (default: 0.6) */
  opacity?: number;
  /** MapLibre filter expression */
  filter?: unknown[];
  /** Callback when a feature is clicked */
  onClick?: (
    features: MapLibreGL.MapGeoJSONFeature[],
    lngLat: { lng: number; lat: number }
  ) => void;
};

function MapFillExtrusionLayer({
  id: propId,
  data,
  height = 10,
  base = 0,
  color = "#aaa",
  opacity = 0.6,
  filter,
  onClick,
}: MapFillExtrusionLayerProps) {
  const { map, isLoaded } = useMap();
  const autoId = useId();
  const id = propId ?? autoId;
  const sourceId = `fill-extrusion-source-${id}`;
  const layerId = `fill-extrusion-layer-${id}`;

  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;

  useEffect(() => {
    if (!isLoaded || !map) return;

    map.addSource(sourceId, {
      type: "geojson",
      data,
    });

    map.addLayer({
      id: layerId,
      type: "fill-extrusion",
      source: sourceId,
      paint: {
        "fill-extrusion-height": height as number,
        "fill-extrusion-base": base as number,
        "fill-extrusion-color": color as string,
        "fill-extrusion-opacity": opacity,
      },
      ...(filter && { filter }),
    } as MapLibreGL.LayerSpecification);

    return () => {
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, map]);

  // Update data
  useEffect(() => {
    if (!isLoaded || !map) return;
    const source = map.getSource(sourceId) as MapLibreGL.GeoJSONSource;
    if (source) {
      source.setData(typeof data === "string" ? data : data);
    }
  }, [isLoaded, map, data, sourceId]);

  // Update paint properties
  useEffect(() => {
    if (!isLoaded || !map || !map.getLayer(layerId)) return;
    map.setPaintProperty(layerId, "fill-extrusion-height", height);
    map.setPaintProperty(layerId, "fill-extrusion-base", base);
    map.setPaintProperty(layerId, "fill-extrusion-color", color);
    map.setPaintProperty(layerId, "fill-extrusion-opacity", opacity);
  }, [isLoaded, map, layerId, height, base, color, opacity]);

  // Handle click
  useEffect(() => {
    if (!isLoaded || !map) return;

    const handleClick = (
      e: MapLibreGL.MapMouseEvent & {
        features?: MapLibreGL.MapGeoJSONFeature[];
      }
    ) => {
      if (e.features?.length) {
        onClickRef.current?.(e.features, e.lngLat);
      }
    };
    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
    };

    map.on("click", layerId, handleClick);
    map.on("mouseenter", layerId, handleMouseEnter);
    map.on("mouseleave", layerId, handleMouseLeave);

    return () => {
      map.off("click", layerId, handleClick);
      map.off("mouseenter", layerId, handleMouseEnter);
      map.off("mouseleave", layerId, handleMouseLeave);
    };
  }, [isLoaded, map, layerId]);

  return null;
}

// ─── MapRasterLayer ──────────────────────────────────────────────────────────

type MapRasterLayerProps = {
  /** Optional unique identifier */
  id?: string;
  /** Array of tile URL templates (e.g. ["https://tile.example.com/{z}/{x}/{y}.png"]) */
  tiles: string[];
  /** Tile size in pixels (default: 256) */
  tileSize?: number;
  /** Attribution HTML string */
  attribution?: string;
  /** Layer opacity (default: 1) */
  opacity?: number;
  /** Minimum zoom level (default: 0) */
  minzoom?: number;
  /** Maximum zoom level (default: 22) */
  maxzoom?: number;
};

function MapRasterLayer({
  id: propId,
  tiles,
  tileSize = 256,
  attribution,
  opacity = 1,
  minzoom = 0,
  maxzoom = 22,
}: MapRasterLayerProps) {
  const { map, isLoaded } = useMap();
  const autoId = useId();
  const id = propId ?? autoId;
  const sourceId = `raster-source-${id}`;
  const layerId = `raster-layer-${id}`;

  useEffect(() => {
    if (!isLoaded || !map) return;

    map.addSource(sourceId, {
      type: "raster",
      tiles,
      tileSize,
      ...(attribution && { attribution }),
      minzoom,
      maxzoom,
    });

    map.addLayer({
      id: layerId,
      type: "raster",
      source: sourceId,
      paint: {
        "raster-opacity": opacity,
      },
    });

    return () => {
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, map]);

  // Update opacity
  useEffect(() => {
    if (!isLoaded || !map || !map.getLayer(layerId)) return;
    map.setPaintProperty(layerId, "raster-opacity", opacity);
  }, [isLoaded, map, layerId, opacity]);

  // Update tiles (requires re-adding source)
  useEffect(() => {
    if (!isLoaded || !map) return;

    const existingSource = map.getSource(sourceId);
    if (!existingSource) return;

    try {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);

      map.addSource(sourceId, {
        type: "raster",
        tiles,
        tileSize,
        ...(attribution && { attribution }),
        minzoom,
        maxzoom,
      });

      map.addLayer({
        id: layerId,
        type: "raster",
        source: sourceId,
        paint: { "raster-opacity": opacity },
      });
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles, tileSize]);

  return null;
}

// ─── MapImageLayer ───────────────────────────────────────────────────────────

type MapImageLayerProps = {
  /** Optional unique identifier */
  id?: string;
  /** URL of the image */
  url: string;
  /** Four corner coordinates: [top-left, top-right, bottom-right, bottom-left] as [lng, lat] */
  coordinates: [
    [number, number],
    [number, number],
    [number, number],
    [number, number]
  ];
  /** Layer opacity (default: 1) */
  opacity?: number;
};

function MapImageLayer({
  id: propId,
  url,
  coordinates,
  opacity = 1,
}: MapImageLayerProps) {
  const { map, isLoaded } = useMap();
  const autoId = useId();
  const id = propId ?? autoId;
  const sourceId = `image-source-${id}`;
  const layerId = `image-layer-${id}`;

  useEffect(() => {
    if (!isLoaded || !map) return;

    map.addSource(sourceId, {
      type: "image",
      url,
      coordinates,
    });

    map.addLayer({
      id: layerId,
      type: "raster",
      source: sourceId,
      paint: {
        "raster-opacity": opacity,
        "raster-fade-duration": 0,
      },
    });

    return () => {
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, map]);

  // Update opacity
  useEffect(() => {
    if (!isLoaded || !map || !map.getLayer(layerId)) return;
    map.setPaintProperty(layerId, "raster-opacity", opacity);
  }, [isLoaded, map, layerId, opacity]);

  // Update image source
  useEffect(() => {
    if (!isLoaded || !map) return;
    const source = map.getSource(sourceId) as MapLibreGL.ImageSource;
    if (source && source.updateImage) {
      source.updateImage({ url, coordinates });
    }
  }, [isLoaded, map, sourceId, url, coordinates]);

  return null;
}

// ─── MapScaleControl ─────────────────────────────────────────────────────────

type MapScaleControlProps = {
  /** Position on the map (default: "bottom-left") */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Max width of the scale bar in pixels (default: 100) */
  maxWidth?: number;
  /** Unit to display (default: "metric") */
  unit?: "imperial" | "metric" | "nautical";
};

function MapScaleControl({
  position = "bottom-left",
  maxWidth = 100,
  unit = "metric",
}: MapScaleControlProps) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!isLoaded || !map) return;

    const scale = new MapLibreGL.ScaleControl({
      maxWidth,
      unit,
    });

    map.addControl(scale, position);

    return () => {
      try {
        map.removeControl(scale);
      } catch {
        // ignore
      }
    };
  }, [isLoaded, map, position, maxWidth, unit]);

  return null;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export {
  MapGeoJsonLayer,
  MapHeatmapLayer,
  MapFillExtrusionLayer,
  MapRasterLayer,
  MapImageLayer,
  MapScaleControl,
};
