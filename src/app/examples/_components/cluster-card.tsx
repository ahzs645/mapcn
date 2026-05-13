"use client";

import { Map, MapClusterLayer } from "@/registry/map";
import { MapLegend, MapLegendItem } from "@/registry/map-ui";

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
        <MapLegend title="Cluster Size" position="bottom-left" collapsible>
          <MapLegendItem color="#22c55e" label="1-20 points" swatchShape="dot" disabled />
          <MapLegendItem color="#eab308" label="21-100 points" swatchShape="dot" disabled />
          <MapLegendItem color="#ef4444" label="100+ points" swatchShape="dot" disabled />
          <MapLegendItem color="#ef4444" label="Single point" swatchShape="dot" disabled />
        </MapLegend>
      </Map>
    </div>
  );
}
