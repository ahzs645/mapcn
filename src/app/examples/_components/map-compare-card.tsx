"use client";

import { useState, useRef, useCallback } from "react";
import { Map } from "@/registry/map";

export function MapCompareCard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(50);
  const dragging = useRef(false);

  const [viewport, setViewport] = useState({
    center: [-74.006, 40.7128] as [number, number],
    zoom: 12,
    bearing: 0,
    pitch: 0,
  });

  const handlePointerDown = useCallback(() => {
    dragging.current = true;
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplit(Math.max(10, Math.min(90, pct)));
    },
    []
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Light map (full width behind) */}
      <div className="absolute inset-0">
        <Map
          viewport={viewport}
          onViewportChange={setViewport}
          styles={{
            light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
            dark: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
          }}
        />
      </div>
      {/* Dark map (clipped) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ clipPath: `inset(0 0 0 ${split}%)` }}
      >
        <div className="pointer-events-auto h-full w-full">
          <Map
            viewport={viewport}
            onViewportChange={setViewport}
            styles={{
              light: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
              dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
            }}
          />
        </div>
      </div>
      {/* Divider */}
      <div
        className="absolute top-0 bottom-0 z-20 w-1 bg-white/80 cursor-col-resize shadow-md"
        style={{ left: `${split}%`, transform: "translateX(-50%)" }}
        onPointerDown={handlePointerDown}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-6 rounded-full bg-white shadow-md border flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground">⇔</span>
        </div>
      </div>
      <div className="absolute top-2 left-2 z-10 text-[10px] px-1.5 py-0.5 rounded bg-background/80 backdrop-blur-sm border">Light</div>
      <div className="absolute top-2 right-2 z-10 text-[10px] px-1.5 py-0.5 rounded bg-background/80 backdrop-blur-sm border">Dark</div>
    </div>
  );
}
