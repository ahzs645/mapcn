"use client";

import {
  Map,
  MapMarker,
  MarkerContent,
  MapRoute,
} from "@/registry/map";

const route: [number, number][] = [
  [-74.006, 40.7128],
  [-73.9857, 40.7484],
  [-73.9772, 40.7527],
  [-73.9654, 40.7829],
];

export function RouteCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-73.98, 40.75]} zoom={11.5}>
        <MapRoute coordinates={route} color="#3b82f6" width={3} opacity={0.8} />
        {route.map((coord, i) => (
          <MapMarker key={i} longitude={coord[0]} latitude={coord[1]}>
            <MarkerContent>
              <div className="size-4 rounded-full bg-blue-500 border-2 border-white shadow-lg flex items-center justify-center text-white text-[9px] font-bold">
                {i + 1}
              </div>
            </MarkerContent>
          </MapMarker>
        ))}
      </Map>
    </div>
  );
}
