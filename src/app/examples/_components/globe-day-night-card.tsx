"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Map, useMap } from "@/registry/map";

interface SunPosition {
  lng: number;
  lat: number;
  time: string;
}

function calculateSunPosition(): SunPosition {
  const now = new Date();
  const hours = now.getUTCHours();
  const minutes = now.getUTCMinutes();

  // Subsolar longitude: the longitude where the sun is directly overhead
  const sunLng = -(hours + minutes / 60) * 15 + 180;

  // Subsolar latitude: approximation using Earth's axial tilt
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getUTCFullYear(), 0, 0).getTime()) / 86400000,
  );
  const sunLat = -23.44 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });

  return { lng: sunLng, lat: sunLat, time: timeStr };
}

function DayNightInner({ sunPos }: { sunPos: SunPosition }) {
  const { map, isLoaded } = useMap();

  const applyLighting = useCallback(() => {
    if (!map) return;

    // Calculate sun azimuth and altitude for the light source
    const sunAzimuth = ((sunPos.lng % 360) + 360) % 360;
    const sunAltitude = Math.max(0, 90 - Math.abs(sunPos.lat));

    map.setSky({
      "sky-color": "#245cdf",
      "horizon-color": "#d4e5f7",
      "fog-color": "#d4e5f7",
      "atmosphere-blend": 0.8,
      "sky-horizon-blend": 0.5,
    });

    map.setLight({
      anchor: "map",
      position: [1.5, sunAzimuth, sunAltitude],
      intensity: 0.5,
      color: "#fffaef",
    });
  }, [map, sunPos]);

  useEffect(() => {
    if (!map || !isLoaded) return;

    if (map.isStyleLoaded()) {
      applyLighting();
    } else {
      map.once("load", applyLighting);
    }

    return () => {
      map.off("load", applyLighting);
    };
  }, [map, isLoaded, applyLighting]);

  // Auto-rotation
  useEffect(() => {
    if (!map || !isLoaded) return;
    let animating = true;

    function rotate() {
      if (!animating || !map) return;
      const center = map.getCenter();
      map.setCenter([center.lng + 0.15, center.lat]);
      requestAnimationFrame(rotate);
    }

    const timeout = setTimeout(rotate, 500);
    const pause = () => { animating = false; };
    const resume = () => { animating = true; rotate(); };

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

export function GlobeDayNightCard() {
  const [sunPos, setSunPos] = useState<SunPosition>(calculateSunPosition);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSunPos(calculateSunPosition());
    }, 60000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      <Map
        center={[0, 20]}
        zoom={1.5}
        projection={{ type: "globe" }}
        styles={{
          light: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
          dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
        }}
      >
        <DayNightInner sunPos={sunPos} />
      </Map>
      <div className="absolute top-3 left-3 z-10 rounded-md border bg-background/90 backdrop-blur-sm px-3 py-2 text-[11px] shadow-sm space-y-1">
        <p className="font-medium text-xs">Sun Position</p>
        <p className="text-muted-foreground">
          Lng: {sunPos.lng.toFixed(1)} / Lat: {sunPos.lat.toFixed(1)}
        </p>
        <p className="text-muted-foreground">{sunPos.time}</p>
      </div>
    </div>
  );
}
