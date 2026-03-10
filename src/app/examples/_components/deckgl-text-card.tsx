"use client";

import { useEffect } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { TextLayer } from "@deck.gl/layers";

interface PlaceData {
  coordinates: [number, number];
  name: string;
}

const DATA: PlaceData[] = [
  { coordinates: [-122.4194, 37.7749], name: "San Francisco" },
  { coordinates: [-122.2712, 37.8044], name: "Oakland" },
  { coordinates: [-122.0322, 37.3230], name: "San Jose" },
  { coordinates: [-122.4064, 37.7855], name: "Chinatown" },
  { coordinates: [-122.4097, 37.8085], name: "Fisherman's Wharf" },
  { coordinates: [-122.4786, 37.8199], name: "Golden Gate Bridge" },
  { coordinates: [-122.3894, 37.6161], name: "SFO Airport" },
  { coordinates: [-122.3542, 37.9316], name: "Richmond" },
  { coordinates: [-122.0575, 37.5585], name: "Fremont" },
];

function TextOverlay() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new TextLayer<PlaceData>({
            id: "text-labels",
            data: DATA,
            getPosition: (d) => d.coordinates,
            getText: (d) => d.name,
            getSize: 16,
            getColor: [255, 255, 255],
            getTextAnchor: "middle" as const,
            getAlignmentBaseline: "center" as const,
            fontFamily: "Arial, sans-serif",
            fontWeight: "bold",
            outlineWidth: 2,
            outlineColor: [0, 0, 0, 200],
            pickable: true,
            billboard: true,
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

export function DeckglTextCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-122.3, 37.7]} zoom={9} theme="dark">
        <TextOverlay />
      </Map>
    </div>
  );
}
