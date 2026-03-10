"use client";

import { useState, useMemo } from "react";
import { Map } from "@/registry/map";
import { MapGeoJsonLayer } from "@/registry/map-layers";

// Seeded random for deterministic HHI values
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

const stateNames = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming",
];

const rand = seededRandom(42);
const hhiData: Record<string, number> = {};
for (const name of stateNames) {
  hhiData[name] = Math.floor(1000 + rand() * 7000);
}

function getHhiColor(hhi: number): string {
  if (hhi < 2500) return "#22c55e"; // competitive (green)
  if (hhi <= 5000) return "#eab308"; // moderate (yellow)
  return "#ef4444"; // concentrated (red)
}

const statesUrl =
  "https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json";

function HhiMapInner() {
  const [hovered, setHovered] = useState<{ name: string; hhi: number } | null>(null);

  const colorExpression = useMemo(() => {
    const expr: unknown[] = ["match", ["get", "name"]];
    for (const [state, hhi] of Object.entries(hhiData)) {
      expr.push(state, getHhiColor(hhi));
    }
    expr.push("#ccc");
    return expr;
  }, []);

  return (
    <>
      <MapGeoJsonLayer
        data={statesUrl}
        type="fill"
        paint={{
          "fill-color": colorExpression,
          "fill-opacity": 0.7,
          "fill-outline-color": "#fff",
        }}
        onMouseEnter={(features) => {
          const name = features[0]?.properties?.name;
          if (name && hhiData[name] !== undefined) {
            setHovered({ name, hhi: hhiData[name] });
          }
        }}
        onMouseLeave={() => setHovered(null)}
        onClick={(features) => {
          const name = features[0]?.properties?.name;
          if (name && hhiData[name] !== undefined) {
            setHovered({ name, hhi: hhiData[name] });
          }
        }}
      />
      <MapGeoJsonLayer
        id="hhi-states-outline"
        data={statesUrl}
        type="line"
        paint={{ "line-color": "#fff", "line-width": 0.5 }}
        interactive={false}
      />

      {hovered && (
        <div className="absolute top-3 left-3 z-10 rounded-md border bg-background/90 backdrop-blur-sm px-3 py-2 text-sm shadow-sm">
          <p className="font-medium">{hovered.name}</p>
          <p className="text-muted-foreground text-xs">
            HHI: {hovered.hhi.toLocaleString()} —{" "}
            {hovered.hhi < 2500
              ? "Competitive"
              : hovered.hhi <= 5000
                ? "Moderate"
                : "Concentrated"}
          </p>
        </div>
      )}

      <div className="absolute top-3 right-3 z-10 rounded-md border bg-background/90 backdrop-blur-sm px-2.5 py-2 text-[10px] shadow-sm space-y-1.5">
        <p className="font-medium text-[11px]">Market Concentration (HHI)</p>
        <div className="space-y-1">
          {([
            ["< 2,500 — Competitive", "#22c55e"],
            ["2,500 - 5,000 — Moderate", "#eab308"],
            ["> 5,000 — Concentrated", "#ef4444"],
          ] as const).map(([label, color]) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ backgroundColor: color }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground text-[9px] pt-0.5">
          HHI: Herfindahl-Hirschman Index
        </p>
      </div>
    </>
  );
}

export function HhiMapCard() {
  return (
    <div className="relative h-full w-full min-h-[300px]">
      <Map center={[-98.5, 39.8]} zoom={3.5} maxZoom={7}>
        <HhiMapInner />
      </Map>
    </div>
  );
}
