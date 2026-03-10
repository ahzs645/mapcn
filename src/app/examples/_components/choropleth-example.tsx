"use client";

import { useState, useMemo } from "react";
import { Map, useMap } from "@/registry/map";
import { MapGeoJsonLayer } from "@/registry/map-layers";

const unemploymentData: Record<string, number> = {
  Alabama: 5.3, Alaska: 6.6, Arizona: 5.2, Arkansas: 5.1, California: 5.3,
  Colorado: 3.7, Connecticut: 5.1, Delaware: 5.0, Florida: 5.6, Georgia: 5.2,
  Hawaii: 3.6, Idaho: 4.7, Illinois: 6.0, Indiana: 5.3, Iowa: 3.7,
  Kansas: 4.2, Kentucky: 5.4, Louisiana: 5.1, Maine: 5.0, Maryland: 4.6,
  Massachusetts: 5.4, Michigan: 5.4, Minnesota: 3.9, Mississippi: 5.7,
  Missouri: 4.5, Montana: 4.2, Nebraska: 2.9, Nevada: 6.1, "New Hampshire": 3.3,
  "New Jersey": 5.3, "New Mexico": 5.3, "New York": 5.3, "North Carolina": 5.1,
  "North Dakota": 2.7, Ohio: 5.0, Oklahoma: 4.3, Oregon: 5.2, Pennsylvania: 5.1,
  "Rhode Island": 5.3, "South Carolina": 5.4, "South Dakota": 3.2,
  Tennessee: 5.0, Texas: 4.4, Utah: 3.5, Vermont: 3.7, Virginia: 4.2,
  Washington: 4.8, "West Virginia": 5.5, Wisconsin: 4.4, Wyoming: 4.1,
};

function getColor(rate: number): string {
  if (rate > 6) return "#08519c";
  if (rate > 5.5) return "#3182bd";
  if (rate > 5) return "#6baed6";
  if (rate > 4.5) return "#9ecae1";
  if (rate > 4) return "#c6dbef";
  return "#eff3ff";
}

const statesUrl =
  "https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json";

function ChoroplethInner() {
  const [hovered, setHovered] = useState<{ name: string; rate: number } | null>(null);

  const colorExpression = useMemo(() => {
    const expr: unknown[] = ["match", ["get", "name"]];
    for (const [state, rate] of Object.entries(unemploymentData)) {
      expr.push(state, getColor(rate));
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
          "fill-opacity": 0.75,
          "fill-outline-color": "#fff",
        }}
        onClick={(features) => {
          const name = features[0]?.properties?.name;
          if (name && unemploymentData[name] !== undefined) {
            setHovered({ name, rate: unemploymentData[name] });
          }
        }}
        onMouseEnter={(features) => {
          const name = features[0]?.properties?.name;
          if (name && unemploymentData[name] !== undefined) {
            setHovered({ name, rate: unemploymentData[name] });
          }
        }}
        onMouseLeave={() => setHovered(null)}
      />
      <MapGeoJsonLayer
        id="states-outline"
        data={statesUrl}
        type="line"
        paint={{ "line-color": "#fff", "line-width": 0.5 }}
        interactive={false}
      />
      {hovered && (
        <div className="absolute top-3 left-3 z-10 rounded-md border bg-background/90 backdrop-blur-sm px-3 py-2 text-sm shadow-sm">
          <p className="font-medium">{hovered.name}</p>
          <p className="text-muted-foreground text-xs">{hovered.rate}% unemployment</p>
        </div>
      )}
      <div className="absolute bottom-3 right-3 z-10 rounded-md border bg-background/90 backdrop-blur-sm px-2 py-1.5 text-[10px] shadow-sm space-y-0.5">
        {[
          ["< 4%", "#eff3ff"], ["4-4.5%", "#c6dbef"], ["4.5-5%", "#9ecae1"],
          ["5-5.5%", "#6baed6"], ["5.5-6%", "#3182bd"], ["> 6%", "#08519c"],
        ].map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm" style={{ backgroundColor: color }} />
            {label}
          </div>
        ))}
      </div>
    </>
  );
}

export function ChoroplethExample() {
  return (
    <div className="h-full w-full min-h-[300px]">
      <Map center={[-96, 37.8]} zoom={3} maxZoom={7}>
        <ChoroplethInner />
      </Map>
    </div>
  );
}
