"use client";

import { useState } from "react";
import { Map, useMap } from "@/registry/map";
import { MapGeoJsonLayer } from "@/registry/map-layers";

const quakeUrl =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson";

function EarthquakeLayer() {
  const [info, setInfo] = useState<{ place: string; mag: number } | null>(null);

  return (
    <>
      <MapGeoJsonLayer
        data={quakeUrl}
        type="circle"
        paint={{
          "circle-radius": [
            "interpolate", ["linear"], ["get", "mag"],
            2.5, 3, 5, 8, 7, 16,
          ],
          "circle-color": [
            "interpolate", ["linear"], ["get", "mag"],
            2.5, "#00c864", 4, "#ffc800", 5.5, "#ff7800", 7, "#ff1e1e",
          ],
          "circle-opacity": 0.8,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#fff",
        }}
        onClick={(features) => {
          const p = features[0]?.properties;
          if (p) setInfo({ place: p.place, mag: Number(p.mag).toFixed(1) as unknown as number });
        }}
      />
      {info && (
        <div className="absolute top-3 left-3 z-10 rounded-md border bg-background/90 backdrop-blur-sm px-2 py-1.5 text-[11px] shadow-sm max-w-[200px]">
          <p className="font-medium">M{info.mag}</p>
          <p className="text-muted-foreground text-[10px] truncate">{info.place}</p>
        </div>
      )}
      <div className="absolute bottom-2 right-2 z-10 rounded border bg-background/90 backdrop-blur-sm px-1.5 py-1 text-[9px] shadow-sm space-y-0.5">
        {[["< 4", "#00c864"], ["4-5.5", "#ffc800"], ["5.5-7", "#ff7800"], ["7+", "#ff1e1e"]].map(
          ([l, c]) => (
            <div key={l} className="flex items-center gap-1">
              <span className="size-2 rounded-full" style={{ backgroundColor: c }} />
              {l}
            </div>
          )
        )}
      </div>
    </>
  );
}

export function EarthquakeGlobeCard() {
  return (
    <div className="h-full w-full">
      <Map center={[0, 20]} zoom={1.3} projection={{ type: "globe" }}>
        <EarthquakeLayer />
      </Map>
    </div>
  );
}
