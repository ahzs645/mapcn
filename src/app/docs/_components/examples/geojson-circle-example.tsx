"use client";

import { Map } from "@/registry/map";
import { MapGeoJsonLayer } from "@/registry/map-layers";

const coffeeShops: GeoJSON.FeatureCollection<GeoJSON.Point> = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", properties: { name: "Blue Bottle", rating: 4.5 }, geometry: { type: "Point", coordinates: [-73.9857, 40.7484] } },
    { type: "Feature", properties: { name: "Stumptown", rating: 4.3 }, geometry: { type: "Point", coordinates: [-73.9892, 40.7410] } },
    { type: "Feature", properties: { name: "Joe Coffee", rating: 4.6 }, geometry: { type: "Point", coordinates: [-73.9977, 40.7335] } },
    { type: "Feature", properties: { name: "Birch Coffee", rating: 4.4 }, geometry: { type: "Point", coordinates: [-73.9862, 40.7391] } },
    { type: "Feature", properties: { name: "Grumpy", rating: 4.7 }, geometry: { type: "Point", coordinates: [-73.9932, 40.7267] } },
    { type: "Feature", properties: { name: "Devocion", rating: 4.5 }, geometry: { type: "Point", coordinates: [-73.9631, 40.7140] } },
    { type: "Feature", properties: { name: "Toby's Estate", rating: 4.2 }, geometry: { type: "Point", coordinates: [-73.9896, 40.7194] } },
    { type: "Feature", properties: { name: "Sey Coffee", rating: 4.8 }, geometry: { type: "Point", coordinates: [-73.9235, 40.7225] } },
    { type: "Feature", properties: { name: "Partners", rating: 4.1 }, geometry: { type: "Point", coordinates: [-73.9753, 40.7519] } },
    { type: "Feature", properties: { name: "Abraço", rating: 4.6 }, geometry: { type: "Point", coordinates: [-73.9856, 40.7268] } },
  ],
};

export function GeoJsonCircleExample() {
  return (
    <div className="h-[400px] w-full">
      <Map center={[-73.98, 40.735]} zoom={12}>
        <MapGeoJsonLayer
          data={coffeeShops}
          type="circle"
          paint={{
            "circle-radius": [
              "interpolate", ["linear"], ["get", "rating"],
              4.0, 5,
              4.5, 8,
              5.0, 12,
            ],
            "circle-color": [
              "interpolate", ["linear"], ["get", "rating"],
              4.0, "#fbbf24",
              4.5, "#f97316",
              5.0, "#ef4444",
            ],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
            "circle-opacity": 0.85,
          }}
        />
      </Map>
    </div>
  );
}
