"use client";

import { useEffect } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { TileLayer } from "@deck.gl/geo-layers";
import { BitmapLayer } from "@deck.gl/layers";

const WMS_BASE =
  "https://basemap.nationalmap.gov/arcgis/services/USGSTopo/MapServer/WMSServer";

function WmsOverlay() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new TileLayer({
            id: "wms-layer",
            minZoom: 0,
            maxZoom: 18,
            tileSize: 256,
            renderSubLayers: (props: any) => {
              const { boundingBox } = props.tile;
              const [min, max] = boundingBox;
              const { west, south, east, north } = props.tile.bbox;
              const imageUrl = `${WMS_BASE}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=0&SRS=EPSG:4326&FORMAT=image/png&TRANSPARENT=true&WIDTH=256&HEIGHT=256&BBOX=${west},${south},${east},${north}`;
              return new BitmapLayer({
                ...props,
                data: undefined,
                image: imageUrl,
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

export function DeckglWmsCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-105.5, 39.75]} zoom={6} theme="dark">
        <WmsOverlay />
      </Map>
    </div>
  );
}
