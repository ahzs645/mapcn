"use client";

import { useState } from "react";
import { Map } from "@/registry/map";
import { MapGeoJsonLayer } from "@/registry/map-layers";

const parkData: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Central Park", area: "843 acres" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-73.9812, 40.7681],
            [-73.9580, 40.8006],
            [-73.9493, 40.7968],
            [-73.9730, 40.7644],
            [-73.9812, 40.7681],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "Prospect Park", area: "526 acres" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-73.9750, 40.6602],
            [-73.9620, 40.6710],
            [-73.9560, 40.6680],
            [-73.9590, 40.6550],
            [-73.9690, 40.6520],
            [-73.9750, 40.6602],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "Battery Park", area: "25 acres" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-74.0180, 40.7033],
            [-74.0140, 40.7060],
            [-74.0090, 40.7040],
            [-74.0130, 40.7010],
            [-74.0180, 40.7033],
          ],
        ],
      },
    },
  ],
};

const outlineData: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: parkData.features,
};

export function GeoJsonLayerExample() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="h-[400px] w-full">
      <Map center={[-73.97, 40.73]} zoom={10.5}>
        <MapGeoJsonLayer
          data={parkData}
          type="fill"
          paint={{
            "fill-color": "#22c55e",
            "fill-opacity": 0.35,
          }}
          onClick={(features) => {
            const name = features[0]?.properties?.name;
            setSelected(name ?? null);
          }}
        />
        <MapGeoJsonLayer
          id="park-outlines"
          data={outlineData}
          type="line"
          paint={{
            "line-color": "#16a34a",
            "line-width": 2,
          }}
          interactive={false}
        />

        {selected && (
          <div className="absolute top-3 left-3 z-10 rounded-md border bg-background/90 backdrop-blur-sm px-3 py-2 text-sm shadow-sm">
            <p className="font-medium">{selected}</p>
            <p className="text-muted-foreground text-xs">
              {parkData.features.find((f) => f.properties?.name === selected)?.properties?.area}
            </p>
          </div>
        )}
      </Map>
    </div>
  );
}
