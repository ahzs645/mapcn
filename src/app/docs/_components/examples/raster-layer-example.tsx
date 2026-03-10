"use client";

import { useState } from "react";
import { Map, MapControls } from "@/registry/map";
import { MapRasterLayer } from "@/registry/map-layers";

const tileSources = [
  {
    name: "OpenStreetMap",
    tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
    attribution: "&copy; OpenStreetMap contributors",
  },
  {
    name: "Stamen Toner",
    tiles: ["https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}.png"],
    attribution: "&copy; Stadia Maps &copy; Stamen Design",
  },
  {
    name: "Stamen Watercolor",
    tiles: ["https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg"],
    attribution: "&copy; Stadia Maps &copy; Stamen Design",
  },
];

export function RasterLayerExample() {
  const [activeSource, setActiveSource] = useState(0);
  const [opacity, setOpacity] = useState(0.7);

  const source = tileSources[activeSource];

  return (
    <div className="relative h-[400px] w-full">
      <Map center={[-73.98, 40.75]} zoom={11}>
        <MapRasterLayer
          id={`raster-${activeSource}`}
          tiles={source.tiles}
          attribution={source.attribution}
          opacity={opacity}
        />
        <MapControls />
      </Map>
      <div className="absolute top-3 left-3 z-10 rounded-md border bg-background/90 backdrop-blur-sm p-3 shadow-sm space-y-2">
        <p className="text-xs font-medium mb-2">Tile Source</p>
        <div className="flex flex-col gap-1">
          {tileSources.map((s, i) => (
            <button
              key={s.name}
              onClick={() => setActiveSource(i)}
              className={`text-xs px-2 py-1 rounded text-left transition-colors ${
                i === activeSource
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-1 border-t">
          <label className="text-xs font-medium">Opacity</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="w-20 accent-primary"
          />
          <span className="text-xs text-muted-foreground">{(opacity * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}
