import { transitiveData } from "./data";
import { interpolateEdge, renderedEdges } from "./graph";
import {
  MAJOR_STOP_RADIUS,
  PLACE_FONT,
  PLACE_RADIUS,
  ROUTE_BADGE_FONT,
  STOP_FONT,
  STOP_RADIUS,
  metersPerPixel,
} from "./styler";
import type { LngLat, RenderedEdge } from "./types";
import type { Cluster } from "./clustering";

export type Orientation = "E" | "W" | "N" | "S" | "NE" | "NW" | "SE" | "SW";

type Bbox = { x: number; y: number; w: number; h: number };

type StopLabelInput = {
  stop_id: string;
  center: LngLat;
  radius: number;
  text: string;
  fontSize: number;
  priority: number;
};

export type StopLabelPlacement = {
  stop_id: string;
  orientation: Orientation;
  offsetX: number;
  offsetY: number;
  fontSize: number;
};

export type SegmentLabelPlacement = {
  edge_id: string;
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

const STOP_ORIENTATIONS: Orientation[] = [
  "E",
  "W",
  "NE",
  "SE",
  "NW",
  "SW",
  "N",
  "S",
];

function projectToPixels(
  point: LngLat,
  origin: LngLat,
  mpp: number,
): { x: number; y: number } {
  const dxMeters =
    (point[0] - origin[0]) * 111320 * Math.cos((origin[1] * Math.PI) / 180);
  const dyMeters = (point[1] - origin[1]) * 111320;
  return { x: dxMeters / mpp, y: -dyMeters / mpp };
}

function unprojectPixels(
  px: { x: number; y: number },
  origin: LngLat,
  mpp: number,
): LngLat {
  const dxMeters = px.x * mpp;
  const dyMeters = -px.y * mpp;
  const lon = origin[0] + dxMeters / (111320 * Math.cos((origin[1] * Math.PI) / 180));
  const lat = origin[1] + dyMeters / 111320;
  return [lon, lat];
}

function bboxesOverlap(a: Bbox, b: Bbox): boolean {
  return !(
    a.x + a.w < b.x ||
    b.x + b.w < a.x ||
    a.y + a.h < b.y ||
    b.y + b.h < a.y
  );
}

function estimateLabelSize(text: string, fontSize: number): { w: number; h: number } {
  return { w: Math.max(8, text.length * fontSize * 0.56), h: fontSize + 2 };
}

const GAP = 4;

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
  occupied: Bbox[],
  orientations: Orientation[],
): { orientation: Orientation; offsetX: number; offsetY: number; bbox: Bbox } {
  const size = estimateLabelSize(text, fontSize);

  for (const orient of orientations) {
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

  const fallback = offsetForOrientation(radius, size, orientations[0]);
  return {
    orientation: orientations[0],
    offsetX: fallback.x,
    offsetY: fallback.y,
    bbox: {
      x: anchorPx.x + fallback.x - size.w / 2,
      y: anchorPx.y + fallback.y - size.h / 2,
      w: size.w,
      h: size.h,
    },
  };
}

function polylineSamples(
  coords: LngLat[],
  origin: LngLat,
  mpp: number,
): { px: Array<{ x: number; y: number }>; cumulative: number[] } {
  const px = coords.map((c) => projectToPixels(c, origin, mpp));
  const cumulative = [0];
  for (let i = 1; i < px.length; i++) {
    const dx = px[i].x - px[i - 1].x;
    const dy = px[i].y - px[i - 1].y;
    cumulative.push(cumulative[i - 1] + Math.hypot(dx, dy));
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

/**
 * Mirror of transitive's `Labeler.doLayout` — projects every anchor into a
 * flat pixel space (centered at a reference lat for low distortion), then
 * tries each candidate orientation per label until it finds one that does
 * not collide with previously-placed labels or marker bodies.
 */
export function placeLabels(
  zoom: number,
  scale: number,
  progress: number,
  clusters: Cluster[],
  hiddenStopIds: Set<string>,
): LabelOutput {
  const origin: LngLat = [-77.0395, 38.8993];
  const mpp = metersPerPixel(origin[1], zoom);

  const occupied: Bbox[] = [];

  for (const cluster of clusters) {
    if (cluster.mergeFactor <= 0.01) continue;
    const px = projectToPixels(cluster.centroid, origin, mpp);
    occupied.push({
      x: px.x + cluster.pixelBox.offsetX - cluster.pixelBox.width / 2,
      y: px.y + cluster.pixelBox.offsetY - cluster.pixelBox.height / 2,
      w: cluster.pixelBox.width,
      h: cluster.pixelBox.height,
    });
  }

  for (const stop of transitiveData.stops) {
    if (hiddenStopIds.has(stop.stop_id)) continue;
    const px = projectToPixels([stop.stop_lon, stop.stop_lat], origin, mpp);
    const radius =
      stop.stop_id === "rosslyn" || stop.stop_id === "metro"
        ? MAJOR_STOP_RADIUS(scale)
        : STOP_RADIUS(scale);
    occupied.push({
      x: px.x - radius,
      y: px.y - radius,
      w: radius * 2,
      h: radius * 2,
    });
  }

  for (const place of transitiveData.places) {
    const px = projectToPixels([place.place_lon, place.place_lat], origin, mpp);
    const radius = PLACE_RADIUS(scale);
    occupied.push({
      x: px.x - radius,
      y: px.y - radius,
      w: radius * 2,
      h: radius * 2,
    });
  }

  const placeInputs: StopLabelInput[] = transitiveData.places.map((p) => ({
    stop_id: p.place_id,
    center: [p.place_lon, p.place_lat],
    radius: PLACE_RADIUS(scale),
    text: p.place_name,
    fontSize: PLACE_FONT(scale),
    priority: 0,
  }));

  const showMinorStopLabels = scale >= 1;
  const stopInputs: StopLabelInput[] = transitiveData.stops
    .filter((s) => !hiddenStopIds.has(s.stop_id))
    .filter((s) => {
      if (showMinorStopLabels) return true;
      return s.stop_id === "rosslyn" || s.stop_id === "metro";
    })
    .map((s) => ({
      stop_id: s.stop_id,
      center: [s.stop_lon, s.stop_lat],
      radius:
        s.stop_id === "rosslyn" || s.stop_id === "metro"
          ? MAJOR_STOP_RADIUS(scale)
          : STOP_RADIUS(scale),
      text: s.stop_name,
      fontSize: STOP_FONT(scale),
      priority: s.stop_id === "rosslyn" || s.stop_id === "metro" ? 1 : 2,
    }));

  for (const cluster of clusters) {
    if (cluster.mergeFactor <= 0.01) continue;
    placeInputs.push({
      stop_id: `__cluster__${cluster.cluster_id}`,
      center: cluster.centroid,
      radius: Math.max(cluster.pixelBox.width, cluster.pixelBox.height) / 2,
      text: cluster.children
        .map((c) => c.stop_name.split(" ")[0])
        .join(" / "),
      fontSize: STOP_FONT(scale),
      priority: 1,
    });
  }

  // Segment (route) badges are placed FIRST against just the marker bodies,
  // so they always survive the collision pass. Stop/place labels then route
  // around them. This matches the source's render order where route boxes
  // sit above stop labels.
  const segments = placeSegmentLabels(
    progress,
    scale,
    origin,
    mpp,
    occupied,
  );

  const places = new Map<string, StopLabelPlacement>();
  const stops = new Map<string, StopLabelPlacement>();

  const sortedAnchors = [...placeInputs, ...stopInputs].sort(
    (a, b) => a.priority - b.priority,
  );

  for (const input of sortedAnchors) {
    const px = projectToPixels(input.center, origin, mpp);
    const placement = placeOriented(
      px,
      input.radius,
      input.text,
      input.fontSize,
      occupied,
      STOP_ORIENTATIONS,
    );
    occupied.push(placement.bbox);
    const out: StopLabelPlacement = {
      stop_id: input.stop_id,
      orientation: placement.orientation,
      offsetX: placement.offsetX,
      offsetY: placement.offsetY,
      fontSize: input.fontSize,
    };
    if (input.stop_id.startsWith("__cluster__") || transitiveData.places.some((p) => p.place_id === input.stop_id)) {
      places.set(input.stop_id, out);
    } else {
      stops.set(input.stop_id, out);
    }
  }

  return { stops, places, segments };
}

const ANCHOR_OFFSETS = [0, 0.18, -0.18, 0.32, -0.32, 0.45, -0.45];

function placeSegmentLabels(
  progress: number,
  scale: number,
  origin: LngLat,
  mpp: number,
  occupied: Bbox[],
): SegmentLabelPlacement[] {
  const placements: SegmentLabelPlacement[] = [];
  const seenPerGroup = new Set<string>();
  const fontSize = ROUTE_BADGE_FONT(scale);

  // At low zoom every edge midpoint collapses to nearly one pixel; if we
  // enforced collision we would silently drop most badges. Below scale 1
  // we always emit the badge at the edge midpoint, accepting some overlap.
  const lowZoom = scale < 1;

  const transitEdges = renderedEdges.filter((e) => e.mode === "transit");

  for (const edge of transitEdges) {
    const groupKey = [edge.from_stop_id, edge.to_stop_id].sort().join("__");
    const dedupeKey = `${groupKey}::${edge.route_id}`;
    if (seenPerGroup.has(dedupeKey)) continue;

    const placement = placeBadgeAlongEdge(
      edge,
      progress,
      origin,
      mpp,
      occupied,
      fontSize,
      lowZoom,
    );
    if (!placement) continue;
    placements.push(placement);
    seenPerGroup.add(dedupeKey);
  }

  return placements;
}

function placeBadgeAlongEdge(
  edge: RenderedEdge,
  progress: number,
  origin: LngLat,
  mpp: number,
  occupied: Bbox[],
  fontSize: number,
  alwaysPlaceAtMidpoint: boolean,
): SegmentLabelPlacement | null {
  const route = transitiveData.routes.find((r) => r.route_id === edge.route_id);
  if (!route) return null;

  const baseCoords = interpolateEdge(edge, progress);
  const coords = applyEdgeOffset(baseCoords, edge.offset, mpp);
  const samples = polylineSamples(coords, origin, mpp);
  const text = route.route_short_name;
  const size = estimateLabelSize(text, fontSize);

  if (alwaysPlaceAtMidpoint) {
    const pt = pointAtFraction(samples.px, samples.cumulative, 0.5);
    return {
      edge_id: edge.edge_id,
      route_id: edge.route_id,
      text,
      color: edge.color,
      position: unprojectPixels(pt, origin, mpp),
      fontSize,
    };
  }

  for (const offsetFraction of ANCHOR_OFFSETS) {
    const t = 0.5 + offsetFraction;
    if (t < 0.05 || t > 0.95) continue;
    const pt = pointAtFraction(samples.px, samples.cumulative, t);
    const bbox: Bbox = {
      x: pt.x - size.w / 2,
      y: pt.y - size.h / 2,
      w: size.w,
      h: size.h,
    };
    if (occupied.every((o) => !bboxesOverlap(bbox, o))) {
      occupied.push(bbox);
      return {
        edge_id: edge.edge_id,
        route_id: edge.route_id,
        text,
        color: edge.color,
        position: unprojectPixels(pt, origin, mpp),
        fontSize,
      };
    }
  }

  const fallback = pointAtFraction(samples.px, samples.cumulative, 0.5);
  return {
    edge_id: edge.edge_id,
    route_id: edge.route_id,
    text,
    color: edge.color,
    position: unprojectPixels(fallback, origin, mpp),
    fontSize,
  };
}

/**
 * Approximates the perpendicular pixel offset that maplibre's
 * `line-offset` paint property applies, so badges land on the visible
 * line rather than the centerline.
 */
function applyEdgeOffset(
  coords: LngLat[],
  offsetPx: number,
  mpp: number,
): LngLat[] {
  if (offsetPx === 0) return coords;
  const offsetMeters = offsetPx * mpp;
  return coords.map((point, i) => {
    const prev = coords[Math.max(0, i - 1)];
    const next = coords[Math.min(coords.length - 1, i + 1)];
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const len = Math.hypot(dx, dy);
    if (len === 0) return point;
    const nx = -dy / len;
    const ny = dx / len;
    const dyDeg = (ny * offsetMeters) / 111320;
    const dxDeg =
      (nx * offsetMeters) /
      (111320 * Math.cos((point[1] * Math.PI) / 180));
    return [point[0] + dxDeg, point[1] + dyDeg];
  });
}
