"use client";

import { useState } from "react";
import { Activity, Clock, Eye, EyeOff, Gauge, Waves } from "lucide-react";

import { cn } from "@/lib/utils";
import { Map, MapControls } from "@/registry/map";
import {
  MapGradientLegendItem,
  MapLegend,
  MapOverlay,
  MapStat,
} from "@/registry/map-ui";
import {
  WindCanvasLayer,
  type WindInteractionMode,
} from "./components/wind-canvas-layer";
import { WIND_GRID_REF_TIME, WIND_GRID_STATS } from "./data";

const WIND_COLORS = ["#50a0ff", "#46dcb4", "#facd55", "#fa785a", "#e655be"];

const forecastTime = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
}).format(new Date(WIND_GRID_REF_TIME));

const windInteractionOptions: Array<{
  value: WindInteractionMode;
  label: string;
  icon: typeof Eye;
}> = [
  { value: "live", label: "Keep visible", icon: Eye },
  { value: "hide-while-moving", label: "Hide while moving", icon: EyeOff },
];

export default function Page() {
  const [windInteractionMode, setWindInteractionMode] =
    useState<WindInteractionMode>("live");

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <Map
        center={[-35, 28]}
        zoom={1.6}
        minZoom={1.1}
        maxZoom={5.5}
        pitch={0}
        theme="dark"
        scrollZoom
      >
        <WindCanvasLayer interactionMode={windInteractionMode} />
        <MapControls showFullscreen position="top-right" />

        <MapOverlay className="w-[min(22rem,calc(100vw-4.75rem))] p-3 sm:w-[min(22rem,calc(100vw-1.5rem))]">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-background">
              <Waves className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-semibold">Global Wind Field</h1>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                Animated 10 m surface winds sampled from the IQAir Earth GFS
                feed.
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <MapStat
              icon={<Gauge className="size-3.5" />}
              label="Peak"
              value={`${WIND_GRID_STATS.maxSpeed} m/s`}
            />
            <MapStat
              icon={<Activity className="size-3.5" />}
              label="Mean"
              value={`${WIND_GRID_STATS.averageSpeed} m/s`}
            />
            <MapStat
              icon={<Clock className="size-3.5" />}
              label="Run"
              value={forecastTime}
            />
          </div>

          <div className="mt-3 rounded-md border bg-muted/30 p-1">
            <div className="grid grid-cols-2 gap-1">
              {windInteractionOptions.map((option) => {
                const Icon = option.icon;
                const active = windInteractionMode === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setWindInteractionMode(option.value)}
                    className={cn(
                      "flex h-8 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-sm px-2 text-xs font-medium transition-colors",
                      active
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    <span className="truncate">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </MapOverlay>

        <MapLegend
          title="Wind speed"
          position="bottom-left"
          className="bottom-10 w-52"
          collapsible
        >
          <MapGradientLegendItem
            colors={WIND_COLORS}
            minLabel="0"
            maxLabel="24+ m/s"
            labels={["0", "8", "16", "24+ m/s"]}
          />
        </MapLegend>
      </Map>
    </div>
  );
}
