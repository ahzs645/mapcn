"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Sensor, getAqiColor, getAqiLabel } from "../data";

interface SensorListCardProps {
  sensors: Sensor[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function SensorListCard({
  sensors,
  selectedId,
  onSelect,
}: SensorListCardProps) {
  const sorted = [...sensors].sort((a, b) => b.aqi - a.aqi);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Active Sensors</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-muted-foreground mb-2 flex items-center justify-between text-[11px] tracking-wider uppercase">
          <span>Sensor</span>
          <span>AQI</span>
        </div>
        <div className="space-y-1">
          {sorted.map((sensor) => {
            const color = getAqiColor(sensor.aqi);
            const isSelected = sensor.id === selectedId;
            return (
              <button
                key={sensor.id}
                onClick={() => onSelect(sensor.id)}
                className={`flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors ${
                  isSelected
                    ? "bg-accent"
                    : "hover:bg-accent/50"
                }`}
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground/90 truncate text-xs">
                    {sensor.name}
                  </p>
                  <p className="text-muted-foreground text-[10px]">
                    {sensor.type} &middot; {sensor.lastUpdated}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className="text-xs font-semibold tabular-nums"
                    style={{ color }}
                  >
                    {sensor.aqi}
                  </p>
                  <p className="text-muted-foreground max-w-16 truncate text-[9px]">
                    {getAqiLabel(sensor.aqi)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
