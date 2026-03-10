"use client";

import { useState, useMemo } from "react";
import { Map } from "@/registry/map";
import { MapGeoJsonLayer } from "@/registry/map-layers";

const regionColors: Record<string, string> = {
  West: "#e41a1c",
  Southwest: "#377eb8",
  Midwest: "#4daf4a",
  Southeast: "#984ea3",
  Northeast: "#ff7f00",
};

const stateRegions: Record<string, string> = {
  California: "West", Oregon: "West", Washington: "West", Nevada: "West",
  Idaho: "West", Montana: "West", Wyoming: "West", Colorado: "West",
  Utah: "West", Arizona: "Southwest", "New Mexico": "Southwest", Texas: "Southwest",
  Oklahoma: "Southwest", Kansas: "Midwest", Nebraska: "Midwest", "South Dakota": "Midwest",
  "North Dakota": "Midwest", Minnesota: "Midwest", Iowa: "Midwest", Missouri: "Midwest",
  Wisconsin: "Midwest", Illinois: "Midwest", Michigan: "Midwest", Indiana: "Midwest",
  Ohio: "Midwest", Florida: "Southeast", Georgia: "Southeast", Alabama: "Southeast",
  Mississippi: "Southeast", Louisiana: "Southeast", Arkansas: "Southeast",
  Tennessee: "Southeast", Kentucky: "Southeast", Virginia: "Southeast",
  "West Virginia": "Southeast", "North Carolina": "Southeast", "South Carolina": "Southeast",
  "New York": "Northeast", Pennsylvania: "Northeast", "New Jersey": "Northeast",
  Connecticut: "Northeast", Massachusetts: "Northeast", "Rhode Island": "Northeast",
  Vermont: "Northeast", "New Hampshire": "Northeast", Maine: "Northeast",
  Maryland: "Northeast", Delaware: "Northeast", Hawaii: "West", Alaska: "West",
};

const statesUrl =
  "https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json";

function LegendInner() {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const colorExpr = useMemo(() => {
    const expr: unknown[] = ["match", ["get", "name"]];
    for (const [state, region] of Object.entries(stateRegions)) {
      expr.push(state, hidden.has(region) ? "transparent" : regionColors[region]);
    }
    expr.push("#ccc");
    return expr;
  }, [hidden]);

  const toggle = (region: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(region)) next.delete(region);
      else next.add(region);
      return next;
    });
  };

  return (
    <>
      <MapGeoJsonLayer
        data={statesUrl}
        type="fill"
        paint={{ "fill-color": colorExpr, "fill-opacity": 0.7, "fill-outline-color": "#fff" }}
        interactive={false}
      />
      <div className="absolute bottom-3 left-3 z-10 rounded-md border bg-background/90 backdrop-blur-sm p-2 shadow-sm space-y-1">
        <p className="text-[10px] font-medium mb-1">US Regions</p>
        {Object.entries(regionColors).map(([region, color]) => (
          <button
            key={region}
            onClick={() => toggle(region)}
            className="flex items-center gap-1.5 text-[10px] w-full text-left hover:bg-accent rounded px-1 py-0.5 transition-colors"
          >
            <span
              className="size-2.5 rounded-sm border"
              style={{
                backgroundColor: hidden.has(region) ? "transparent" : color,
                borderColor: color,
              }}
            />
            <span className={hidden.has(region) ? "line-through text-muted-foreground" : ""}>
              {region}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

export function LegendCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-96, 37.8]} zoom={3}>
        <LegendInner />
      </Map>
    </div>
  );
}
