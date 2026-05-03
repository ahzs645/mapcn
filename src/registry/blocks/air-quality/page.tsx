"use client";

import { useState, useCallback } from "react";
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerTooltip,
} from "@/registry/map";
import { AqiOverviewCard } from "./components/aqi-overview-card";
import { PollutantCard } from "./components/pollutant-card";
import { SensorDetailCard } from "./components/sensor-detail-card";
import { SensorListCard } from "./components/sensor-list-card";
import { ThresholdLegend } from "./components/threshold-legend";
import { sensors, getAqiColor, getAqiLabel } from "./data";

function SensorMarker({
  sensor,
  isSelected,
  onSelect,
}: {
  sensor: (typeof sensors)[number];
  isSelected: boolean;
  onSelect: () => void;
}) {
  const color = getAqiColor(sensor.aqi);
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const glowSize = isSelected ? 56 : 46;

  return (
    <MapMarker longitude={sensor.lng} latitude={sensor.lat}>
      <MarkerContent>
        <button
          onClick={onSelect}
          className="relative flex cursor-pointer items-center"
          style={{ height: glowSize, width: glowSize + 90 }}
        >
          {/* Radial gradient glow — AirCasting halo */}
          <span
            className="absolute rounded-full"
            style={{
              width: glowSize,
              height: glowSize,
              left: 0,
              top: "50%",
              transform: "translate(-50%, -50%)",
              background: `radial-gradient(circle at 50%, rgba(${r},${g},${b},0.75) 10%, rgba(${r},${g},${b},0.5) 40%, rgba(${r},${g},${b},0) 70%)`,
              transition: "transform 0.3s ease-out",
              ...(isSelected
                ? { animation: "marker-pulse 2s infinite" }
                : {}),
            }}
          />

          {/* White pill label */}
          <div
            className="absolute flex h-5 items-center whitespace-nowrap rounded-[10px] bg-white pr-1.5 pl-1 dark:bg-zinc-900"
            style={{
              left: -8,
              top: "50%",
              transform: "translateY(-50%)",
              boxShadow: isSelected
                ? "0 2px 6px rgba(0,0,0,0.15)"
                : "0 2px 4px rgba(0,0,0,0.1)",
              border: isSelected ? `1px solid ${color}` : "none",
            }}
          >
            <span
              className="mr-1.5 size-3 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-[#3E4449] dark:text-zinc-300" style={{ letterSpacing: "0.14px" }}>
              {Math.round(sensor.pm25)} μg/m³
            </span>
          </div>
        </button>
      </MarkerContent>

      <MarkerTooltip
        offset={40}
        className="bg-background text-foreground border"
      >
        <p className="font-medium">{sensor.name}</p>
        <div className="mt-1 space-y-0.5 text-sm">
          <p>
            <span className="text-muted-foreground">AQI:</span>{" "}
            <span className="font-medium" style={{ color }}>
              {sensor.aqi}
            </span>{" "}
            <span className="text-muted-foreground text-xs">
              — {getAqiLabel(sensor.aqi)}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">PM2.5:</span>{" "}
            {sensor.pm25} μg/m³
          </p>
          <p>
            <span className="text-muted-foreground">PM10:</span>{" "}
            {sensor.pm10} μg/m³
          </p>
          <p>
            <span className="text-muted-foreground">Temp:</span>{" "}
            {sensor.temperature}°F &middot;{" "}
            <span className="text-muted-foreground">RH:</span>{" "}
            {sensor.humidity}%
          </p>
          <p className="text-muted-foreground text-xs">
            {sensor.type} &middot; Updated {sensor.lastUpdated}
          </p>
        </div>
      </MarkerTooltip>
    </MapMarker>
  );
}

export default function Page() {
  const initialSensor = sensors.reduce((max, sensor) =>
    sensor.aqi > max.aqi ? sensor : max,
  );
  const [selectedSensor, setSelectedSensor] = useState<string | null>(
    initialSensor.id,
  );
  const selectedSensorData =
    sensors.find((sensor) => sensor.id === selectedSensor) ?? null;

  const handleSelect = useCallback((id: string) => {
    setSelectedSensor((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className="relative h-screen">
      <style>{`
        @keyframes marker-pulse {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.6); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
      `}</style>

      <Map
        center={[-73.95, 40.74]}
        zoom={11}
        scrollZoom={true}
        minZoom={9}
      >
        <MapControls showFullscreen />
        {sensors.map((sensor) => (
          <SensorMarker
            key={sensor.id}
            sensor={sensor}
            isSelected={selectedSensor === sensor.id}
            onSelect={() => handleSelect(sensor.id)}
          />
        ))}
      </Map>

      <AqiOverviewCard />

      <aside className="absolute inset-x-3 bottom-4 z-10 max-h-[48svh] overflow-y-auto md:inset-x-auto md:top-4 md:right-4 md:bottom-4 md:flex md:w-80 md:max-h-none md:flex-col md:gap-3 lg:w-88">
        <div className="space-y-3">
          <SensorDetailCard sensor={selectedSensorData} />
          <SensorListCard
            sensors={sensors}
            selectedId={selectedSensor}
            onSelect={handleSelect}
          />
          <PollutantCard />
        </div>
      </aside>

      <ThresholdLegend />
    </div>
  );
}
