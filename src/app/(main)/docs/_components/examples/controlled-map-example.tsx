"use client";

import { useState } from "react";
import { Map, type MapViewport } from "@/registry/map";

export function ControlledMapExample() {
  const [viewport, setViewport] = useState<MapViewport>({
    center: [-74.006, 40.7128],
    zoom: 8,
    bearing: 0,
    pitch: 0,
  });

  return (
    <div className="h-[400px] relative w-full">
      <Map viewport={viewport} onViewportChange={setViewport} />
      <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-x-3 gap-y-1 text-xs font-mono bg-background/80 backdrop-blur px-2 py-1.5 rounded border">
        <span>
          <span className="text-muted-foreground">lng:</span>{" "}
          {viewport.center[0].toFixed(3)}
        </span>
        <span>
          <span className="text-muted-foreground">lat:</span>{" "}
          {viewport.center[1].toFixed(3)}
        </span>
        <span>
          <span className="text-muted-foreground">zoom:</span>{" "}
          {viewport.zoom.toFixed(1)}
        </span>
        <span>
          <span className="text-muted-foreground">bearing:</span>{" "}
          {viewport.bearing.toFixed(1)}°
        </span>
        <span>
          <span className="text-muted-foreground">pitch:</span>{" "}
          {viewport.pitch.toFixed(1)}°
        </span>
      </div>
    </div>
  );
}
