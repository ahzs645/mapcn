"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Sensor, getAqiColor, getAqiLabel, PM25_THRESHOLDS } from "../data";

interface SensorDetailCardProps {
  sensor: Sensor | null;
}

function ReadingRow({
  label,
  value,
  unit,
  max,
}: {
  label: string;
  value: number;
  unit: string;
  max: number;
}) {
  const pct = Math.min((value / max) * 100, 100);
  const barColor =
    pct < 40
      ? "bg-emerald-500/85"
      : pct < 70
        ? "bg-amber-400/85"
        : "bg-red-500/85";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground/90">{label}</span>
        <span className="text-foreground font-medium tabular-nums">
          {value}{" "}
          <span className="text-muted-foreground text-[10px]">{unit}</span>
        </span>
      </div>
      <div className="bg-muted h-1 rounded-full">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function SensorDetailCard({ sensor }: SensorDetailCardProps) {
  if (!sensor) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Sensor Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Select a sensor on the map or list to view its details.
          </p>
        </CardContent>
      </Card>
    );
  }

  const color = getAqiColor(sensor.aqi);
  const label = getAqiLabel(sensor.aqi);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-medium">{sensor.name}</CardTitle>
            <p className="text-muted-foreground text-xs">
              {sensor.type} &middot; Updated {sensor.lastUpdated}
            </p>
          </div>
          <div
            className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
            style={{ backgroundColor: color }}
          >
            {label}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <p className="text-4xl leading-none font-semibold tabular-nums">
            {sensor.aqi}
          </p>
          <span className="text-muted-foreground mb-0.5 text-sm">AQI</span>
        </div>

        <div className="border-border/60 space-y-3 border-t pt-4">
          <ReadingRow
            label="PM2.5"
            value={sensor.pm25}
            unit="μg/m³"
            max={PM25_THRESHOLDS.max}
          />
          <ReadingRow
            label="PM10"
            value={sensor.pm10}
            unit="μg/m³"
            max={300}
          />
          <ReadingRow
            label="Temperature"
            value={sensor.temperature}
            unit="°F"
            max={120}
          />
          <ReadingRow
            label="Humidity"
            value={sensor.humidity}
            unit="%"
            max={100}
          />
        </div>
      </CardContent>
    </Card>
  );
}
