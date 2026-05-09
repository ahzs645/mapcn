"use client";

import { useEffect, useState } from "react";
import type { GeoJSONSource } from "maplibre-gl";

import {
  Map as MapView,
  MapMarker,
  MarkerContent,
  useMap,
} from "@/registry/map";
type LngLat = [number, number];

type Stop = {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
};

type TransitRoute = {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_type: number;
  route_color: string;
};

type Pattern = {
  pattern_id: string;
  route_id: string;
  stops: Array<{ stop_id: string }>;
};

type Place = {
  place_id: string;
  place_name: string;
  place_lat: number;
  place_lon: number;
};

type JourneySegment =
  | {
      type: "WALK";
      from:
        | { type: "PLACE"; place_id: string }
        | { type: "STOP"; stop_id: string };
      to:
        | { type: "PLACE"; place_id: string }
        | { type: "STOP"; stop_id: string };
    }
  | {
      type: "TRANSIT";
      pattern_id: string;
      from_stop_index: number;
      to_stop_index: number;
    };

type Journey = {
  journey_id: string;
  journey_name: string;
  segments: JourneySegment[];
};

type TransitiveData = {
  stops: Stop[];
  routes: TransitRoute[];
  patterns: Pattern[];
  places: Place[];
  journeys: Journey[];
};

type RenderedLine = {
  dashArray?: [number, number];
  id: string;
  label: string;
  mode?: "transit" | "walk";
  routeId: string;
  color: string;
  width: number;
  offset: number;
  geo: LngLat[];
  schematic: LngLat[];
  anchors: number[];
};

const fakeTransitiveData: TransitiveData = {
  stops: [
    {
      stop_id: "rosslyn",
      stop_name: "Rosslyn",
      stop_lat: 38.895493,
      stop_lon: -77.071954,
    },
    {
      stop_id: "quinn",
      stop_name: "Rt 29 Lee Hwy & Quinn St",
      stop_lat: 38.897798,
      stop_lon: -77.078215,
    },
    {
      stop_id: "farragut",
      stop_name: "Farragut North",
      stop_lat: 38.903297,
      stop_lon: -77.039502,
    },
    {
      stop_id: "k17",
      stop_name: "K St NW & 17th St NW (Main) West",
      stop_lat: 38.902456,
      stop_lon: -77.039724,
    },
    {
      stop_id: "metro",
      stop_name: "Metro Center",
      stop_lat: 38.898327,
      stop_lon: -77.027777,
    },
    {
      stop_id: "union",
      stop_name: "Union Station",
      stop_lat: 38.89777,
      stop_lon: -77.006402,
    },
  ],
  routes: [
    {
      route_id: "BLUE",
      route_short_name: "Blue",
      route_long_name: "Blue via Metro Center",
      route_type: 1,
      route_color: "#2f7fbd",
    },
    {
      route_id: "ORANGE",
      route_short_name: "Orange",
      route_long_name: "Orange via Metro Center",
      route_type: 1,
      route_color: "#f08d32",
    },
    {
      route_id: "RED",
      route_short_name: "Red",
      route_long_name: "Red via Metro Center",
      route_type: 1,
      route_color: "#df4638",
    },
    {
      route_id: "3Y",
      route_short_name: "3Y",
      route_long_name: "3Y via K Street",
      route_type: 3,
      route_color: "#09088c",
    },
  ],
  patterns: [
    {
      pattern_id: "blue-to-union",
      route_id: "BLUE",
      stops: [{ stop_id: "rosslyn" }, { stop_id: "metro" }],
    },
    {
      pattern_id: "orange-to-union",
      route_id: "ORANGE",
      stops: [{ stop_id: "rosslyn" }, { stop_id: "metro" }],
    },
    {
      pattern_id: "red-to-union",
      route_id: "RED",
      stops: [
        { stop_id: "farragut" },
        { stop_id: "metro" },
        { stop_id: "union" },
      ],
    },
    {
      pattern_id: "3y-to-k-street",
      route_id: "3Y",
      stops: [{ stop_id: "quinn" }, { stop_id: "k17" }],
    },
  ],
  places: [
    {
      place_id: "from",
      place_name: "Start: 1401 Wilson Blvd",
      place_lat: 38.894624,
      place_lon: -77.074159,
    },
    {
      place_id: "to",
      place_name: "End: Union Station",
      place_lat: 38.89788,
      place_lon: -77.00597,
    },
  ],
  journeys: [
    {
      journey_id: "option-blue-red",
      journey_name: "routes Blue, Red via METRO CENTER METRO STATION",
      segments: [
        {
          type: "WALK",
          from: { type: "PLACE", place_id: "from" },
          to: { type: "STOP", stop_id: "rosslyn" },
        },
        {
          type: "TRANSIT",
          pattern_id: "blue-to-union",
          from_stop_index: 0,
          to_stop_index: 1,
        },
        {
          type: "TRANSIT",
          pattern_id: "red-to-union",
          from_stop_index: 1,
          to_stop_index: 2,
        },
      ],
    },
    {
      journey_id: "option-orange-red",
      journey_name: "routes Orange, Red via METRO CENTER METRO STATION",
      segments: [
        {
          type: "WALK",
          from: { type: "PLACE", place_id: "from" },
          to: { type: "STOP", stop_id: "rosslyn" },
        },
        {
          type: "TRANSIT",
          pattern_id: "orange-to-union",
          from_stop_index: 0,
          to_stop_index: 1,
        },
        {
          type: "TRANSIT",
          pattern_id: "red-to-union",
          from_stop_index: 1,
          to_stop_index: 2,
        },
      ],
    },
    {
      journey_id: "option-3y-red",
      journey_name: "routes 3Y, Red via K ST NW & 17TH ST NW (MAIN) WEST",
      segments: [
        {
          type: "WALK",
          from: { type: "PLACE", place_id: "from" },
          to: { type: "STOP", stop_id: "quinn" },
        },
        {
          type: "TRANSIT",
          pattern_id: "3y-to-k-street",
          from_stop_index: 0,
          to_stop_index: 1,
        },
        {
          type: "WALK",
          from: { type: "STOP", stop_id: "k17" },
          to: { type: "STOP", stop_id: "farragut" },
        },
        {
          type: "TRANSIT",
          pattern_id: "red-to-union",
          from_stop_index: 0,
          to_stop_index: 2,
        },
      ],
    },
  ],
};

const patternGeometry: Record<
  string,
  { geo: LngLat[]; schematic: LngLat[]; anchors: number[] }
> = {
  "blue-to-union": {
    geo: [
      [-77.071954, 38.895493],
      [-77.0626, 38.8961],
      [-77.050026, 38.900705],
      [-77.039482, 38.901366],
      [-77.031958, 38.901335],
      [-77.027777, 38.898327],
    ],
    schematic: [
      [-77.074, 38.8972],
      [-77.064, 38.8972],
      [-77.052, 38.8972],
      [-77.041, 38.8972],
      [-77.032, 38.8972],
      [-77.024, 38.8972],
    ],
    anchors: [0, 5],
  },
  "orange-to-union": {
    geo: [
      [-77.071954, 38.895493],
      [-77.0626, 38.8961],
      [-77.050026, 38.900705],
      [-77.039482, 38.901366],
      [-77.031958, 38.901335],
      [-77.027777, 38.898327],
    ],
    schematic: [
      [-77.074, 38.9004],
      [-77.064, 38.9004],
      [-77.052, 38.9004],
      [-77.041, 38.9004],
      [-77.032, 38.9004],
      [-77.024, 38.9004],
    ],
    anchors: [0, 5],
  },
  "red-to-union": {
    geo: [
      [-77.039502, 38.903297],
      [-77.034, 38.9013],
      [-77.027777, 38.898327],
      [-77.021527, 38.898354],
      [-77.016312, 38.896121],
      [-77.006402, 38.89777],
    ],
    schematic: [
      [-77.039, 38.905],
      [-77.035, 38.902],
      [-77.024, 38.898],
      [-77.018, 38.898],
      [-77.012, 38.898],
      [-77.006, 38.898],
    ],
    anchors: [0, 2, 5],
  },
  "3y-to-k-street": {
    geo: [
      [-77.078215, 38.897798],
      [-77.071954, 38.895493],
      [-77.0622, 38.8972],
      [-77.0502, 38.9011],
      [-77.039724, 38.902456],
    ],
    schematic: [
      [-77.078, 38.9],
      [-77.066, 38.902],
      [-77.052, 38.902],
      [-77.043, 38.902],
      [-77.039, 38.902],
    ],
    anchors: [0, 4],
  },
};

const routeById = new Map(
  fakeTransitiveData.routes.map((route) => [route.route_id, route]),
);
function interpolatePoint(geo: LngLat, schematic: LngLat, progress: number): LngLat {
  return [
    schematic[0] + (geo[0] - schematic[0]) * progress,
    schematic[1] + (geo[1] - schematic[1]) * progress,
  ];
}

function coordinatesForLine(line: RenderedLine, progress: number): LngLat[] {
  return line.geo.map((point, index) => {
    if (line.anchors.includes(index)) return point;
    return interpolatePoint(point, line.schematic[index], progress);
  });
}

function buildRenderedLines(): RenderedLine[] {
  const laneOffsets: Record<string, number> = {
    BLUE: -12,
    ORANGE: 12,
    RED: 0,
    "3Y": -2,
  };

  const transitLines = fakeTransitiveData.patterns.map((pattern) => {
    const route = routeById.get(pattern.route_id);
    if (!route) throw new Error(`Unknown route: ${pattern.route_id}`);

    const geometry = patternGeometry[pattern.pattern_id];

    return {
      id: pattern.pattern_id,
      label: route.route_short_name,
      mode: "transit" as const,
      routeId: route.route_id,
      color: route.route_color,
      width: route.route_id === "3Y" ? 8 : 10,
      offset: laneOffsets[route.route_id] ?? 0,
      geo: geometry.geo,
      schematic: geometry.schematic,
      anchors: geometry.anchors,
    };
  });

  return [
    ...transitLines,
    {
      anchors: [0, 1],
      color: "#59d5ea",
      dashArray: [0.1, 1.6],
      geo: [
        [-77.039724, 38.902456],
        [-77.039502, 38.903297],
      ],
      id: "walk-k17-farragut",
      label: "",
      mode: "walk",
      offset: 0,
      routeId: "WALK",
      schematic: [
        [-77.039724, 38.902456],
        [-77.039502, 38.903297],
      ],
      width: 4,
    },
  ];
}

const renderedLines = buildRenderedLines();

function zoomToProgress(zoom: number) {
  return Math.max(0, Math.min(1, (zoom - 13.2) / 2.2));
}

function zoomToScale(zoom: number) {
  return Math.max(0, Math.min(1, (zoom - 11.8) / 3.8));
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

type MarkerDimensions = {
  height: number;
  radius: number;
  width: number;
};

function markerDimensionsAt(
  scale: number,
  frames: Array<MarkerDimensions & { at: number }>,
): MarkerDimensions {
  const first = frames[0];
  const last = frames[frames.length - 1];

  if (scale <= first.at) return first;
  if (scale >= last.at) return last;

  for (let index = 1; index < frames.length; index++) {
    const previous = frames[index - 1];
    const next = frames[index];

    if (scale <= next.at) {
      const localProgress = (scale - previous.at) / (next.at - previous.at);

      return {
        width: lerp(previous.width, next.width, localProgress),
        height: lerp(previous.height, next.height, localProgress),
        radius: lerp(previous.radius, next.radius, localProgress),
      };
    }
  }

  return last;
}

function pointForLineBadge(line: RenderedLine, progress: number): LngLat {
  const coordinates = coordinatesForLine(line, progress);
  const routeFractions: Record<string, number> = {
    "3Y": 0.52,
    BLUE: 0.48,
    ORANGE: 0.42,
    RED: 0.43,
  };
  const targetFraction = routeFractions[line.routeId] ?? 0.5;
  const targetIndex = Math.min(
    coordinates.length - 1,
    Math.max(0, Math.round((coordinates.length - 1) * targetFraction)),
  );

  return coordinates[targetIndex];
}

function RouteLineBadge({
  line,
  progress,
}: {
  line: RenderedLine;
  progress: number;
}) {
  const point = pointForLineBadge(line, progress);
  const opacity = 1 - clamp01((progress - 0.62) / 0.28);

  if (line.mode !== "transit" || opacity <= 0.02) return null;

  return (
    <MapMarker longitude={point[0]} latitude={point[1]} anchor="center">
      <MarkerContent className="size-0 cursor-default">
        <span
          className="pointer-events-none absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 text-[13px] font-bold leading-none text-white shadow-sm"
          style={{
            backgroundColor: line.color,
            opacity,
          }}
        >
          {line.label}
        </span>
      </MarkerContent>
    </MapMarker>
  );
}

function metroMergedDimensions(scale: number): MarkerDimensions {
  return markerDimensionsAt(scale, [
    { at: 0, width: 10, height: 22, radius: 5 },
    { at: 0.45, width: 32.8, height: 45.3, radius: 7.8 },
    { at: 0.75, width: 35.2, height: 35.2, radius: 7.1 },
    { at: 1, width: 35.1, height: 35.1, radius: 9.5 },
  ]);
}

function multipointMergedDimensions(scale: number): MarkerDimensions {
  return markerDimensionsAt(scale, [
    { at: 0, width: 10, height: 10, radius: 5 },
    { at: 0.5, width: 14.3, height: 31.7, radius: 7.1 },
    { at: 0.78, width: 10, height: 10, radius: 5 },
  ]);
}

function TransitiveNetworkLayer({
  progress,
  lines,
}: {
  progress: number;
  lines: RenderedLine[];
}) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    const add = () => {
      for (const line of lines) {
        const sourceId = `transitive-${line.id}-source`;
        const layerId = `transitive-${line.id}-layer`;
        const data: GeoJSON.Feature<GeoJSON.LineString> = {
          type: "Feature",
          properties: { label: line.label },
          geometry: {
            type: "LineString",
            coordinates: coordinatesForLine(line, 0),
          },
        };

        map.addSource(sourceId, { type: "geojson", data });
        map.addLayer({
          id: layerId,
          type: "line",
          source: sourceId,
          layout: {
            "line-cap": "round",
            "line-join": "round",
            "line-sort-key":
              line.mode === "walk" ? 5 : line.routeId === "RED" ? 4 : 2,
          },
          paint: {
            "line-color": line.color,
            "line-width": line.width,
            "line-opacity": line.mode === "walk" ? 0.9 : 0.94,
            "line-offset": line.offset,
            ...(line.dashArray && { "line-dasharray": line.dashArray }),
          },
        });
      }
    };

    if (map.isStyleLoaded()) add();
    else map.once("load", add);

    return () => {
      for (const line of [...lines].reverse()) {
        const sourceId = `transitive-${line.id}-source`;
        const layerId = `transitive-${line.id}-layer`;

        try {
          if (map.getLayer(layerId)) map.removeLayer(layerId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
        } catch {}
      }
    };
  }, [isLoaded, lines, map]);

  useEffect(() => {
    if (!map || !isLoaded) return;

    for (const line of lines) {
      const source = map.getSource(
        `transitive-${line.id}-source`,
      ) as GeoJSONSource | undefined;

      source?.setData({
        type: "Feature",
        properties: { label: line.label },
        geometry: {
          type: "LineString",
          coordinates: coordinatesForLine(line, progress),
        },
      });
    }
  }, [isLoaded, lines, map, progress]);

  return null;
}

function TransitiveStopMarker({
  label,
  opacity = 1,
  point,
  scale,
  variant = "stop",
}: {
  label: string;
  opacity?: number;
  point: LngLat;
  scale: number;
  variant?: "stop" | "major" | "metro-merged" | "multipoint-merged";
}) {
  const dimensions =
    variant === "metro-merged"
      ? metroMergedDimensions(scale)
      : variant === "multipoint-merged"
        ? multipointMergedDimensions(scale)
        : {
            width: variant === "major" ? 15 + scale * 7 : 7 + scale * 4,
            height: variant === "major" ? 15 + scale * 7 : 7 + scale * 4,
            radius: variant === "major" ? (15 + scale * 7) / 2 : (7 + scale * 4) / 2,
          };
  const { width, height, radius } = dimensions;
  const labelOffset = width / 2 + 5;
  const fontSize = 11 + scale;
  const strokeColor =
    variant === "metro-merged" || variant === "multipoint-merged"
      ? "#000088"
      : "var(--foreground)";

  return (
    <MapMarker longitude={point[0]} latitude={point[1]} anchor="center">
      <MarkerContent className="size-0 cursor-default">
        <div
          className="pointer-events-none absolute left-0 top-0 size-0"
          style={{ opacity }}
        >
          <div
            className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-background shadow-sm"
            style={{
              width,
              height,
              borderColor: strokeColor,
              borderRadius: radius,
            }}
          />
          <span
            className="absolute top-0 -translate-y-1/2 whitespace-nowrap font-semibold leading-none text-foreground [text-shadow:0_1px_0_var(--background),0_-1px_0_var(--background),1px_0_0_var(--background),-1px_0_0_var(--background)]"
            style={{ left: labelOffset, fontSize }}
          >
            {label}
          </span>
        </div>
      </MarkerContent>
    </MapMarker>
  );
}

export function TransitiveCard() {
  const [viewport, setViewport] = useState({
    center: [-77.0395, 38.8993] as LngLat,
    zoom: 11.9,
    bearing: 0,
    pitch: 0,
  });
  const progress = zoomToProgress(viewport.zoom);
  const markerScale = zoomToScale(viewport.zoom);
  const farragutClusterVisible = markerScale < 0.82;
  const farragutClusterOpacity = 1 - clamp01((markerScale - 0.68) / 0.14);

  return (
    <div className="relative h-full w-full">
      <MapView
        viewport={viewport}
        theme="light"
        onViewportChange={setViewport}
      >
        <TransitiveNetworkLayer progress={progress} lines={renderedLines} />

        {renderedLines.map((line) => (
          <RouteLineBadge key={`${line.id}-badge`} line={line} progress={progress} />
        ))}

        {farragutClusterVisible && (
          <TransitiveStopMarker
            label="Farragut North Area"
            opacity={farragutClusterOpacity}
            point={[-77.03962, 38.90288]}
            scale={markerScale}
            variant="multipoint-merged"
          />
        )}

        {fakeTransitiveData.places.map((place, index) => {
          const size = 22 + markerScale * 10;
          const labelOffset = size / 2 + 6;

          return (
            <MapMarker
              key={place.place_id}
              longitude={place.place_lon}
              latitude={place.place_lat}
              anchor="center"
            >
              <MarkerContent className="size-0 cursor-default">
                <div className="pointer-events-none absolute left-0 top-0 size-0">
                  <div
                    className="absolute left-0 top-0 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-foreground bg-background font-bold shadow-sm"
                    style={{
                      width: size,
                      height: size,
                      fontSize: 10 + markerScale * 2,
                    }}
                  >
                    {index === 0 ? "A" : "B"}
                  </div>
                  <span
                    className="absolute top-0 -translate-y-1/2 whitespace-nowrap font-semibold leading-none text-foreground [text-shadow:0_1px_0_var(--background),0_-1px_0_var(--background),1px_0_0_var(--background),-1px_0_0_var(--background)]"
                    style={{ left: labelOffset, fontSize: 11 + markerScale }}
                  >
                    {place.place_name}
                  </span>
                </div>
              </MarkerContent>
            </MapMarker>
          );
        })}

        {fakeTransitiveData.stops.map((stop) => {
          if (
            farragutClusterVisible &&
            (stop.stop_id === "farragut" || stop.stop_id === "k17")
          ) {
            return null;
          }

          return (
            <TransitiveStopMarker
              key={stop.stop_id}
              label={stop.stop_name}
              point={[stop.stop_lon, stop.stop_lat]}
              scale={markerScale}
              variant={
                stop.stop_id === "metro"
                  ? "metro-merged"
                  : stop.stop_id === "rosslyn"
                    ? "major"
                    : "stop"
              }
            />
          );
        })}
      </MapView>

      <p className="absolute right-4 bottom-7 z-10 text-[10px] font-medium text-muted-foreground drop-shadow-sm">
        Zoom {viewport.zoom.toFixed(1)} · lines {Math.round(progress * 100)}%
        geographic · stops pinned
      </p>
    </div>
  );
}
