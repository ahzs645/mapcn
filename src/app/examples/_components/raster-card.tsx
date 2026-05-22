"use client";

import { Map } from "@/registry/map";
import { MapRasterLayer } from "@/registry/map-layers";

export function RasterCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-73.98, 40.75]} zoom={11}>
        <MapRasterLayer
          tiles={["https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"]}
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
          opacity={0.7}
        />
      </Map>
    </div>
  );
}
