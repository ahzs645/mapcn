"use client";

import { Map, MapControls } from "@/registry/map";

export function BasicMapCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-73.98, 40.75]} zoom={12}>
        <MapControls />
      </Map>
    </div>
  );
}
