"use client";

import { useEffect } from "react";
import { Map, useMap } from "@/registry/map";
import { MapLegend, MapLegendItem } from "@/registry/map-ui";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { TileLayer } from "@deck.gl/geo-layers";
import { BitmapLayer } from "@deck.gl/layers";

const SATELLITE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const legendItems = [
  { label: "Vegetation", color: "#2d7d3e" },
  { label: "Water", color: "#1a5fb4" },
  { label: "Urban / Built-up", color: "#9a9996" },
  { label: "Bare Soil", color: "#c8a260" },
];

function CogOverlay() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new TileLayer({
            id: "cog-layer",
            data: SATELLITE_URL,
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
      map.addControl(overlay as unknown as maplibregl.IControl);
    };

    if (map.isStyleLoaded()) addOverlay();
    else map.once("load", addOverlay);

    return () => {
      map.off("load", addOverlay);
      if (overlay) {
        try {
          map.removeControl(overlay as unknown as maplibregl.IControl);
        } catch {}
      }
    };
  }, [map, isLoaded]);

  return null;
}

export function DeckglCogCard() {
  return (
    <div className="h-full w-full">
      <Map center={[31.3, 30.0]} zoom={8} theme="dark">
        <CogOverlay />
        <MapLegend title="Sentinel-2 Imagery" position="bottom-left" collapsible>
          {legendItems.map((item) => (
            <MapLegendItem key={item.label} color={item.color} label={item.label} disabled />
          ))}
        </MapLegend>
      </Map>
    </div>
  );
}
