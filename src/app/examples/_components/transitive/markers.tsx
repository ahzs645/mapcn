"use client";

import { MapMarker, MarkerContent } from "@/registry/map";

import type { SegmentLabelPlacement, StopLabelPlacement } from "./labeler";
import {
  MAJOR_STOP_RADIUS,
  NOT_FOCUSED_STROKE,
  PLACE_FONT,
  PLACE_RADIUS,
  STOP_RADIUS,
  STOP_STROKE,
  pixels,
} from "./styler";
import type { LngLat, Place } from "./types";

const LABEL_TEXT_SHADOW =
  "0 1px 0 var(--background),0 -1px 0 var(--background),1px 0 0 var(--background),-1px 0 0 var(--background)";

function LabelSpan({
  placement,
  opacity = 1,
}: {
  placement: StopLabelPlacement | undefined;
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
      {placement.text}
    </span>
  );
}

/** Plain circular stop marker. */
export function StopMarker({
  lngLat,
  scale,
  major,
  focused,
  placement,
}: {
  lngLat: LngLat;
  scale: number;
  major: boolean;
  focused: boolean;
  placement: StopLabelPlacement | undefined;
}) {
  const radius = major ? MAJOR_STOP_RADIUS(scale) : STOP_RADIUS(scale);
  const stroke = STOP_STROKE(scale);
  const size = radius * 2;
  const borderColor = focused ? "var(--foreground)" : NOT_FOCUSED_STROKE;

  return (
    <MapMarker longitude={lngLat[0]} latitude={lngLat[1]} anchor="center">
      <MarkerContent className="size-0 cursor-default">
        <div className="pointer-events-none absolute left-0 top-0 size-0">
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
          <LabelSpan placement={placement} />
        </div>
      </MarkerContent>
    </MapMarker>
  );
}

/**
 * Transfer hub / merged-stop marker — transitive's MultiPoint rounded rect.
 * Used both for convergence stops (e.g. Metro Center) and for clusters of
 * stops merged into one vertex at low zoom.
 */
export function HubMarker({
  lngLat,
  scale,
  focused,
  placement,
  members,
}: {
  lngLat: LngLat;
  scale: number;
  focused: boolean;
  placement: StopLabelPlacement | undefined;
  members: number;
}) {
  // a multi-stop cluster reads as a slightly larger pill than a single transfer
  const grow = members > 1 ? 1.25 : 1;
  const width = pixels(scale, 7, 22, 32) * grow;
  const height = pixels(scale, 16, 26, 32);
  const radius = pixels(scale, 4, 7, 10);
  const borderColor = focused ? "#0b1f4d" : NOT_FOCUSED_STROKE;
  const borderWidth = pixels(scale, 1.4, 2.2, 3);

  return (
    <MapMarker longitude={lngLat[0]} latitude={lngLat[1]} anchor="center">
      <MarkerContent className="size-0 cursor-default">
        <div className="pointer-events-none absolute left-0 top-0 size-0">
          <div
            className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 bg-background shadow-sm"
            style={{
              width,
              height,
              borderColor,
              borderStyle: "solid",
              borderWidth,
              borderRadius: radius,
            }}
          />
          <LabelSpan placement={placement} />
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
    <MapMarker longitude={place.place_lon} latitude={place.place_lat} anchor="center">
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
          <LabelSpan placement={placement} />
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
          style={{ backgroundColor: placement.color, fontSize: placement.fontSize }}
        >
          {placement.text}
        </span>
      </MarkerContent>
    </MapMarker>
  );
}
