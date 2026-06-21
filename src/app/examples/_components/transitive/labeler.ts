import { transitiveData } from "./data";
import {
  interpolateEdge,
  placeLayout,
  placePosition,
  renderedEdges,
  stopLayout,
  stopPosition,
} from "./graph";
import {
  PLACE_FONT,
  PLACE_RADIUS,
  ROUTE_BADGE_FONT,
  STOP_FONT,
  STOP_RADIUS,
  metersPerPixel,
  pixels,
} from "./styler";
import type { LngLat, RenderedEdge } from "./types";

export type Orientation = "E" | "W" | "N" | "S" | "NE" | "NW" | "SE" | "SW";

type Bbox = { x: number; y: number; w: number; h: number };
type OccupiedBbox = Bbox & { kind?: string; id?: string };

export type StopLabelPlacement = {
  id: string;
  orientation: Orientation;
  offsetX: number;
  offsetY: number;
  fontSize: number;
  text: string;
};

export type SegmentLabelPlacement = {
  edge_id: string;
  patternId: string;
  route_id: string;
  text: string;
  color: string;
  position: LngLat;
  fontSize: number;
};

type LabelOutput = {
  stops: Map<string, StopLabelPlacement>;
  places: Map<string, StopLabelPlacement>;
  segments: SegmentLabelPlacement[];
};

const ORIGIN: LngLat = [-77.0395, 38.8993];
const GAP = 5;
const STOP_ORIENTATIONS: Orientation[] = ["E", "W", "N", "S"];
const ANCHOR_OFFSETS = [0, 0.18, -0.18, 0.32, -0.32, 0.45, -0.45];

const routeById = new Map(transitiveData.routes.map((r) => [r.route_id, r]));
const placeById = new Map(transitiveData.places.map((p) => [p.place_id, p]));

function projectToPixels(point: LngLat, mpp: number): { x: number; y: number } {
  const dxMeters =
    (point[0] - ORIGIN[0]) * 111320 * Math.cos((ORIGIN[1] * Math.PI) / 180);
  const dyMeters = (point[1] - ORIGIN[1]) * 111320;
  return { x: dxMeters / mpp, y: -dyMeters / mpp };
}

function unprojectPixels(px: { x: number; y: number }, mpp: number): LngLat {
  const dxMeters = px.x * mpp;
  const dyMeters = -px.y * mpp;
  const lon =
    ORIGIN[0] + dxMeters / (111320 * Math.cos((ORIGIN[1] * Math.PI) / 180));
  const lat = ORIGIN[1] + dyMeters / 111320;
  return [lon, lat];
}

function bboxesOverlap(a: Bbox, b: Bbox): boolean {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
}

function estimateLabelSize(text: string, fontSize: number): { w: number; h: number } {
  return { w: Math.max(8, text.length * fontSize * 0.48), h: fontSize + 2 };
}

function offsetForOrientation(
  radius: number,
  size: { w: number; h: number },
  orient: Orientation,
): { x: number; y: number } {
  const half = radius + GAP;
  switch (orient) {
    case "E":
      return { x: half + size.w / 2, y: 0 };
    case "W":
      return { x: -(half + size.w / 2), y: 0 };
    case "N":
      return { x: 0, y: -(half + size.h / 2) };
    case "S":
      return { x: 0, y: half + size.h / 2 };
    case "NE":
      return { x: half * 0.71 + size.w / 2, y: -(half * 0.71 + size.h / 2) };
    case "NW":
      return { x: -(half * 0.71 + size.w / 2), y: -(half * 0.71 + size.h / 2) };
    case "SE":
      return { x: half * 0.71 + size.w / 2, y: half * 0.71 + size.h / 2 };
    case "SW":
      return { x: -(half * 0.71 + size.w / 2), y: half * 0.71 + size.h / 2 };
  }
}

function placeOriented(
  anchorPx: { x: number; y: number },
  radius: number,
  text: string,
  fontSize: number,
  occupied: OccupiedBbox[],
): { orientation: Orientation; offsetX: number; offsetY: number; bbox: Bbox } | null {
  const size = estimateLabelSize(text, fontSize);
  for (const orient of STOP_ORIENTATIONS) {
    const off = offsetForOrientation(radius, size, orient);
    const bbox: Bbox = {
      x: anchorPx.x + off.x - size.w / 2,
      y: anchorPx.y + off.y - size.h / 2,
      w: size.w,
      h: size.h,
    };
    if (occupied.every((other) => !bboxesOverlap(bbox, other))) {
      return { orientation: orient, offsetX: off.x, offsetY: off.y, bbox };
    }
  }
  return null;
}

function vertexRadius(isHub: boolean, scale: number): number {
  return isHub ? pixels(scale, 9, 13, 17) : STOP_RADIUS(scale);
}

/**
 * Place stop / place labels and route badges. Everything is projected into a
 * flat pixel space centred on a reference lat, then each label tries candidate
 * orientations until it finds one clear of marker bodies and previously-placed
 * labels — transitive's Labeler collision strategy, fed the morphed positions so
 * labels track stops through the schematic→geographic transition.
 */
export function placeLabels(
  zoom: number,
  scale: number,
  progress: number,
): LabelOutput {
  const mpp = metersPerPixel(ORIGIN[1], zoom);
  const occupied: OccupiedBbox[] = [];

  const stops = [...stopLayout.values()].map((s) => ({
    ...s,
    pos: stopPosition(s, progress),
    isHub: s.role === "hub",
  }));

  // marker bodies
  for (const s of stops) {
    const px = projectToPixels(s.pos, mpp);
    const r = vertexRadius(s.isHub, scale);
    occupied.push({ kind: "stop", id: s.stop_id, x: px.x - r, y: px.y - r, w: r * 2, h: r * 2 });
  }
  for (const place of placeLayout.values()) {
    const px = projectToPixels(placePosition(place, progress), mpp);
    const r = PLACE_RADIUS(scale);
    occupied.push({
      kind: "place",
      id: place.place_id,
      x: px.x - r,
      y: px.y - r,
      w: r * 2,
      h: r * 2,
    });
  }

  // route badges first, so stop labels route around them
  const segments = placeSegmentLabels(scale, zoom, progress, mpp, occupied);

  const stopsOut = new Map<string, StopLabelPlacement>();
  const placesOut = new Map<string, StopLabelPlacement>();

  type Anchor = {
    id: string;
    center: LngLat;
    radius: number;
    text: string;
    fontSize: number;
    priority: number;
    kind: "stop" | "place";
  };

  const anchors: Anchor[] = [];
  for (const place of placeLayout.values()) {
    anchors.push({
      id: place.place_id,
      center: placePosition(place, progress),
      radius: PLACE_RADIUS(scale),
      text: placeById.get(place.place_id)?.place_name ?? "",
      fontSize: PLACE_FONT(scale),
      priority: 0,
      kind: "place",
    });
  }
  for (const s of stops) {
    // hide minor (non-hub) stop labels when zoomed far out
    if (!s.isHub && scale < 1.2) continue;
    anchors.push({
      id: s.stop_id,
      center: s.pos,
      radius: vertexRadius(s.isHub, scale),
      text: s.stop_name,
      fontSize: STOP_FONT(scale),
      priority: s.isHub ? 1 : 2,
      kind: "stop",
    });
  }

  anchors.sort((a, b) => a.priority - b.priority);

  for (const anchor of anchors) {
    const px = projectToPixels(anchor.center, mpp);
    const placement = placeOriented(px, anchor.radius, anchor.text, anchor.fontSize, occupied);
    if (!placement) continue;
    occupied.push({ ...placement.bbox, kind: "label", id: anchor.id });
    const out: StopLabelPlacement = {
      id: anchor.id,
      orientation: placement.orientation,
      offsetX: placement.offsetX,
      offsetY: placement.offsetY,
      fontSize: anchor.fontSize,
      text: anchor.text,
    };
    (anchor.kind === "place" ? placesOut : stopsOut).set(anchor.id, out);
  }

  return { stops: stopsOut, places: placesOut, segments };
}

function estimateLineWidth(edge: RenderedEdge, zoom: number): number {
  const stops: Array<[number, number]> = [
    [9, 2],
    [11, 4],
    [13, 7],
    [15, 11],
    [17, 14],
  ];
  const base = edge.width;
  if (zoom <= stops[0][0]) return stops[0][1] * base;
  if (zoom >= stops[stops.length - 1][0]) return stops[stops.length - 1][1] * base;
  for (let i = 1; i < stops.length; i++) {
    const [z0, w0] = stops[i - 1];
    const [z1, w1] = stops[i];
    if (zoom <= z1) return (w0 + (w1 - w0) * ((zoom - z0) / (z1 - z0))) * base;
  }
  return stops[stops.length - 1][1] * base;
}

function applyEdgeOffset(coords: LngLat[], offsetPx: number, mpp: number): LngLat[] {
  if (offsetPx === 0) return coords;
  const offsetMeters = offsetPx * mpp;
  return coords.map((point, i) => {
    const prev = coords[Math.max(0, i - 1)];
    const next = coords[Math.min(coords.length - 1, i + 1)];
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const len = Math.hypot(dx, dy);
    if (len === 0) return point;
    const nx = dy / len;
    const ny = -dx / len;
    const dyDeg = (ny * offsetMeters) / 111320;
    const dxDeg = (nx * offsetMeters) / (111320 * Math.cos((point[1] * Math.PI) / 180));
    return [point[0] + dxDeg, point[1] + dyDeg];
  });
}

function polylineSamples(coords: LngLat[], mpp: number) {
  const px = coords.map((c) => projectToPixels(c, mpp));
  const cumulative = [0];
  for (let i = 1; i < px.length; i++) {
    cumulative.push(cumulative[i - 1] + Math.hypot(px[i].x - px[i - 1].x, px[i].y - px[i - 1].y));
  }
  return { px, cumulative };
}

function pointAtFraction(
  px: Array<{ x: number; y: number }>,
  cumulative: number[],
  fraction: number,
): { x: number; y: number } {
  const total = cumulative[cumulative.length - 1];
  const target = total * Math.max(0, Math.min(1, fraction));
  for (let i = 1; i < cumulative.length; i++) {
    if (cumulative[i] >= target) {
      const segLen = cumulative[i] - cumulative[i - 1];
      const local = segLen === 0 ? 0 : (target - cumulative[i - 1]) / segLen;
      return {
        x: px[i - 1].x + (px[i].x - px[i - 1].x) * local,
        y: px[i - 1].y + (px[i].y - px[i - 1].y) * local,
      };
    }
  }
  return px[px.length - 1];
}

function placeSegmentLabels(
  scale: number,
  zoom: number,
  progress: number,
  mpp: number,
  occupied: OccupiedBbox[],
): SegmentLabelPlacement[] {
  const placements: SegmentLabelPlacement[] = [];
  const seen = new Set<string>();
  const fontSize = ROUTE_BADGE_FONT(scale);
  const lowZoom = scale < 1;

  for (const edge of renderedEdges) {
    if (edge.mode !== "transit") continue;
    const dedupe = `${[edge.from_stop_id, edge.to_stop_id].sort().join("__")}::${edge.route_id}`;
    if (seen.has(dedupe)) continue;

    const route = routeById.get(edge.route_id);
    if (!route) continue;

    const offsetPx = edge.offset * (estimateLineWidth(edge, zoom) + 4);
    const coords = applyEdgeOffset(interpolateEdge(edge, progress), offsetPx, mpp);
    const samples = polylineSamples(coords, mpp);
    const text = route.route_short_name;
    const size = estimateLabelSize(text, fontSize);

    const emit = (pt: { x: number; y: number }) => {
      placements.push({
        edge_id: edge.edge_id,
        patternId: edge.pattern_id,
        route_id: edge.route_id,
        text,
        color: edge.color,
        position: unprojectPixels(pt, mpp),
        fontSize,
      });
      seen.add(dedupe);
    };

    if (lowZoom) {
      emit(pointAtFraction(samples.px, samples.cumulative, 0.5));
      continue;
    }

    let placed = false;
    for (const frac of ANCHOR_OFFSETS) {
      const t = 0.5 + frac;
      if (t < 0.05 || t > 0.95) continue;
      const pt = pointAtFraction(samples.px, samples.cumulative, t);
      const bbox: Bbox = { x: pt.x - size.w / 2, y: pt.y - size.h / 2, w: size.w, h: size.h };
      if (occupied.every((o) => !bboxesOverlap(bbox, o))) {
        occupied.push(bbox);
        emit(pt);
        placed = true;
        break;
      }
    }
    if (!placed) emit(pointAtFraction(samples.px, samples.cumulative, 0.5));
  }

  return placements;
}
