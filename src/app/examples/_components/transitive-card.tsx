"use client";

import { useMemo, useState } from "react";

import { Map as MapView } from "@/registry/map";

import { transitiveData } from "./transitive/data";
import { focusFromJourney } from "./transitive/focus";
import {
  placeLayout,
  placePosition,
  stopLayout,
  stopPosition,
} from "./transitive/graph";
import { placeLabels } from "./transitive/labeler";
import { PlaceMarker, RouteBadge, StationMarker } from "./transitive/markers";
import { TransitiveNetworkLayer } from "./transitive/network-layer";
import { zoomToProgress, zoomToScale } from "./transitive/styler";
import type { LngLat } from "./transitive/types";

const INITIAL_VIEWPORT = {
  center: [-77.043, 38.9011] as LngLat,
  zoom: 13.2,
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

const PLACE_LETTERS: Record<string, string> = { from: "A", to: "B" };

export function TransitiveCard() {
  const [viewport, setViewport] = useState(INITIAL_VIEWPORT);
  const [selectedJourney, setSelectedJourney] = useState<string | null>(null);

  const progress = zoomToProgress(viewport.zoom);
  const scale = zoomToScale(viewport.zoom);

  const focus = useMemo(
    () => focusFromJourney(selectedJourney),
    [selectedJourney],
  );

  const labels = useMemo(
    () => placeLabels(viewport.zoom, scale, progress),
    [viewport.zoom, scale, progress],
  );

  return (
    <div className="relative h-full w-full">
      <MapView viewport={viewport} theme="light" onViewportChange={setViewport}>
        <TransitiveNetworkLayer progress={progress} focus={focus} />

        {labels.segments.map((seg) => (
          <RouteBadge
            key={seg.edge_id}
            placement={seg}
            focused={focus.patternIds.has(seg.patternId)}
          />
        ))}

        {[...placeLayout.values()].map((place) => (
          <PlaceMarker
            key={place.place_id}
            position={placePosition(place, progress)}
            scale={scale}
            letter={PLACE_LETTERS[place.place_id] ?? "•"}
            focused
            placement={labels.places.get(place.place_id)}
          />
        ))}

        {[...stopLayout.values()].map((stop) => (
          <StationMarker
            key={stop.stop_id}
            position={stopPosition(stop, progress)}
            scale={scale}
            role={stop.role}
            laneSpan={stop.laneSpan}
            angle={stop.angle}
            focused={focus.stopIds.has(stop.stop_id)}
            placement={labels.stops.get(stop.stop_id)}
          />
        ))}
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
        Zoom {viewport.zoom.toFixed(1)} ·{" "}
        {progress < 0.5 ? "schematic" : "geographic"}
      </p>
    </div>
  );
}
