"use client";

import { Map } from "@/registry/map";
import { MapRasterLayer } from "@/registry/map-layers";

export function RasterCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-73.98, 40.75]} zoom={11}>
        <MapRasterLayer
          tiles={["https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg"]}
          attribution="&copy; Stadia Maps &copy; Stamen Design"
          opacity={0.7}
        />
      </Map>
    </div>
  );
}
