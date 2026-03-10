"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ColumnLayer } from "@deck.gl/layers";
import { cn } from "@/lib/utils";

interface SnowPoint {
  position: [number, number];
  depth: number; // inches
}

const BOROUGHS: Record<string, { center: [number, number]; zoom: number }> = {
  Manhattan: { center: [-73.975, 40.758], zoom: 13 },
  Brooklyn: { center: [-73.944, 40.678], zoom: 12.5 },
  Queens: { center: [-73.794, 40.728], zoom: 12 },
  Bronx: { center: [-73.865, 40.845], zoom: 12.5 },
  "Staten Island": { center: [-74.151, 40.58], zoom: 12 },
};

function generateSnowData(rate: number): SnowPoint[] {
  let seed = 77;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  const points: SnowPoint[] = [];

  // Grid over Manhattan
  for (let lng = -74.02; lng < -73.93; lng += 0.003) {
    for (let lat = 40.7; lat < 40.82; lat += 0.003) {
      points.push({
        position: [lng + (rand() - 0.5) * 0.001, lat + (rand() - 0.5) * 0.001],
        depth: rand() * 12 * (rate / 5),
      });
    }
  }

  // Add points for Brooklyn
  for (let lng = -73.99; lng < -73.9; lng += 0.004) {
    for (let lat = 40.64; lat < 40.7; lat += 0.004) {
      points.push({
        position: [lng + (rand() - 0.5) * 0.001, lat + (rand() - 0.5) * 0.001],
        depth: rand() * 10 * (rate / 5),
      });
    }
  }

  // Add points for Queens
  for (let lng = -73.87; lng < -73.75; lng += 0.005) {
    for (let lat = 40.7; lat < 40.78; lat += 0.005) {
      points.push({
        position: [lng + (rand() - 0.5) * 0.001, lat + (rand() - 0.5) * 0.001],
        depth: rand() * 8 * (rate / 5),
      });
    }
  }

  return points;
}

function getSnowColor(depth: number): [number, number, number, number] {
  // Light blue to white gradient based on depth
  const t = Math.min(depth / 12, 1);
  return [
    Math.floor(173 + t * 82),   // 173 -> 255
    Math.floor(216 + t * 39),   // 216 -> 255
    Math.floor(230 + t * 25),   // 230 -> 255
    200,
  ];
}

function SnowOverlay({ snowRate }: { snowRate: number }) {
  const { map, isLoaded } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const data = useRef(generateSnowData(snowRate));

  useEffect(() => {
    data.current = generateSnowData(snowRate);
  }, [snowRate]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new ColumnLayer({
            id: "snow-columns",
            data: data.current,
            getPosition: (d: SnowPoint) => d.position,
            getElevation: (d: SnowPoint) => d.depth * 30,
            elevationScale: 1,
            radius: 40,
            getFillColor: (d: SnowPoint) => getSnowColor(d.depth),
            extruded: true,
            pickable: true,
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
  }, [map, isLoaded, snowRate]);

  return null;
}

function BoroughFlyTo({ borough }: { borough: string }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;
    const target = BOROUGHS[borough];
    if (target) {
      map.flyTo({ center: target.center, zoom: target.zoom, duration: 1500 });
    }
  }, [map, isLoaded, borough]);

  return null;
}

export function NycSnowPlowingCard() {
  const [borough, setBorough] = useState("Manhattan");
  const [snowRate, setSnowRate] = useState(5);

  return (
    <div className="relative h-full w-full">
      <Map
        center={[-74.006, 40.7128]}
        zoom={12}
        pitch={45}
        theme="dark"
      >
        <SnowOverlay snowRate={snowRate} />
        <BoroughFlyTo borough={borough} />
      </Map>

      <div className="absolute top-3 left-3 z-10 rounded-md border bg-background/90 backdrop-blur-sm px-3 py-2.5 shadow-sm space-y-2 w-[170px]">
        <p className="font-medium text-[11px]">NYC Snow Accumulation</p>

        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground">Borough</p>
          <select
            value={borough}
            onChange={(e) => setBorough(e.target.value)}
            className="w-full rounded border bg-background px-1.5 py-1 text-[10px]"
          >
            {Object.keys(BOROUGHS).map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground">
            Snowfall Rate: {snowRate} in/hr
          </p>
          <input
            type="range"
            min={1}
            max={10}
            value={snowRate}
            onChange={(e) => setSnowRate(Number(e.target.value))}
            className="w-full h-1 accent-primary"
          />
        </div>

        <div className="space-y-0.5 pt-1 border-t">
          <p className="text-[9px] text-muted-foreground font-medium">Depth Legend</p>
          <div className="flex items-center gap-1">
            <div className="h-2 flex-1 rounded-sm" style={{
              background: "linear-gradient(to right, #add8e6, #e0f0ff, #ffffff)",
            }} />
          </div>
          <div className="flex justify-between text-[8px] text-muted-foreground">
            <span>0 in</span>
            <span>6 in</span>
            <span>12 in</span>
          </div>
        </div>
      </div>
    </div>
  );
}
