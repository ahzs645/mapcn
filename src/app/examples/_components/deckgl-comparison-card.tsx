"use client";

import { useEffect, useRef, useState } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { TileLayer } from "@deck.gl/geo-layers";
import { BitmapLayer } from "@deck.gl/layers";

// Vue source loads two Sentinel-2 TCI COGs (2018 vs 2024) via
// VLayerDeckglCOG and fades between them with a slider. `geotiff` and
// `@developmentseed/deck.gl-cog` are not in this project, so the
// comparison uses two distinct tiled imagery providers (USGS + Esri)
// over the same Vermont AOI to preserve the A/B compare interaction.
const BEFORE_URL =
  "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}";
const AFTER_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

function ComparisonOverlay({ afterOpacity }: { afterOpacity: number }) {
  const { map, isLoaded } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);

  useEffect(() => {
    if (!map || !isLoaded) return;
    const ensure = () => {
      if (!overlayRef.current) {
        overlayRef.current = new MapboxOverlay({ layers: [] });
        map.addControl(overlayRef.current as unknown as maplibregl.IControl);
      }
      overlayRef.current.setProps({
        layers: [
          new TileLayer({
            id: "before-cog",
            data: BEFORE_URL,
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
          new TileLayer({
            id: "after-cog",
            data: AFTER_URL,
            minZoom: 0,
            maxZoom: 19,
            tileSize: 256,
            opacity: afterOpacity,
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
    };
    if (map.isStyleLoaded()) ensure();
    else map.once("load", ensure);
    return () => {
      map.off("load", ensure);
    };
  }, [map, isLoaded, afterOpacity]);

  useEffect(() => {
    return () => {
      if (overlayRef.current && map) {
        try {
          map.removeControl(overlayRef.current as unknown as maplibregl.IControl);
        } catch {}
        overlayRef.current = null;
      }
    };
  }, [map]);

  return null;
}

export function DeckglComparisonCard() {
  const [splitPosition, setSplitPosition] = useState(50);
  const afterOpacity = splitPosition / 100;

  return (
    <div className="relative h-full w-full min-h-[300px]">
      <Map center={[-73.0, 44.5]} zoom={8} theme="dark">
        <ComparisonOverlay afterOpacity={afterOpacity} />
      </Map>
      <div className="pointer-events-auto border-border bg-background/85 absolute bottom-4 left-1/2 z-20 w-72 -translate-x-1/2 rounded-md border p-3 backdrop-blur-sm">
        <div className="text-muted-foreground mb-2 flex items-center justify-between font-mono text-[10px] tracking-[0.15em] uppercase">
          <span>2018</span>
          <span className="text-foreground tabular-nums">
            {splitPosition}%
          </span>
          <span>2024</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={splitPosition}
          onChange={(e) => setSplitPosition(Number(e.target.value))}
          className="w-full"
        />
      </div>
    </div>
  );
}
