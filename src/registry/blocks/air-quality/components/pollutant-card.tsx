"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pollutantRows } from "../data";

export function PollutantCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Pollutant Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-muted-foreground mb-2 flex items-center justify-between text-[11px] tracking-wider uppercase">
          <span>Pollutant</span>
          <span>Level</span>
        </div>
        <div className="space-y-3">
          {pollutantRows.map((row) => {
            const maxVal =
              row.label === "PM2.5"
                ? 55
                : row.label === "PM10"
                  ? 150
                  : row.label === "NO₂"
                    ? 100
                    : row.label === "O₃"
                      ? 70
                      : row.label === "CO"
                        ? 4
                        : 40;
            const pct = Math.min((row.value / maxVal) * 100, 100);
            const barColor =
              pct < 40
                ? "bg-emerald-500/85"
                : pct < 70
                  ? "bg-amber-400/85"
                  : "bg-red-500/85";

            return (
              <div key={row.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground/90">{row.label}</span>
                  <span className="text-foreground font-medium tabular-nums">
                    {row.value}{" "}
                    <span className="text-muted-foreground text-[10px]">
                      {row.unit}
                    </span>
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
          })}
        </div>
      </CardContent>
    </Card>
  );
}
