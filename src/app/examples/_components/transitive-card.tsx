"use client";

import { useMemo, useState } from "react";

import { Map as MapView } from "@/registry/map";

import { transitiveData } from "./transitive/data";
import { getLayout, partitionForZoom } from "./transitive/engine/layout";
import { focusFromJourney } from "./transitive/focus";
import { placeLabels } from "./transitive/labeler";
import {
  HubMarker,
  PlaceMarker,
  RouteBadge,
  StopMarker,
} from "./transitive/markers";
import { TransitiveNetworkLayer } from "./transitive/network-layer";
import { zoomToScale } from "./transitive/styler";
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

  const partition = partitionForZoom(viewport.zoom);
  const scale = zoomToScale(viewport.zoom);

  const layout = useMemo(() => getLayout(partition), [partition]);

  const focus = useMemo(
    () => focusFromJourney(selectedJourney),
    [selectedJourney],
  );

  const labels = useMemo(
    () => placeLabels(viewport.zoom, scale, layout),
    [viewport.zoom, scale, layout],
  );

  return (
    <div className="relative h-full w-full">
      <MapView viewport={viewport} theme="light" onViewportChange={setViewport}>
        <TransitiveNetworkLayer layout={layout} focus={focus} />

        {labels.segments.map((seg) => (
          <RouteBadge
            key={seg.edge_id}
            placement={seg}
            focused={focus.patternIds.has(seg.patternId)}
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

        {layout.vertices.map((vertex) => {
          const focused = vertex.memberStopIds.some((id) =>
            focus.stopIds.has(id),
          );
          const placement = labels.stops.get(vertex.id);
          if (vertex.type === "MULTI" || vertex.isTransfer) {
            return (
              <HubMarker
                key={vertex.id}
                lngLat={vertex.lngLat}
                scale={scale}
                focused={focused}
                placement={placement}
                members={vertex.memberStopIds.length}
              />
            );
          }
          return (
            <StopMarker
              key={vertex.id}
              lngLat={vertex.lngLat}
              scale={scale}
              major={false}
              focused={focused}
              placement={placement}
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
        Zoom {viewport.zoom.toFixed(1)} ·{" "}
        {layout.geographic
          ? "geographic geometry"
          : `schematic (P${partition})`}
      </p>
    </div>
  );
}
