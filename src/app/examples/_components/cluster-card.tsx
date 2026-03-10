"use client";

import { Map, MapClusterLayer } from "@/registry/map";

export function ClusterCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-98, 38.8]} zoom={3}>
        <MapClusterLayer
          data="https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson"
          clusterColors={["#22c55e", "#eab308", "#ef4444"]}
          clusterThresholds={[20, 100]}
          pointColor="#ef4444"
        />
      </Map>
    </div>
  );
}
