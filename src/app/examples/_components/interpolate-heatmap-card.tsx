"use client";

import { useEffect, useState, useCallback } from "react";
import { Map, useMap } from "@/registry/map";
import { Loader2, AlertCircle } from "lucide-react";

interface WeatherPoint {
  lat: number;
  lon: number;
  val: number;
}

const GRADIENT_COLORS = [
  { temp: -30, color: "#00008B", label: "-30\u00b0C" },
  { temp: -10, color: "#0000FF", label: "-10\u00b0C" },
  { temp: 5, color: "#00FFFF", label: "5\u00b0C" },
  { temp: 15, color: "#00FF00", label: "15\u00b0C" },
  { temp: 25, color: "#FFFF00", label: "25\u00b0C" },
  { temp: 40, color: "#FF0000", label: "40\u00b0C" },
];

function TemperatureLegend() {
  return (
    <div className="absolute bottom-6 left-2 z-10 rounded-lg bg-background/90 backdrop-blur-sm border border-border/50 p-3 shadow-md">
      <div className="text-xs font-medium text-foreground mb-2">Temperature</div>
      <div className="flex items-center gap-0.5">
        <span className="text-[10px] text-muted-foreground mr-1">-30&deg;C</span>
        <div
          className="h-3 w-32 rounded-sm"
          style={{
            background: `linear-gradient(to right, ${GRADIENT_COLORS.map((g) => g.color).join(", ")})`,
          }}
        />
        <span className="text-[10px] text-muted-foreground ml-1">40&deg;C</span>
      </div>
    </div>
  );
}

function InterpolateHeatmapLayer() {
  const { map, isLoaded } = useMap();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const addLayer = useCallback(
    async (mapInstance: maplibregl.Map) => {
      try {
        const res = await fetch("/api/temperature-grid");
        if (!res.ok) throw new Error("Failed to fetch temperature data");
        const points: WeatherPoint[] = await res.json();

        // Dynamic import to avoid SSR issues
        const { MaplibreInterpolateHeatmapLayer } = await import(
          "maplibre-gl-interpolate-heatmap"
        );

        const layer = new MaplibreInterpolateHeatmapLayer({
          id: "interpolate-temperature",
          data: points,
        });

        mapInstance.addLayer(layer as unknown as maplibregl.CustomLayerInterface);
        setLoading(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load data");
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!map || !isLoaded) return;

    if (map.isStyleLoaded()) {
      addLayer(map);
    } else {
      const handler = () => addLayer(map);
      map.once("load", handler);
      return () => { map.off("load", handler); };
    }
  }, [map, isLoaded, addLayer]);

  return (
    <>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              Loading weather data...
            </span>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
          <div className="flex flex-col items-center gap-2 text-destructive">
            <AlertCircle className="size-8" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}
    </>
  );
}

export function InterpolateHeatmapCard() {
  return (
    <div className="relative h-full w-full">
      <Map
        center={[0, 20]}
        zoom={1.5}
      >
        <InterpolateHeatmapLayer />
      </Map>
      <TemperatureLegend />
    </div>
  );
}
