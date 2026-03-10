"use client";

import { Map } from "@/registry/map";
import { MapImageLayer } from "@/registry/map-layers";

export function ImageCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-75.97, 42.19]} zoom={4}>
        <MapImageLayer
          url="https://docs.mapbox.com/mapbox-gl-js/assets/radar.gif"
          coordinates={[
            [-80.425, 46.437],
            [-71.516, 46.437],
            [-71.516, 37.936],
            [-80.425, 37.936],
          ]}
          opacity={0.85}
        />
      </Map>
    </div>
  );
}
