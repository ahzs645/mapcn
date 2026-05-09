"use client";

import { useMemo, useState } from "react";

import { Map as MapView } from "@/registry/map";

import { computeClusters } from "./transitive/clustering";
import { transitiveData } from "./transitive/data";
import { focusFromJourney } from "./transitive/focus";
import { placeLabels } from "./transitive/labeler";
import {
  ClusterMarker,
  PlaceMarker,
  RouteBadge,
  StopMarker,
} from "./transitive/markers";
import { TransitiveNetworkLayer } from "./transitive/network-layer";
import { zoomToProgress, zoomToScale } from "./transitive/styler";
import type { LngLat } from "./transitive/types";

const INITIAL_VIEWPORT = {
  center: [-77.0395, 38.8993] as LngLat,
  zoom: 11.9,
  bearing: 0,
  pitch: 0,
};

const JOURNEY_OPTIONS = [
  { id: null, label: "All" },
  ...transitiveData.journeys.map((j) => ({
    id: j.journey_id,
    label: j.journey_name,
  })),
];

export function TransitiveCard() {
  const [viewport, setViewport] = useState(INITIAL_VIEWPORT);
  const [selectedJourney, setSelectedJourney] = useState<string | null>(null);

  const progress = zoomToProgress(viewport.zoom);
  const scale = zoomToScale(viewport.zoom);

  const focus = useMemo(
    () => focusFromJourney(selectedJourney),
    [selectedJourney],
  );

  const { clusters, stopVisibility } = useMemo(
    () => computeClusters(viewport.zoom, scale),
    [viewport.zoom, scale],
  );

  const hiddenStopIds = useMemo(() => {
    const hidden = new Set<string>();
    for (const [stopId, vis] of stopVisibility) {
      if (vis.cluster && vis.cluster.mergeFactor >= 0.99) hidden.add(stopId);
    }
    return hidden;
  }, [stopVisibility]);

  const labels = useMemo(
    () => placeLabels(viewport.zoom, scale, progress, clusters, hiddenStopIds),
    [viewport.zoom, scale, progress, clusters, hiddenStopIds],
  );

  return (
    <div className="relative h-full w-full">
      <MapView
        viewport={viewport}
        theme="light"
        onViewportChange={setViewport}
      >
        <TransitiveNetworkLayer progress={progress} focus={focus} />

        {labels.segments.map((seg) => (
          <RouteBadge
            key={seg.edge_id}
            placement={seg}
            focused={focus.patternIds.size > 0 && isSegmentFocused(seg, focus)}
          />
        ))}

        {clusters.map((cluster) => (
          <ClusterMarker
            key={cluster.cluster_id}
            cluster={cluster}
            focused={cluster.children.some((c) => focus.stopIds.has(c.stop_id))}
            placement={labels.places.get(`__cluster__${cluster.cluster_id}`)}
          />
        ))}

        {transitiveData.places.map((place, index) => (
          <PlaceMarker
            key={place.place_id}
            place={place}
            scale={scale}
            letter={index === 0 ? "A" : "B"}
            focused
            placement={labels.places.get(place.place_id)}
          />
        ))}

        {transitiveData.stops.map((stop) => {
          const vis = stopVisibility.get(stop.stop_id);
          if (!vis || vis.individualOpacity <= 0.01) return null;
          return (
            <StopMarker
              key={stop.stop_id}
              stop={stop}
              scale={scale}
              major={stop.stop_id === "rosslyn" || stop.stop_id === "metro"}
              focused={focus.stopIds.has(stop.stop_id)}
              opacity={vis.individualOpacity}
              placement={labels.stops.get(stop.stop_id)}
            />
          );
        })}
      </MapView>

      <div className="absolute left-2 top-2 z-10 flex flex-wrap gap-1">
        {JOURNEY_OPTIONS.map((opt) => (
          <button
            key={opt.id ?? "all"}
            type="button"
            onClick={() => setSelectedJourney(opt.id)}
            className={
              "rounded-full px-2.5 py-1 text-[10px] font-semibold leading-none transition-colors " +
              (selectedJourney === opt.id
                ? "bg-foreground text-background shadow"
                : "bg-background/85 text-foreground/80 hover:bg-background")
            }
          >
            {opt.id ? opt.label.replace(/ via .*/, "") : opt.label}
          </button>
        ))}
      </div>

      <p className="absolute right-4 bottom-7 z-10 text-[10px] font-medium text-muted-foreground drop-shadow-sm">
        Zoom {viewport.zoom.toFixed(1)} · lines {Math.round(progress * 100)}%
        geographic · stops pinned
      </p>
    </div>
  );
}

function isSegmentFocused(
  seg: { edge_id: string; route_id: string },
  focus: { patternIds: Set<string>; walkIds: Set<string> },
): boolean {
  for (const patternId of focus.patternIds) {
    if (seg.edge_id.startsWith(`${patternId}__`)) return true;
  }
  return focus.walkIds.has(seg.edge_id);
}
