"use client";

import { useState } from "react";
import { Map } from "@/registry/map";
import { MapFillExtrusionLayer } from "@/registry/map-layers";

// Generate building-like blocks for a city grid
function generateBuildingData(): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  const features: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
  const baseLng = -74.006;
  const baseLat = 40.7128;
  const blockSize = 0.001;
  const gap = 0.0003;

  let seed = 123;
  const rand = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return seed / 2147483647;
  };

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const lng = baseLng + col * (blockSize + gap);
      const lat = baseLat + row * (blockSize + gap);
      const height = 20 + rand() * 200;
      const type = height > 150 ? "commercial" : height > 80 ? "residential" : "retail";

      features.push({
        type: "Feature",
        properties: {
          height,
          type,
          name: `Block ${row * 8 + col + 1}`,
        },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [lng, lat],
            [lng + blockSize, lat],
            [lng + blockSize, lat + blockSize],
            [lng, lat + blockSize],
            [lng, lat],
          ]],
        },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

const buildingData = generateBuildingData();

export function FillExtrusionExample() {
  const [selected, setSelected] = useState<{
    name: string;
    height: number;
    type: string;
  } | null>(null);

  return (
    <div className="relative h-[450px] w-full">
      <Map
        center={[-73.9995, 40.7168]}
        zoom={15.5}
        pitch={50}
        bearing={-20}
      >
        <MapFillExtrusionLayer
          data={buildingData}
          height={["get", "height"]}
          base={0}
          color={[
            "match",
            ["get", "type"],
            "commercial", "#3b82f6",
            "residential", "#8b5cf6",
            "retail", "#06b6d4",
            "#94a3b8",
          ]}
          opacity={0.75}
          onClick={(features) => {
            const props = features[0]?.properties;
            if (props) {
              setSelected({
                name: props.name,
                height: Math.round(props.height),
                type: props.type,
              });
            }
          }}
        />
      </Map>
      {selected && (
        <div className="absolute top-3 left-3 z-10 rounded-md border bg-background/90 backdrop-blur-sm px-3 py-2 text-sm shadow-sm">
          <p className="font-medium">{selected.name}</p>
          <p className="text-muted-foreground text-xs">
            {selected.height}m &middot; {selected.type}
          </p>
        </div>
      )}
      <div className="absolute bottom-3 right-3 z-10 rounded-md border bg-background/90 backdrop-blur-sm px-3 py-2 text-xs shadow-sm space-y-1">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-blue-500" /> Commercial
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-violet-500" /> Residential
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-cyan-500" /> Retail
        </div>
      </div>
    </div>
  );
}
