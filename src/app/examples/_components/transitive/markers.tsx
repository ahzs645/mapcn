"use client";

import type React from "react";

import { MapMarker, MarkerContent } from "@/registry/map";

import type { SegmentLabelPlacement, StopLabelPlacement } from "./labeler";
import type { StopRole } from "./graph";
import {
  NOT_FOCUSED_STROKE,
  PLACE_FONT,
  PLACE_RADIUS,
  STOP_STROKE,
  pixels,
} from "./styler";
import type { LngLat } from "./types";

const LABEL_TEXT_SHADOW =
  "0 1px 0 var(--background),0 -1px 0 var(--background),1px 0 0 var(--background),-1px 0 0 var(--background)";

function LabelSpan({
  placement,
}: {
  placement: StopLabelPlacement | undefined;
}) {
  if (!placement) return null;
  return (
    <span
      className="pointer-events-none absolute left-0 top-0 whitespace-nowrap text-center font-semibold leading-none text-foreground"
      style={{
        transform: `translate(${placement.offsetX}px, ${placement.offsetY}px) translate(-50%, -50%)`,
        fontSize: placement.fontSize,
        textShadow: LABEL_TEXT_SHADOW,
      }}
    >
      {placement.text}
    </span>
  );
}

/** Dimensions of the lane-spanning pill drawn for a transfer hub. */
function hubPill(scale: number, laneSpan: number) {
  const thickness = pixels(scale, 8, 12, 16);
  const laneStep = pixels(scale, 8, 13, 18);
  const length = thickness + (laneSpan + 0.4) * laneStep;
  return { thickness, length, radius: thickness / 2 };
}

/**
 * A station marker that morphs with the network. Three roles, matching the
 * source: a transfer `hub` is a white pill spanning its lanes (Metro Center),
 * a `terminal` is a filled circle (Rosslyn / Union), an intermediate `stop` is
 * a small white dot riding on the line.
 */
export function StationMarker({
  position,
  scale,
  role,
  laneSpan,
  angle,
  focused,
  placement,
}: {
  position: LngLat;
  scale: number;
  role: StopRole;
  laneSpan: number;
  /** orientation (radians) of the lines through the stop, for pill rotation */
  angle: number;
  focused: boolean;
  placement: StopLabelPlacement | undefined;
}) {
  const stroke = focused ? "var(--foreground)" : NOT_FOCUSED_STROKE;

  let body: React.ReactNode;
  if (role === "hub") {
    const { thickness, length, radius } = hubPill(scale, laneSpan);
    body = (
      <div
        className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 bg-background shadow-sm"
        style={{
          width: thickness,
          height: length,
          borderRadius: radius,
          borderColor: stroke,
          borderStyle: "solid",
          borderWidth: pixels(scale, 1.4, 2, 2.6),
          transform: `rotate(${(angle * 180) / Math.PI}deg)`,
        }}
      />
    );
  } else {
    // terminal and intermediate stops both read as hollow white circles
    // (terminals a touch larger) with a dark ring, matching the source.
    const r =
      role === "terminal" ? pixels(scale, 5, 7.5, 10) : pixels(scale, 3.5, 5, 7);
    body = (
      <div
        className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background shadow-sm"
        style={{
          width: r * 2,
          height: r * 2,
          borderColor: stroke,
          borderStyle: "solid",
          borderWidth:
            role === "terminal" ? pixels(scale, 1.6, 2.2, 3) : STOP_STROKE(scale),
        }}
      />
    );
  }

  return (
    <MapMarker longitude={position[0]} latitude={position[1]} anchor="center">
      <MarkerContent className="size-0 cursor-default">
        <div className="pointer-events-none absolute left-0 top-0 size-0">
          {body}
          <LabelSpan placement={placement} />
        </div>
      </MarkerContent>
    </MapMarker>
  );
}

export function PlaceMarker({
  position,
  scale,
  letter,
  focused,
  placement,
}: {
  position: LngLat;
  scale: number;
  letter: string;
  focused: boolean;
  placement: StopLabelPlacement | undefined;
}) {
  const size = PLACE_RADIUS(scale) * 2;
  const fontSize = PLACE_FONT(scale);
  const borderColor = focused ? "var(--foreground)" : NOT_FOCUSED_STROKE;

  return (
    <MapMarker longitude={position[0]} latitude={position[1]} anchor="center">
      <MarkerContent className="size-0 cursor-default">
        <div className="pointer-events-none absolute left-0 top-0 size-0">
          {/* origin / destination places are solid dark discs in the source */}
          <div
            className="absolute left-0 top-0 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-bold shadow-sm"
            style={{
              width: size,
              height: size,
              background: "var(--foreground)",
              color: "var(--background)",
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
