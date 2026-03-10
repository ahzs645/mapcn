"use client";

import { useState } from "react";
import { Map, MapRoute, MapMarker, MarkerContent } from "@/registry/map";
import { MapGeoJsonLayer } from "@/registry/map-layers";

const parkData: GeoJSON.FeatureCollection = {
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

const route: [number, number][] = [
  [-74.006, 40.7128], [-73.9857, 40.7484], [-73.9772, 40.7527], [-73.9654, 40.7829],
];

const markers = [
  { lng: -73.985, lat: 40.758, label: "A" },
  { lng: -73.945, lat: 40.678, label: "B" },
  { lng: -74.015, lat: 40.715, label: "C" },
];

export function LayerControlCard() {
  const [layers, setLayers] = useState({
    parks: true,
    route: true,
    markers: true,
  });

  const toggle = (key: keyof typeof layers) =>
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="relative h-full w-full">
      <Map center={[-73.97, 40.73]} zoom={10.5}>
        {layers.parks && (
          <>
            <MapGeoJsonLayer data={parkData} type="fill" paint={{ "fill-color": "#22c55e", "fill-opacity": 0.35 }} interactive={false} />
            <MapGeoJsonLayer id="parks-line" data={parkData} type="line" paint={{ "line-color": "#16a34a", "line-width": 2 }} interactive={false} />
          </>
        )}
        {layers.route && <MapRoute coordinates={route} color="#3b82f6" width={3} />}
        {layers.markers &&
          markers.map((m) => (
            <MapMarker key={m.label} longitude={m.lng} latitude={m.lat}>
              <MarkerContent>
                <div className="size-4 rounded-full bg-red-500 border-2 border-white shadow-lg flex items-center justify-center text-white text-[8px] font-bold">
                  {m.label}
                </div>
              </MarkerContent>
            </MapMarker>
          ))}
      </Map>
      <div className="absolute top-3 left-3 z-10 rounded-md border bg-background/90 backdrop-blur-sm p-2 shadow-sm space-y-1">
        <p className="text-[10px] font-medium mb-1">Layers</p>
        {([
          ["parks", "Parks", "#22c55e"],
          ["route", "Route", "#3b82f6"],
          ["markers", "Markers", "#ef4444"],
        ] as const).map(([key, label, color]) => (
          <label key={key} className="flex items-center gap-1.5 text-[10px] cursor-pointer">
            <input
              type="checkbox"
              checked={layers[key]}
              onChange={() => toggle(key)}
              className="accent-primary size-3"
            />
            <span className="size-2 rounded-sm" style={{ backgroundColor: color }} />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}
