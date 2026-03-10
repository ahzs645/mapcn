"use client";

import { Map } from "@/registry/map";
import { MapFillExtrusionLayer } from "@/registry/map-layers";

function generateBuildings(): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  const features: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
  const baseLng = -74.006;
  const baseLat = 40.7128;
  const s = 0.001;
  const g = 0.0003;
  let seed = 123;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const lng = baseLng + c * (s + g);
      const lat = baseLat + r * (s + g);
      const h = 20 + rand() * 200;
      const t = h > 150 ? "commercial" : h > 80 ? "residential" : "retail";
      features.push({
        type: "Feature",
        properties: { height: h, type: t },
        geometry: {
          type: "Polygon",
          coordinates: [[[lng, lat], [lng + s, lat], [lng + s, lat + s], [lng, lat + s], [lng, lat]]],
        },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

const data = generateBuildings();

export function BuildingsCard() {
  return (
    <div className="h-full w-full">
      <Map center={[-74.0005, 40.716]} zoom={15.5} pitch={50} bearing={-20}>
        <MapFillExtrusionLayer
          data={data}
          height={["get", "height"]}
          color={[
            "match", ["get", "type"],
            "commercial", "#3b82f6",
            "residential", "#8b5cf6",
            "retail", "#06b6d4",
            "#94a3b8",
          ]}
          opacity={0.75}
        />
      </Map>
    </div>
  );
}
