"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type MapLibreGL from "maplibre-gl";

import { useMap } from "@/registry/map";
import { footprintCollection, type HistoricalMapRecord } from "../data";

type MapFootprintsProps = {
  maps: HistoricalMapRecord[];
  selectedMapId: string;
  hoveredMapId: string | null;
  onSelectMap: (id: string) => void;
  onHoverMap: (id: string | null) => void;
};

const SOURCE_ID = "old-maps-footprints";
const FILL_ID = "old-maps-footprints-fill";
const LINE_ID = "old-maps-footprints-line";

// Opacity / width ramps are theme-independent; only the hues come from tokens.
const fillOpacity: MapLibreGL.ExpressionSpecification = [
  "match",
  ["get", "state"],
  "selected",
  0.22,
  "hovered",
  0.14,
  0.05,
];
const lineWidth: MapLibreGL.ExpressionSpecification = [
  "match",
  ["get", "state"],
  "selected",
  2.5,
  "hovered",
  1.75,
  1,
];
const lineOpacity: MapLibreGL.ExpressionSpecification = [
  "match",
  ["get", "state"],
  "selected",
  1,
  "hovered",
  0.85,
  0.4,
];

const FALLBACK_COLORS = { primary: "rgb(38, 38, 38)", muted: "rgb(115, 115, 115)" };

/**
 * Resolves mapcn's CSS design tokens to concrete `rgb()` strings that MapLibre
 * can parse, and refreshes them whenever the theme (the `.dark` class or the
 * system preference) changes — so footprint colors track the active theme.
 */
function readTokenColors() {
  if (typeof document === "undefined") return FALLBACK_COLORS;
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  const read = (expr: string) => {
    probe.style.color = "rgb(0, 0, 0)";
    probe.style.color = expr;
    return getComputedStyle(probe).color || "rgb(0, 0, 0)";
  };
  const colors = {
    primary: read("var(--primary)"),
    muted: read("var(--muted-foreground)"),
  };
  probe.remove();
  return colors;
}

function useTokenColors() {
  const [colors, setColors] = useState(FALLBACK_COLORS);
  useEffect(() => {
    const update = () => setColors(readTokenColors());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", update);
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", update);
    };
  }, []);
  return colors;
}

/** Draws coverage rectangles for each historical map sheet on the basemap. */
export function MapFootprints({
  maps,
  selectedMapId,
  hoveredMapId,
  onSelectMap,
  onHoverMap,
}: MapFootprintsProps) {
  const { map, isLoaded } = useMap();
  const colors = useTokenColors();

  const data = useMemo(
    () => footprintCollection(maps, selectedMapId, hoveredMapId),
    [maps, selectedMapId, hoveredMapId],
  );

  // Hue is selected/hovered → primary, otherwise the muted neutral token.
  const colorExpression = useMemo<MapLibreGL.ExpressionSpecification>(
    () => [
      "match",
      ["get", "state"],
      "selected",
      colors.primary,
      "hovered",
      colors.primary,
      colors.muted,
    ],
    [colors],
  );

  // Keep the latest color expression available to layer (re)creation.
  const colorRef = useRef(colorExpression);
  colorRef.current = colorExpression;

  // Create the source + layers, and re-create them if the style reloads
  // (e.g. on a light/dark theme switch, which discards custom layers).
  useEffect(() => {
    if (!isLoaded || !map) return;

    const ensureLayers = () => {
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, { type: "geojson", data });
      }
      if (!map.getLayer(FILL_ID)) {
        map.addLayer({
          id: FILL_ID,
          type: "fill",
          source: SOURCE_ID,
          paint: { "fill-color": colorRef.current, "fill-opacity": fillOpacity },
        });
      }
      if (!map.getLayer(LINE_ID)) {
        map.addLayer({
          id: LINE_ID,
          type: "line",
          source: SOURCE_ID,
          layout: { "line-join": "round" },
          paint: {
            "line-color": colorRef.current,
            "line-width": lineWidth,
            "line-opacity": lineOpacity,
          },
        });
      }
    };

    ensureLayers();
    map.on("styledata", ensureLayers);

    return () => {
      map.off("styledata", ensureLayers);
      try {
        if (map.getLayer(LINE_ID)) map.removeLayer(LINE_ID);
        if (map.getLayer(FILL_ID)) map.removeLayer(FILL_ID);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        // style already torn down — nothing to clean up
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, map]);

  // Push fresh state into the source whenever selection / hover / set changes.
  useEffect(() => {
    if (!isLoaded || !map) return;
    const source = map.getSource(SOURCE_ID) as
      | MapLibreGL.GeoJSONSource
      | undefined;
    source?.setData(data);
  }, [isLoaded, map, data]);

  // Re-apply token-derived colors when the theme changes.
  useEffect(() => {
    if (!isLoaded || !map) return;
    if (map.getLayer(FILL_ID)) {
      map.setPaintProperty(FILL_ID, "fill-color", colorExpression);
    }
    if (map.getLayer(LINE_ID)) {
      map.setPaintProperty(LINE_ID, "line-color", colorExpression);
    }
  }, [isLoaded, map, colorExpression]);

  // Interactions: clicking a footprint selects it, hovering highlights it.
  useEffect(() => {
    if (!isLoaded || !map) return;

    const handleClick = (
      event: MapLibreGL.MapMouseEvent & {
        features?: MapLibreGL.MapGeoJSONFeature[];
      },
    ) => {
      const id = event.features?.[0]?.properties?.id;
      if (typeof id === "string") onSelectMap(id);
    };
    const handleMove = (
      event: MapLibreGL.MapMouseEvent & {
        features?: MapLibreGL.MapGeoJSONFeature[];
      },
    ) => {
      const id = event.features?.[0]?.properties?.id;
      map.getCanvas().style.cursor = "pointer";
      if (typeof id === "string") onHoverMap(id);
    };
    const handleLeave = () => {
      map.getCanvas().style.cursor = "";
      onHoverMap(null);
    };

    map.on("click", FILL_ID, handleClick);
    map.on("mousemove", FILL_ID, handleMove);
    map.on("mouseleave", FILL_ID, handleLeave);

    return () => {
      map.off("click", FILL_ID, handleClick);
      map.off("mousemove", FILL_ID, handleMove);
      map.off("mouseleave", FILL_ID, handleLeave);
    };
  }, [isLoaded, map, onSelectMap, onHoverMap]);

  return null;
}
