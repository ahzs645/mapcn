"use client";

import { useState } from "react";
import { Map } from "@/registry/map";

const styles = [
  {
    name: "Light",
    light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  },
  {
    name: "Voyager",
    light: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
    dark: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
  },
  {
    name: "OSM Liberty",
    light: "https://tiles.openfreemap.org/styles/liberty",
    dark: "https://tiles.openfreemap.org/styles/liberty",
  },
];

export function StyleSwitcherExample() {
  const [active, setActive] = useState(0);
  const style = styles[active];

  return (
    <div className="relative h-full w-full min-h-[300px]">
      <Map
        key={active}
        center={[-74.006, 40.7128]}
        zoom={12}
        styles={{ light: style.light, dark: style.dark }}
      />
      <div className="absolute bottom-3 left-3 z-10 flex gap-1">
        {styles.map((s, i) => (
          <button
            key={s.name}
            onClick={() => setActive(i)}
            className={`text-[11px] px-2 py-1 rounded border shadow-sm transition-colors ${
              i === active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background/90 backdrop-blur-sm hover:bg-accent border-border"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}
