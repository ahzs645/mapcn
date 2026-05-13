"use client";

import { useEffect } from "react";
import { Map, useMap } from "@/registry/map";
import { MapLegend, MapLegendItem } from "@/registry/map-ui";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { TileLayer } from "@deck.gl/geo-layers";
import { BitmapLayer } from "@deck.gl/layers";

const AERIAL_URL =
  "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}";

const legendItems = [
  { label: "True Color (RGB)", color: "#4caf50" },
  { label: "False Color (NIR)", color: "#e91e63" },
  { label: "NDVI Vegetation", color: "#8bc34a" },
];

function NaipOverlay() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new TileLayer({
            id: "naip-layer",
            data: AERIAL_URL,
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

export function DeckglNaipCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-104.99, 39.74]} zoom={12} theme="dark">
        <NaipOverlay />
        <MapLegend title="Render Mode" position="bottom-left" collapsible>
          {legendItems.map((item) => (
            <MapLegendItem key={item.label} color={item.color} label={item.label} disabled />
          ))}
        </MapLegend>
      </Map>
    </div>
  );
}
