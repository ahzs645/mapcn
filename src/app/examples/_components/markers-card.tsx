"use client";

import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerTooltip,
} from "@/registry/map";

const places = [
  { name: "Empire State", lng: -73.9857, lat: 40.7484 },
  { name: "Central Park", lng: -73.9654, lat: 40.7829 },
  { name: "Times Square", lng: -73.9855, lat: 40.758 },
  { name: "Brooklyn Bridge", lng: -73.9969, lat: 40.7061 },
  { name: "Statue of Liberty", lng: -74.0445, lat: 40.6892 },
];

export function MarkersCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-73.98, 40.74]} zoom={11}>
        {places.map((p) => (
          <MapMarker key={p.name} longitude={p.lng} latitude={p.lat}>
            <MarkerContent>
              <div className="size-3 rounded-full bg-blue-500 border-2 border-white shadow-lg" />
            </MarkerContent>
            <MarkerTooltip>{p.name}</MarkerTooltip>
          </MapMarker>
        ))}
      </Map>
    </div>
  );
}
