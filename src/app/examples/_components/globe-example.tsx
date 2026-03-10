"use client";

import { useEffect } from "react";
import { Map, useMap } from "@/registry/map";

function GlobeAutoRotate() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    let animating = true;

    function rotate() {
      if (!animating || !map) return;
      const center = map.getCenter();
      map.setCenter([center.lng + 0.15, center.lat]);
      requestAnimationFrame(rotate);
    }

    // Start rotation after a short delay
    const timeout = setTimeout(() => {
      rotate();
    }, 500);

    // Pause on interaction
    const pause = () => { animating = false; };
    const resume = () => {
      animating = true;
      rotate();
    };

    map.on("mousedown", pause);
    map.on("touchstart", pause);
    map.on("mouseup", resume);
    map.on("touchend", resume);

    return () => {
      animating = false;
      clearTimeout(timeout);
      map.off("mousedown", pause);
      map.off("touchstart", pause);
      map.off("mouseup", resume);
      map.off("touchend", resume);
    };
  }, [map, isLoaded]);

  return null;
}

export function GlobeExample() {
  return (
    <div className="h-full w-full min-h-[300px]">
      <Map
        center={[0, 20]}
        zoom={1.5}
        projection={{ type: "globe" }}
        styles={{
          light: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
          dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
        }}
      >
        <GlobeAutoRotate />
      </Map>
    </div>
  );
}
