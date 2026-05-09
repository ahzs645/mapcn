"use client";

import { MapMarker, MarkerContent } from "@/registry/map";

import type { Cluster } from "./clustering";
import type {
  SegmentLabelPlacement,
  StopLabelPlacement,
} from "./labeler";
import {
  MAJOR_STOP_RADIUS,
  NOT_FOCUSED_STROKE,
  PLACE_FONT,
  PLACE_RADIUS,
  STOP_RADIUS,
  STOP_STROKE,
  clamp01,
} from "./styler";
import type { Place, Stop } from "./types";

const LABEL_TEXT_SHADOW =
  "0 1px 0 var(--background),0 -1px 0 var(--background),1px 0 0 var(--background),-1px 0 0 var(--background)";

function LabelSpan({
  placement,
  text,
  opacity = 1,
}: {
  placement: StopLabelPlacement | undefined;
  text: string;
  opacity?: number;
}) {
  if (!placement || opacity <= 0.01) return null;
  return (
    <span
      className="pointer-events-none absolute left-0 top-0 whitespace-nowrap text-center font-semibold leading-none text-foreground"
      style={{
        transform: `translate(${placement.offsetX}px, ${placement.offsetY}px) translate(-50%, -50%)`,
        fontSize: placement.fontSize,
        textShadow: LABEL_TEXT_SHADOW,
        opacity,
      }}
    >
      {text}
    </span>
  );
}

export function StopMarker({
  stop,
  scale,
  major,
  focused,
  opacity,
  placement,
}: {
  stop: Stop;
  scale: number;
  major: boolean;
  focused: boolean;
  opacity: number;
  placement: StopLabelPlacement | undefined;
}) {
  const radius = major ? MAJOR_STOP_RADIUS(scale) : STOP_RADIUS(scale);
  const stroke = STOP_STROKE(scale);
  const size = radius * 2;
  const borderColor = focused ? "var(--foreground)" : NOT_FOCUSED_STROKE;

  return (
    <MapMarker
      longitude={stop.stop_lon}
      latitude={stop.stop_lat}
      anchor="center"
    >
      <MarkerContent className="size-0 cursor-default">
        <div
          className="pointer-events-none absolute left-0 top-0 size-0"
          style={{ opacity }}
        >
          <div
            className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background shadow-sm"
            style={{
              width: size,
              height: size,
              borderColor,
              borderStyle: "solid",
              borderWidth: stroke,
            }}
          />
          <LabelSpan placement={placement} text={stop.stop_name} />
        </div>
      </MarkerContent>
    </MapMarker>
  );
}

export function ClusterMarker({
  cluster,
  focused,
  placement,
}: {
  cluster: Cluster;
  focused: boolean;
  placement: StopLabelPlacement | undefined;
}) {
  const opacity = clamp01(cluster.mergeFactor);
  if (opacity <= 0.01) return null;

  const { width, height, offsetX, offsetY, radius } = cluster.pixelBox;
  const borderColor = focused ? "#000088" : NOT_FOCUSED_STROKE;

  return (
    <MapMarker
      longitude={cluster.centroid[0]}
      latitude={cluster.centroid[1]}
      anchor="center"
    >
      <MarkerContent className="size-0 cursor-default">
        <div
          className="pointer-events-none absolute left-0 top-0 size-0"
          style={{ opacity }}
        >
          <div
            className="absolute left-0 top-0 bg-background shadow-sm"
            style={{
              width,
              height,
              transform: `translate(${offsetX - width / 2}px, ${offsetY - height / 2}px)`,
              borderColor,
              borderStyle: "solid",
              borderWidth: 2,
              borderRadius: radius,
            }}
          />
          <LabelSpan
            placement={placement}
            text={cluster.children
              .map((c) => c.stop_name.split(/[ ,]/)[0])
              .join(" / ")}
          />
        </div>
      </MarkerContent>
    </MapMarker>
  );
}

export function PlaceMarker({
  place,
  scale,
  letter,
  focused,
  placement,
}: {
  place: Place;
  scale: number;
  letter: string;
  focused: boolean;
  placement: StopLabelPlacement | undefined;
}) {
  const size = PLACE_RADIUS(scale) * 2;
  const fontSize = PLACE_FONT(scale);
  const borderColor = focused ? "var(--foreground)" : NOT_FOCUSED_STROKE;

  return (
    <MapMarker
      longitude={place.place_lon}
      latitude={place.place_lat}
      anchor="center"
    >
      <MarkerContent className="size-0 cursor-default">
        <div className="pointer-events-none absolute left-0 top-0 size-0">
          <div
            className="absolute left-0 top-0 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-background font-bold shadow-sm"
            style={{
              width: size,
              height: size,
              borderColor,
              borderStyle: "solid",
              borderWidth: 2,
              fontSize,
            }}
          >
            {letter}
          </div>
          <LabelSpan placement={placement} text={place.place_name} />
        </div>
      </MarkerContent>
    </MapMarker>
  );
}

export function RouteBadge({
  placement,
  focused,
}: {
  placement: SegmentLabelPlacement;
  focused: boolean;
}) {
  if (!focused) return null;
  return (
    <MapMarker
      longitude={placement.position[0]}
      latitude={placement.position[1]}
      anchor="center"
    >
      <MarkerContent className="size-0 cursor-default">
        <span
          className="pointer-events-none absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 font-bold leading-none text-white shadow-sm"
          style={{
            backgroundColor: placement.color,
            fontSize: placement.fontSize,
          }}
        >
          {placement.text}
        </span>
      </MarkerContent>
    </MapMarker>
  );
}

