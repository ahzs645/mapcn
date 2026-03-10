"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Map, MapRoute, MapMarker, MarkerContent } from "@/registry/map";

const fullRoute: [number, number][] = [
  [-73.9930, 40.7350], [-73.9910, 40.7370], [-73.9880, 40.7400],
  [-73.9860, 40.7430], [-73.9840, 40.7460], [-73.9830, 40.7490],
  [-73.9850, 40.7520], [-73.9870, 40.7540], [-73.9860, 40.7570],
  [-73.9840, 40.7590], [-73.9810, 40.7610], [-73.9790, 40.7640],
  [-73.9770, 40.7670], [-73.9750, 40.7700], [-73.9730, 40.7730],
  [-73.9720, 40.7760], [-73.9700, 40.7790], [-73.9680, 40.7810],
];

export function AnimatedRouteExample() {
  const [progress, setProgress] = useState(0);
  const animRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  const animate = useCallback((timestamp: number) => {
    if (!startRef.current) startRef.current = timestamp;
    const elapsed = timestamp - startRef.current;
    const duration = 4000;
    const p = Math.min(elapsed / duration, 1);
    setProgress(p);

    if (p < 1) {
      animRef.current = requestAnimationFrame(animate);
    } else {
      // Loop after a pause
      setTimeout(() => {
        startRef.current = null;
        setProgress(0);
        animRef.current = requestAnimationFrame(animate);
      }, 1500);
    }
  }, []);

  useEffect(() => {
    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [animate]);

  const pointCount = Math.max(2, Math.ceil(progress * fullRoute.length));
  const visibleRoute = fullRoute.slice(0, pointCount);
  const currentPos = visibleRoute[visibleRoute.length - 1];

  return (
    <div className="h-full w-full min-h-[300px]">
      <Map center={[-73.98, 40.757]} zoom={12.5}>
        <MapRoute
          coordinates={visibleRoute}
          color="#3b82f6"
          width={3}
          opacity={0.9}
        />
        {currentPos && (
          <MapMarker longitude={currentPos[0]} latitude={currentPos[1]}>
            <MarkerContent>
              <div className="size-3 rounded-full bg-blue-500 border-2 border-white shadow-lg animate-pulse" />
            </MarkerContent>
          </MapMarker>
        )}
        <MapMarker longitude={fullRoute[0][0]} latitude={fullRoute[0][1]}>
          <MarkerContent>
            <div className="size-2.5 rounded-full bg-green-500 border-2 border-white shadow" />
          </MarkerContent>
        </MapMarker>
        <MapMarker
          longitude={fullRoute[fullRoute.length - 1][0]}
          latitude={fullRoute[fullRoute.length - 1][1]}
        >
          <MarkerContent>
            <div className="size-2.5 rounded-full bg-red-500 border-2 border-white shadow" />
          </MarkerContent>
        </MapMarker>
      </Map>
    </div>
  );
}
