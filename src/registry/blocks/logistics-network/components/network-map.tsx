"use client";

import { useMemo } from "react";
import {
  Map,
  MapArc,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerTooltip,
} from "@/registry/map";
import { MapMarkerDot, MapOverlay, MapSwatch } from "@/registry/map-ui";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  modeConfig,
  regionLabels,
  statusConfig,
  type Hub,
  type Route,
} from "../data";
import { Separator } from "@/components/ui/separator";

interface NetworkMapProps {
  hubs: Hub[];
  routes: Route[];
}

function MapControlsCard() {
  return (
    <MapOverlay className="border-border/40 bg-background/70 top-4 left-4 z-20 flex items-center gap-3 rounded-lg px-2.5 py-1.5">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-4!" />
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <MapSwatch color={modeConfig.air.color} shape="line" />
          <span>{modeConfig.air.label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapSwatch color={modeConfig.ground.color} shape="line" />
          <span>{modeConfig.ground.label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapSwatch color={statusConfig.delayed.color} shape="line" />
          <span>{statusConfig.delayed.label}</span>
        </div>
        <div className="bg-border h-4 w-px" />
        <div className="flex items-center gap-1.5">
          <MapMarkerDot color="#3b82f6" className="size-2.5 border shadow-sm" />
          <span>Hub</span>
        </div>
      </div>
    </MapOverlay>
  );
}

export function NetworkMap({ hubs, routes }: NetworkMapProps) {
  const arcs = useMemo(() => {
    const hubById: Record<string, Hub> = Object.fromEntries(
      hubs.map((hub) => [hub.id, hub]),
    );
    return routes.flatMap((route) => {
      const fromHub = hubById[route.from];
      const toHub = hubById[route.to];
      if (!fromHub || !toHub) return [];
      return [
        {
          id: `${route.from}-${route.to}`,
          from: [fromHub.lng, fromHub.lat] as [number, number],
          to: [toHub.lng, toHub.lat] as [number, number],
          color:
            route.status === "delayed"
              ? statusConfig.delayed.color
              : modeConfig[route.mode].color,
        },
      ];
    });
  }, [hubs, routes]);

  return (
    <div className="relative h-full">
      <MapControlsCard />

      <Map center={[-98, 39]} zoom={4} projection={{ type: "globe" }}>
        <MapControls />
        <MapArc
          data={arcs}
          curvature={0.3}
          paint={{
            "line-color": ["get", "color"],
            "line-width": 2,
            "line-opacity": 0.65,
          }}
          interactive={false}
        />

        {hubs.map((hub) => (
          <MapMarker key={hub.id} longitude={hub.lng} latitude={hub.lat}>
            <MarkerContent>
              <MapMarkerDot color="#3b82f6" className="size-3 shadow-md" />
            </MarkerContent>
            <MarkerTooltip
              offset={16}
              className="bg-background text-foreground border px-2.5 py-1.5"
            >
              <p className="font-medium">{hub.city}</p>
              <p className="text-muted-foreground mt-1">
                {hub.shipments.toLocaleString()} shipments
                <span className="mx-1">•</span>
                {regionLabels[hub.region]}
              </p>
            </MarkerTooltip>
          </MapMarker>
        ))}
      </Map>
    </div>
  );
}
