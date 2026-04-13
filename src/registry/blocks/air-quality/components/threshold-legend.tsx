"use client";

import { AQI_COLORS } from "../data";

const levels = [
  { label: "Good", sublabel: "0–50", key: "good" as const },
  { label: "Moderate", sublabel: "51–100", key: "moderate" as const },
  { label: "USG", sublabel: "101–150", key: "unhealthy-sensitive" as const },
  { label: "Unhealthy", sublabel: "151–200", key: "unhealthy" as const },
  { label: "Hazardous", sublabel: "201+", key: "hazardous" as const },
];

export function ThresholdLegend() {
  return (
    <div className="bg-card/80 absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-px overflow-hidden rounded-lg border backdrop-blur-sm">
      {levels.map((level) => (
        <div key={level.key} className="flex items-center gap-1.5 px-3 py-2">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: AQI_COLORS[level.key] }}
          />
          <div>
            <p className="text-foreground text-[10px] leading-none font-medium">
              {level.label}
            </p>
            <p className="text-muted-foreground text-[9px] leading-none">
              {level.sublabel}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
