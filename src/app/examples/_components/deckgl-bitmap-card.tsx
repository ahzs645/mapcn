"use client";

import { useEffect } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { BitmapLayer } from "@deck.gl/layers";

function BitmapOverlay() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new BitmapLayer({
            id: "bitmap",
            bounds: [-122.519, 37.7045, -122.355, 37.829],
            image: "https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/sf-districts.png",
            opacity: 0.8,
            pickable: true,
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
        try { map.removeControl(overlay as unknown as maplibregl.IControl); } catch {}
      }
    };
  }, [map, isLoaded]);

  return null;
}

export function DeckglBitmapCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-122.44, 37.76]} zoom={11.5}>
        <BitmapOverlay />
      </Map>
    </div>
  );
}
