"use client";

import { useState, useMemo } from "react";
import { Map, MapMarker, MarkerContent, MarkerTooltip, MapRoute } from "@/registry/map";

const locations = [
  { name: "Warehouse", lng: -73.95, lat: 40.78, type: "warehouse" },
  { name: "Store Manhattan", lng: -73.985, lat: 40.758, type: "store" },
  { name: "Store Brooklyn", lng: -73.945, lat: 40.678, type: "store" },
  { name: "Customer A", lng: -74.015, lat: 40.715, type: "customer" },
  { name: "Customer B", lng: -73.92, lat: 40.73, type: "customer" },
  { name: "Customer C", lng: -73.97, lat: 40.695, type: "customer" },
];

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distColor(km: number) {
  if (km < 5) return "#22c55e";
  if (km < 10) return "#eab308";
  return "#ef4444";
}

const typeColor: Record<string, string> = {
  warehouse: "#3b82f6",
  store: "#8b5cf6",
  customer: "#f97316",
};

export function ProximityCard() {
  const [selected, setSelected] = useState(0);
  const origin = locations[selected];

  const connections = useMemo(
    () =>
      locations
        .filter((_, i) => i !== selected)
        .map((dest) => ({
          dest,
          km: haversine(origin.lat, origin.lng, dest.lat, dest.lng),
        })),
    [selected, origin]
  );

  return (
    <div className="relative h-full w-full">
      <Map center={[-73.97, 40.73]} zoom={10.5}>
        {connections.map((c) => (
          <MapRoute
            key={c.dest.name}
            coordinates={[
              [origin.lng, origin.lat],
              [c.dest.lng, c.dest.lat],
            ]}
            color={distColor(c.km)}
            width={2}
            opacity={0.7}
          />
        ))}
        {locations.map((loc, i) => (
          <MapMarker
            key={loc.name}
            longitude={loc.lng}
            latitude={loc.lat}
            onClick={() => setSelected(i)}
          >
            <MarkerContent>
              <div
                className="size-3.5 rounded-full border-2 border-white shadow-lg cursor-pointer"
                style={{ backgroundColor: typeColor[loc.type] }}
              />
            </MarkerContent>
            <MarkerTooltip>{loc.name}</MarkerTooltip>
          </MapMarker>
        ))}
      </Map>
      <div className="absolute bottom-2 left-2 z-10 rounded border bg-background/90 backdrop-blur-sm px-1.5 py-1 text-[9px] shadow-sm space-y-0.5">
        {[["< 5 km", "#22c55e"], ["5-10 km", "#eab308"], ["> 10 km", "#ef4444"]].map(([l, c]) => (
          <div key={l} className="flex items-center gap-1">
            <span className="size-2 rounded-sm" style={{ backgroundColor: c }} />
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}
