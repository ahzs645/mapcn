"use client";

import { useEffect } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ScatterplotLayer } from "@deck.gl/layers";

interface PriceData {
  position: [number, number];
  price: number;
  city: string;
}

const DATA: PriceData[] = [
  { position: [-122.42, 37.77], price: 1200000, city: "San Francisco" },
  { position: [-118.24, 34.05], price: 900000, city: "Los Angeles" },
  { position: [-73.94, 40.73], price: 1100000, city: "New York" },
  { position: [-87.63, 41.88], price: 350000, city: "Chicago" },
  { position: [-95.37, 29.76], price: 320000, city: "Houston" },
  { position: [-112.07, 33.45], price: 420000, city: "Phoenix" },
  { position: [-75.16, 39.95], price: 380000, city: "Philadelphia" },
  { position: [-98.49, 29.42], price: 290000, city: "San Antonio" },
  { position: [-117.16, 32.72], price: 850000, city: "San Diego" },
  { position: [-96.8, 32.78], price: 380000, city: "Dallas" },
  { position: [-122.33, 47.61], price: 780000, city: "Seattle" },
  { position: [-84.39, 33.75], price: 380000, city: "Atlanta" },
  { position: [-104.99, 39.74], price: 550000, city: "Denver" },
  { position: [-80.19, 25.76], price: 580000, city: "Miami" },
  { position: [-71.06, 42.36], price: 720000, city: "Boston" },
  { position: [-93.27, 44.98], price: 320000, city: "Minneapolis" },
  { position: [-77.04, 38.91], price: 620000, city: "Washington DC" },
  { position: [-83.05, 42.33], price: 250000, city: "Detroit" },
  { position: [-122.68, 45.52], price: 520000, city: "Portland" },
  { position: [-90.2, 38.63], price: 220000, city: "St. Louis" },
  { position: [-86.16, 39.77], price: 250000, city: "Indianapolis" },
  { position: [-81.69, 41.5], price: 200000, city: "Cleveland" },
  { position: [-97.33, 32.75], price: 310000, city: "Fort Worth" },
  { position: [-85.76, 38.25], price: 230000, city: "Louisville" },
  { position: [-106.65, 35.08], price: 300000, city: "Albuquerque" },
];

function priceToColor(d: PriceData): [number, number, number, number] {
  const p = d.price;
  if (p >= 900000) return [180, 0, 30, 220]; // very high - deep red
  if (p >= 600000) return [240, 120, 30, 220]; // high - orange
  if (p >= 400000) return [240, 220, 50, 220]; // medium - yellow
  if (p >= 280000) return [80, 180, 80, 220]; // low - green
  return [40, 100, 220, 220]; // very low - blue
}

function PromapOverlay() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new ScatterplotLayer<PriceData>({
            id: "promap-layer",
            data: DATA,
            getPosition: (d) => d.position,
            getRadius: (d) => Math.sqrt(d.price) * 3,
            getFillColor: priceToColor,
            radiusMinPixels: 4,
            radiusMaxPixels: 40,
            opacity: 0.85,
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
        try {
          map.removeControl(overlay as unknown as maplibregl.IControl);
        } catch {}
      }
    };
  }, [map, isLoaded]);

  return null;
}

export function PromapCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-98.5, 39.8]} zoom={4} theme="dark">
        <PromapOverlay />
      </Map>
    </div>
  );
}
