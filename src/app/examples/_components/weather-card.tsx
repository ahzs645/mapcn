"use client";

import { useEffect, useState } from "react";
import { Map, MapMarker, MarkerContent, MarkerTooltip } from "@/registry/map";

interface CityWeather {
  name: string;
  lng: number;
  lat: number;
  temp?: number;
}

const cities: CityWeather[] = [
  { name: "New York", lng: -74.006, lat: 40.713 },
  { name: "London", lng: -0.118, lat: 51.509 },
  { name: "Tokyo", lng: 139.692, lat: 35.69 },
  { name: "Sydney", lng: 151.209, lat: -33.869 },
  { name: "Paris", lng: 2.349, lat: 48.864 },
  { name: "Dubai", lng: 55.296, lat: 25.276 },
  { name: "Mumbai", lng: 72.878, lat: 19.076 },
  { name: "São Paulo", lng: -46.636, lat: -23.548 },
  { name: "Cairo", lng: 31.236, lat: 30.044 },
  { name: "Moscow", lng: 37.618, lat: 55.751 },
  { name: "Beijing", lng: 116.397, lat: 39.904 },
  { name: "LA", lng: -118.244, lat: 34.052 },
  { name: "Singapore", lng: 103.82, lat: 1.352 },
  { name: "Lagos", lng: 3.379, lat: 6.524 },
  { name: "Mexico City", lng: -99.133, lat: 19.432 },
];

function tempColor(t: number): string {
  if (t < 0) return "#3b82f6";
  if (t < 10) return "#06b6d4";
  if (t < 20) return "#22c55e";
  if (t < 30) return "#eab308";
  return "#ef4444";
}

export function WeatherCard() {
  const [data, setData] = useState<CityWeather[]>(cities);

  useEffect(() => {
    const lats = cities.map((c) => c.lat).join(",");
    const lngs = cities.map((c) => c.lng).join(",");
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=temperature_2m`
    )
      .then((r) => r.json())
      .then((json) => {
        if (Array.isArray(json)) {
          setData(
            cities.map((c, i) => ({
              ...c,
              temp: json[i]?.current?.temperature_2m,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="h-full w-full">
      <Map center={[20, 20]} zoom={1}>
        {data.map((city) => (
          <MapMarker key={city.name} longitude={city.lng} latitude={city.lat}>
            <MarkerContent>
              <div
                className="rounded-full px-1.5 py-0.5 text-white text-[9px] font-semibold border border-white/50 shadow-sm whitespace-nowrap"
                style={{
                  backgroundColor:
                    city.temp != null ? tempColor(city.temp) : "#94a3b8",
                }}
              >
                {city.temp != null ? `${Math.round(city.temp)}°` : "..."}
              </div>
            </MarkerContent>
            <MarkerTooltip>{city.name}</MarkerTooltip>
          </MapMarker>
        ))}
      </Map>
    </div>
  );
}
