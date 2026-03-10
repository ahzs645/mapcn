"use client";

import { useEffect } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { H3HexagonLayer } from "@deck.gl/geo-layers";

interface H3Data {
  hex: string;
  value: number;
}

const DATA: H3Data[] = [
  { hex: "8828308281fffff", value: 850 },
  { hex: "8828308283fffff", value: 620 },
  { hex: "8828308285fffff", value: 340 },
  { hex: "8828308287fffff", value: 780 },
  { hex: "8828308289fffff", value: 450 },
  { hex: "882830828bfffff", value: 290 },
  { hex: "882830828dfffff", value: 920 },
  { hex: "882830828ffffff", value: 560 },
  { hex: "8828308291fffff", value: 380 },
  { hex: "8828308293fffff", value: 710 },
  { hex: "8828308295fffff", value: 490 },
  { hex: "8828308297fffff", value: 250 },
  { hex: "8828308299fffff", value: 830 },
  { hex: "882830829bfffff", value: 670 },
  { hex: "882830829dfffff", value: 410 },
  { hex: "882830829ffffff", value: 580 },
  { hex: "88283082a1fffff", value: 320 },
  { hex: "88283082a3fffff", value: 750 },
  { hex: "88283082a5fffff", value: 890 },
  { hex: "88283082a7fffff", value: 530 },
];

function valueToColor(value: number): [number, number, number, number] {
  const t = (value - 250) / (920 - 250);
  if (t < 0.5) {
    const s = t / 0.5;
    return [Math.round(s * 255), 200, Math.round((1 - s) * 100), 180];
  }
  const s = (t - 0.5) / 0.5;
  return [255, Math.round((1 - s) * 200), 0, 180];
}

function H3Overlay() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new H3HexagonLayer<H3Data>({
            id: "h3-hexagon-layer",
            data: DATA,
            getHexagon: (d) => d.hex,
            getFillColor: (d) => valueToColor(d.value),
            getElevation: (d) => d.value,
            elevationScale: 20,
            extruded: true,
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

export function DeckglH3Card() {
  return (
    <div className="h-full w-full">
      <Map center={[-122.4, 37.78]} zoom={11} pitch={45} theme="dark">
        <H3Overlay />
      </Map>
    </div>
  );
}
