"use client";

import { useState } from "react";
import { Map, useMap } from "@/registry/map";

const cities = [
  { name: "New York", center: [-74.006, 40.7128] as [number, number], zoom: 12, pitch: 0, bearing: 0 },
  { name: "Paris", center: [2.3522, 48.8566] as [number, number], zoom: 13, pitch: 45, bearing: 30 },
  { name: "Tokyo", center: [139.6917, 35.6895] as [number, number], zoom: 11, pitch: 0, bearing: 0 },
  { name: "Sydney", center: [151.2093, -33.8688] as [number, number], zoom: 12, pitch: 60, bearing: -45 },
  { name: "Rio", center: [-43.1729, -22.9068] as [number, number], zoom: 11, pitch: 0, bearing: 0 },
  { name: "Dubai", center: [55.2708, 25.2048] as [number, number], zoom: 13, pitch: 50, bearing: 120 },
];

function FlyToControls() {
  const { map } = useMap();
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1">
      {cities.map((city) => (
        <button
          key={city.name}
          onClick={() => {
            setActive(city.name);
            map?.flyTo({
              center: city.center,
              zoom: city.zoom,
              pitch: city.pitch,
              bearing: city.bearing,
              duration: 2500,
            });
          }}
          className={`text-[11px] px-2 py-1 rounded border shadow-sm transition-colors ${
            active === city.name
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background/90 backdrop-blur-sm hover:bg-accent border-border"
          }`}
        >
          {city.name}
        </button>
      ))}
    </div>
  );
}

export function FlyToExample() {
  return (
    <div className="h-full w-full min-h-[300px]">
      <Map center={[-74.006, 40.7128]} zoom={2}>
        <FlyToControls />
      </Map>
    </div>
  );
}
