"use client";

import { Map } from "@/registry/map";
import { MapGeoJsonLayer } from "@/registry/map-layers";

const parks: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Central Park" },
      geometry: {
        type: "Polygon",
        coordinates: [[[-73.9812, 40.7681], [-73.9580, 40.8006], [-73.9493, 40.7968], [-73.9730, 40.7644], [-73.9812, 40.7681]]],
      },
    },
    {
      type: "Feature",
      properties: { name: "Prospect Park" },
      geometry: {
        type: "Polygon",
        coordinates: [[[-73.9750, 40.6602], [-73.9620, 40.6710], [-73.9560, 40.6680], [-73.9590, 40.6550], [-73.9690, 40.6520], [-73.9750, 40.6602]]],
      },
    },
  ],
};

export function GeoJsonCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-73.97, 40.73]} zoom={10.5}>
        <MapGeoJsonLayer
          data={parks}
          type="fill"
          paint={{ "fill-color": "#22c55e", "fill-opacity": 0.35 }}
        />
        <MapGeoJsonLayer
          id="park-outlines"
          data={parks}
          type="line"
          paint={{ "line-color": "#16a34a", "line-width": 2 }}
          interactive={false}
        />
      </Map>
    </div>
  );
}
