"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { Area, AreaChart, Cell, Pie, PieChart } from "recharts";
import {
  hourlyAqi,
  hourlyAqiChartConfig,
  sensorTypeData,
  sensorTypeChartConfig,
  sensors,
  getAqiColor,
  getAqiLabel,
} from "../data";

function AqiTrendChart() {
  return (
    <ChartContainer
      config={hourlyAqiChartConfig}
      className="aspect-auto h-8 w-full"
    >
      <AreaChart data={hourlyAqi} margin={{ left: 4, right: 4, top: 4 }}>
        <defs>
          <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-aqi)"
              stopOpacity={0.4}
            />
            <stop
              offset="100%"
              stopColor="var(--color-aqi)"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <Area
          type="natural"
          dataKey="aqi"
          stroke="var(--color-aqi)"
          strokeWidth={1.5}
          fill="url(#aqiGradient)"
        />
      </AreaChart>
    </ChartContainer>
  );
}

export function AqiOverviewCard() {
  const avgAqi = Math.round(
    sensors.reduce((sum, s) => sum + s.aqi, 0) / sensors.length,
  );
  const color = getAqiColor(avgAqi);
  const label = getAqiLabel(avgAqi);

  return (
    <Card className="bg-card/70 absolute top-4 left-4 z-10 w-60 backdrop-blur-sm">
      <CardHeader>
        <div>
          <p className="text-muted-foreground pb-1 text-[10px] tracking-wider uppercase">
            Average AQI
          </p>
          <div className="flex items-end gap-2">
            <p className="text-3xl leading-none font-semibold">{avgAqi}</p>
            <span
              className="mb-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
              style={{ backgroundColor: color }}
            >
              {label}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <AqiTrendChart />
        <p className="text-muted-foreground mt-1.5 text-[10px]">
          Hourly trend today
        </p>

        <div className="border-border/60 mt-4 border-t pt-4">
          <p className="text-muted-foreground text-[10px] tracking-wider uppercase">
            Active sensors by type
          </p>

          <ChartContainer
            config={sensorTypeChartConfig}
            className="mx-auto mt-3 aspect-square h-32 w-32"
          >
            <PieChart>
              <Pie
                data={sensorTypeData}
                dataKey="value"
                nameKey="name"
                innerRadius={32}
                outerRadius={52}
                strokeWidth={2}
              >
                {sensorTypeData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {sensorTypeData.map((type) => (
              <div key={type.name} className="text-center">
                <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-[10px] tracking-wide uppercase">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: type.fill }}
                  />
                  {type.name}
                </p>
                <p className="text-foreground mt-1 leading-none font-medium tabular-nums">
                  {type.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
