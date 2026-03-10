"use client";

import { useEffect, useRef, useState } from "react";
import { Map, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ScatterplotLayer, PathLayer } from "@deck.gl/layers";

interface BusData {
  id: number;
  position: [number, number];
  route: string;
  bearing: number;
  speed: number; // mph
  color: [number, number, number];
}

interface RouteData {
  name: string;
  path: [number, number][];
  color: [number, number, number];
}

const ROUTE_COLORS: Record<string, [number, number, number]> = {
  "51A": [59, 130, 246],   // blue
  "1R": [239, 68, 68],     // red
  "72": [34, 197, 94],     // green
  "NL": [168, 85, 247],    // purple
  "F": [234, 179, 8],      // yellow
};

function generateBuses(): BusData[] {
  let seed = 55;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  const routes = Object.keys(ROUTE_COLORS);
  const buses: BusData[] = [];

  for (let i = 0; i < 20; i++) {
    const route = routes[Math.floor(rand() * routes.length)];
    buses.push({
      id: i,
      position: [
        -122.35 + (rand() - 0.5) * 0.2,
        37.75 + (rand() - 0.5) * 0.15,
      ],
      route,
      bearing: rand() * 360,
      speed: 5 + rand() * 30,
      color: ROUTE_COLORS[route],
    });
  }
  return buses;
}

const SAMPLE_ROUTES: RouteData[] = [
  {
    name: "51A",
    color: [59, 130, 246],
    path: [
      [-122.27, 37.87], [-122.275, 37.86], [-122.28, 37.85],
      [-122.285, 37.84], [-122.29, 37.83], [-122.295, 37.82],
      [-122.3, 37.81], [-122.305, 37.80],
    ],
  },
  {
    name: "1R",
    color: [239, 68, 68],
    path: [
      [-122.26, 37.88], [-122.265, 37.875], [-122.27, 37.87],
      [-122.28, 37.86], [-122.29, 37.85], [-122.295, 37.84],
      [-122.3, 37.835],
    ],
  },
  {
    name: "72",
    color: [34, 197, 94],
    path: [
      [-122.24, 37.82], [-122.25, 37.825], [-122.26, 37.83],
      [-122.27, 37.835], [-122.28, 37.84], [-122.29, 37.845],
    ],
  },
  {
    name: "NL",
    color: [168, 85, 247],
    path: [
      [-122.35, 37.80], [-122.34, 37.805], [-122.33, 37.81],
      [-122.32, 37.815], [-122.31, 37.82], [-122.30, 37.825],
    ],
  },
  {
    name: "F",
    color: [234, 179, 8],
    path: [
      [-122.38, 37.78], [-122.37, 37.785], [-122.36, 37.79],
      [-122.35, 37.795], [-122.34, 37.80], [-122.33, 37.805],
    ],
  },
];

function BusOverlay() {
  const { map, isLoaded } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const busesRef = useRef(generateBuses());
  const frameRef = useRef<number>(0);
  const [, forceUpdate] = useState(0);

  // Animate bus positions
  useEffect(() => {
    let animating = true;
    let count = 0;

    function animate() {
      if (!animating) return;
      count++;

      // Update positions every 60 frames (~1 second)
      if (count % 60 === 0) {
        busesRef.current = busesRef.current.map((bus) => {
          const angle = bus.bearing * (Math.PI / 180);
          const delta = 0.0003 * (bus.speed / 20);
          return {
            ...bus,
            position: [
              bus.position[0] + Math.cos(angle) * delta,
              bus.position[1] + Math.sin(angle) * delta,
            ] as [number, number],
            bearing: bus.bearing + (Math.random() - 0.5) * 10,
          };
        });
        forceUpdate((n) => n + 1);
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
      if (overlayRef.current) {
        try { map.removeControl(overlayRef.current as unknown as maplibregl.IControl); } catch {}
      }

      overlay = new MapboxOverlay({
        layers: [
          new PathLayer<RouteData>({
            id: "bus-routes",
            data: SAMPLE_ROUTES,
            getPath: (d) => d.path,
            getColor: (d) => [...d.color, 100] as [number, number, number, number],
            getWidth: 3,
            widthMinPixels: 1.5,
            capRounded: true,
            jointRounded: true,
          }),
          new ScatterplotLayer<BusData>({
            id: "bus-positions",
            data: busesRef.current,
            getPosition: (d) => d.position,
            getFillColor: (d) => [...d.color, 220] as [number, number, number, number],
            getRadius: 80,
            radiusMinPixels: 5,
            radiusMaxPixels: 14,
            pickable: true,
            stroked: true,
            getLineColor: [255, 255, 255, 200],
            getLineWidth: 2,
            lineWidthMinPixels: 1,
          }),
          // Bearing indicator (small offset dot showing direction)
          new ScatterplotLayer<BusData>({
            id: "bus-bearing",
            data: busesRef.current,
            getPosition: (d) => {
              const angle = d.bearing * (Math.PI / 180);
              return [
                d.position[0] + Math.cos(angle) * 0.001,
                d.position[1] + Math.sin(angle) * 0.001,
              ] as [number, number];
            },
            getFillColor: [255, 255, 255, 180],
            getRadius: 30,
            radiusMinPixels: 2,
            radiusMaxPixels: 5,
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
  }, [map, isLoaded, forceUpdate]);

  return null;
}

export function ActransitCard() {
  const routeCounts: Record<string, number> = {};
  const buses = generateBuses();
  for (const bus of buses) {
    routeCounts[bus.route] = (routeCounts[bus.route] || 0) + 1;
  }

  return (
    <div className="relative h-full w-full">
      <Map center={[-122.27, 37.8]} zoom={11} theme="dark">
        <BusOverlay />
      </Map>

      <div className="absolute top-3 left-3 z-10 rounded-md border bg-background/90 backdrop-blur-sm px-2.5 py-2 text-[10px] shadow-sm space-y-1.5">
        <p className="font-medium text-[11px]">AC Transit — Live Buses</p>
        <div className="space-y-1 pt-0.5">
          {Object.entries(ROUTE_COLORS).map(([route, color]) => (
            <div key={route} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-full"
                  style={{
                    backgroundColor: `rgb(${color[0]}, ${color[1]}, ${color[2]})`,
                  }}
                />
                <span className="font-medium">Route {route}</span>
              </div>
              <span className="text-muted-foreground">
                {routeCounts[route] || 0} buses
              </span>
            </div>
          ))}
        </div>
        <p className="text-[9px] text-muted-foreground pt-1 border-t">
          Simulated — positions update in real time
        </p>
      </div>
    </div>
  );
}
