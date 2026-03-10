"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ScatterplotLayer } from "@deck.gl/layers";

interface WindPoint {
  position: [number, number];
  speed: number; // m/s
  direction: number; // degrees
}

function generateWindData(): WindPoint[] {
  let seed = 123;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  const points: WindPoint[] = [];
  for (let i = 0; i < 200; i++) {
    const lng = -180 + rand() * 360;
    const lat = -60 + rand() * 120;
    points.push({
      position: [lng, lat],
      speed: rand() * 30,
      direction: rand() * 360,
    });
  }
  return points;
}

const windData = generateWindData();

function getWindColor(speed: number): [number, number, number, number] {
  if (speed < 7.5) return [59, 130, 246, 200];    // blue - calm
  if (speed < 15) return [34, 197, 94, 200];       // green - moderate
  if (speed < 22.5) return [234, 179, 8, 200];     // yellow - strong
  return [239, 68, 68, 200];                        // red - severe
}

function WindOverlay() {
  const { map, isLoaded } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const frameRef = useRef<number>(0);
  const [tick, setTick] = useState(0);

  // Animate: increment tick for subtle rotation effect
  useEffect(() => {
    let animating = true;
    let count = 0;
    function animate() {
      if (!animating) return;
      count++;
      if (count % 30 === 0) {
        setTick((t) => t + 1);
      }
      frameRef.current = requestAnimationFrame(animate);
    }
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      animating = false;
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      // Remove previous overlay if it exists
      if (overlayRef.current) {
        try { map.removeControl(overlayRef.current as unknown as maplibregl.IControl); } catch {}
      }

      overlay = new MapboxOverlay({
        layers: [
          new ScatterplotLayer<WindPoint>({
            id: "wind-points",
            data: windData,
            getPosition: (d) => d.position,
            getRadius: (d) => 8000 + d.speed * 3000,
            getFillColor: (d) => getWindColor(d.speed),
            radiusMinPixels: 3,
            radiusMaxPixels: 12,
            pickable: true,
          }),
          // Directional indicators: offset scatterplot layer to show wind direction
          new ScatterplotLayer<WindPoint>({
            id: "wind-direction",
            data: windData,
            getPosition: (d) => {
              const angle = ((d.direction + tick * 2) % 360) * (Math.PI / 180);
              const offset = 0.3 + d.speed * 0.03;
              return [
                d.position[0] + Math.cos(angle) * offset,
                d.position[1] + Math.sin(angle) * offset,
              ] as [number, number];
            },
            getRadius: (d) => 4000 + d.speed * 1500,
            getFillColor: (d) => getWindColor(d.speed),
            radiusMinPixels: 2,
            radiusMaxPixels: 6,
            opacity: 0.6,
          }),
        ],
      });
      overlayRef.current = overlay;
      map.addControl(overlay as unknown as maplibregl.IControl);
    };

    if (map.isStyleLoaded()) {
      addOverlay();
    } else {
      map.once("load", addOverlay);
    }

    return () => {
      map.off("load", addOverlay);
      if (overlay) {
        try { map.removeControl(overlay as unknown as maplibregl.IControl); } catch {}
      }
    };
  }, [map, isLoaded, tick]);

  return null;
}

export function WindCard() {
  return (
    <div className="relative h-full w-full">
      <Map center={[0, 30]} zoom={1.5} theme="dark">
        <WindOverlay />
      </Map>

      <div className="absolute bottom-3 right-3 z-10 rounded-md border bg-background/90 backdrop-blur-sm px-2.5 py-2 text-[10px] shadow-sm space-y-1.5">
        <p className="font-medium text-[11px]">Wind Speed (m/s)</p>
        <div className="space-y-1">
          {([
            ["0-7.5 Calm", "#3b82f6"],
            ["7.5-15 Moderate", "#22c55e"],
            ["15-22.5 Strong", "#eab308"],
            ["22.5-30 Severe", "#ef4444"],
          ] as const).map(([label, color]) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
