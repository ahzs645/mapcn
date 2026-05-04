"use client";

import { useState } from "react";
import { Map, MapRoute, MapMarker, MarkerContent } from "@/registry/map";
import { MapGeoJsonLayer } from "@/registry/map-layers";
import {
  MapLayerToggle,
  MapLegend,
  MapNumberedMarker,
} from "@/registry/map-ui";

const parkData: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Central Park" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-73.9812, 40.7681],
            [-73.958, 40.8006],
            [-73.9493, 40.7968],
            [-73.973, 40.7644],
            [-73.9812, 40.7681],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "Prospect Park" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-73.975, 40.6602],
            [-73.962, 40.671],
            [-73.956, 40.668],
            [-73.959, 40.655],
            [-73.969, 40.652],
            [-73.975, 40.6602],
          ],
        ],
      },
    },
  ],
};

const route: [number, number][] = [
  [-74.006, 40.7128],
  [-73.9857, 40.7484],
  [-73.9772, 40.7527],
  [-73.9654, 40.7829],
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
            <MapGeoJsonLayer
              data={parkData}
              type="fill"
              paint={{ "fill-color": "#22c55e", "fill-opacity": 0.35 }}
              interactive={false}
            />
            <MapGeoJsonLayer
              id="parks-line"
              data={parkData}
              type="line"
              paint={{ "line-color": "#16a34a", "line-width": 2 }}
              interactive={false}
            />
          </>
        )}
        {layers.route && (
          <MapRoute coordinates={route} color="#3b82f6" width={3} />
        )}
        {layers.markers &&
          markers.map((m) => (
            <MapMarker key={m.label} longitude={m.lng} latitude={m.lat}>
              <MarkerContent>
                <MapNumberedMarker
                  color="#ef4444"
                  label={m.label}
                  className="text-[8px]"
                />
              </MarkerContent>
            </MapMarker>
          ))}
      </Map>
      <MapLegend title="Layers">
        {(
          [
            ["parks", "Parks", "#22c55e"],
            ["route", "Route", "#3b82f6"],
            ["markers", "Markers", "#ef4444"],
          ] as const
        ).map(([key, label, color]) => (
          <MapLayerToggle
            key={key}
            checked={layers[key]}
            color={color}
            label={label}
            onCheckedChange={() => toggle(key)}
          />
        ))}
      </MapLegend>
    </div>
  );
}
