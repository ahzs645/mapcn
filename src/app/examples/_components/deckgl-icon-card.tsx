"use client";

import { useEffect } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { IconLayer } from "@deck.gl/layers";

interface PoiData {
  position: [number, number];
  name: string;
  color: [number, number, number];
}

const DATA: PoiData[] = [
  { position: [-122.4194, 37.7749], name: "City Hall", color: [255, 0, 80] },
  { position: [-122.4097, 37.8085], name: "Fisherman's Wharf", color: [0, 140, 255] },
  { position: [-122.4786, 37.8199], name: "Golden Gate Bridge", color: [255, 140, 0] },
  { position: [-122.4064, 37.7855], name: "Chinatown", color: [200, 50, 255] },
  { position: [-122.3929, 37.7956], name: "Coit Tower", color: [0, 200, 120] },
  { position: [-122.4474, 37.8024], name: "Palace of Fine Arts", color: [255, 200, 0] },
  { position: [-122.5133, 37.7694], name: "Ocean Beach", color: [0, 180, 220] },
  { position: [-122.4583, 37.7694], name: "Golden Gate Park", color: [80, 200, 80] },
];

const ICON_MAPPING = {
  marker: { x: 0, y: 0, width: 128, height: 128, anchorY: 128, mask: true },
};

function IconOverlay() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new IconLayer<PoiData>({
            id: "icons",
            data: DATA,
            getPosition: (d) => d.position,
            getColor: (d) => d.color,
            getIcon: () => "marker",
            getSize: 40,
            iconAtlas: "https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/icon-atlas.png",
            iconMapping: ICON_MAPPING,
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

export function DeckglIconCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-122.44, 37.79]} zoom={12}>
        <IconOverlay />
      </Map>
    </div>
  );
}
