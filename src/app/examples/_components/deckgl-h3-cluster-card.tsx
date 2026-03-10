"use client";

import { useEffect } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { H3ClusterLayer } from "@deck.gl/geo-layers";

interface H3ClusterData {
  hexagons: string[];
  value: number;
  name: string;
}

const DATA: H3ClusterData[] = [
  {
    name: "Downtown",
    hexagons: [
      "882830829bfffff",
      "88283082d7fffff",
      "88283082d3fffff",
      "88283082dbfffff",
      "882830829ffffff",
    ],
    value: 3000,
  },
  {
    name: "Mission",
    hexagons: [
      "8828308281fffff",
      "8828308285fffff",
      "882830828dfffff",
      "8828308289fffff",
    ],
    value: 2200,
  },
  {
    name: "Marina",
    hexagons: ["882830828bfffff", "8828308283fffff", "88283082c5fffff"],
    value: 1500,
  },
  {
    name: "Sunset",
    hexagons: [
      "88283095a9fffff",
      "88283095adfffff",
      "88283095a1fffff",
      "88283095a5fffff",
      "88283095b1fffff",
    ],
    value: 1800,
  },
  {
    name: "Richmond",
    hexagons: [
      "882830958dfffff",
      "8828309589fffff",
      "8828309585fffff",
      "88283095c1fffff",
    ],
    value: 1200,
  },
];

function valueToColor(value: number): [number, number, number, number] {
  const t = (value - 1200) / (3000 - 1200);
  const r = Math.round(80 + t * 175);
  const g = Math.round(200 - t * 100);
  const b = Math.round(180 - t * 50);
  return [r, g, b, 180];
}

function H3ClusterOverlay() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new H3ClusterLayer<H3ClusterData>({
            id: "h3-cluster-layer",
            data: DATA,
            getHexagons: (d) => d.hexagons,
            getFillColor: (d) => valueToColor(d.value),
            getElevation: (d) => d.value,
            extruded: true,
            pickable: true,
            autoHighlight: true,
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

export function DeckglH3ClusterCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-122.4, 37.78]} zoom={10} pitch={45} theme="dark">
        <H3ClusterOverlay />
      </Map>
    </div>
  );
}
