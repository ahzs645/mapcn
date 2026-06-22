/**
 * Alignment bundling — a port of transitive.js's `Graph.apply2DOffsets`
 * (`lib/graph/graph.js`) adapted to our morph model.
 *
 * The original groups every edge-END across ALL routes by a geometric
 * "alignment id" `(angle mod 180°, perpendicular intercept)`, so collinear ends
 * from DIFFERENT corridors share one bundle (graph.js calculateAlignmentId /
 * apply2DOffsets). Lanes are then ordered and each end gets a lane index; the
 * offset is applied PER-END so a line can taper from a 2-lane bundle down to a
 * single un-offset segment at a terminal (edge.js getRenderCoords fromOffset/
 * toOffset).
 *
 * Ours keyed bundles on the sorted stop-pair, so a third route (Red) on a
 * different corridor could never join Blue/Orange's trunk. This module fixes
 * that: it computes alignment ids in the stable SCHEMATIC frame and assigns
 * `fromLane`/`toLane` per edge. The actual pixel offset is baked into the
 * morphed geometry at render time via `offsetPolyline`, so it's pixel-constant
 * at every zoom (unlike a latitude offset) and tapers cleanly at terminals.
 */

import type { LngLat, RenderedEdge } from "../types";

// ── local metric frame (so angles/intercepts are Euclidean) ──────────────────
const LNG0 = -77.04;
const LAT0 = 38.9;
const M_PER_DEG_LAT = 111320;
const M_PER_DEG_LNG = 111320 * Math.cos((LAT0 * Math.PI) / 180);

export function toMetric(p: LngLat): [number, number] {
  return [(p[0] - LNG0) * M_PER_DEG_LNG, (p[1] - LAT0) * M_PER_DEG_LAT];
}
function fromMetric(x: number, y: number): LngLat {
  return [LNG0 + x / M_PER_DEG_LNG, LAT0 + y / M_PER_DEG_LAT];
}

type V2 = [number, number];
const sub = (a: V2, b: V2): V2 => [a[0] - b[0], a[1] - b[1]];
function unit(v: V2): V2 {
  const l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
}

// ── alignment id ──────────────────────────────────────────────────────────────
// Quantize (angle mod 180°, signed perpendicular intercept of the line through
// the vertex). Two edge-ends with the same id lie on the same infinite line.
const ANGLE_TOL_DEG = 8;
const INTERCEPT_TOL_M = 45;

function alignmentId(vertex: V2, dir: V2): string {
  let angle = (Math.atan2(dir[1], dir[0]) * 180) / Math.PI; // -180..180
  angle = ((angle % 180) + 180) % 180; // 0..180
  const rad = (angle * Math.PI) / 180;
  // unit normal of the line (perpendicular to direction)
  const nx = -Math.sin(rad);
  const ny = Math.cos(rad);
  const intercept = vertex[0] * nx + vertex[1] * ny;
  const aKey = Math.round(angle / ANGLE_TOL_DEG);
  // wrap the 0/180 seam so ~179° and ~1° collapse together
  const aKeyWrapped = aKey % Math.round(180 / ANGLE_TOL_DEG);
  const iKey = Math.round(intercept / INTERCEPT_TOL_M);
  return `${aKeyWrapped}:${iKey}`;
}

type EdgeEnd = {
  edge: RenderedEdge;
  which: "from" | "to";
  vertex: V2;
  /** position of this edge's OPPOSITE end, to order lanes left→right */
  opposite: V2;
  routeKey: string; // route_type + route_id, the stable lane order
  routeId: string;
};

/**
 * Assign `fromLane`/`toLane` to every transit edge by alignment bundling.
 * Mutates the edges in place.
 */
export function computeLaneOffsets(edges: RenderedEdge[]): void {
  const transit = edges.filter((e) => e.mode === "transit");
  for (const e of transit) {
    e.fromLane = 0;
    e.toLane = 0;
  }

  // collect both ends of every edge, keyed by alignment id
  const buckets = new Map<string, EdgeEnd[]>();
  const push = (end: EdgeEnd, id: string) => {
    const arr = buckets.get(id);
    if (arr) arr.push(end);
    else buckets.set(id, [end]);
  };

  for (const e of transit) {
    const sc = e.schematic.map(toMetric);
    if (sc.length < 2) continue;
    const fromV = sc[0];
    const toV = sc[sc.length - 1];
    const fromDir = unit(sub(sc[1], sc[0])); // leaving from-vertex
    const toDir = unit(sub(sc[sc.length - 1], sc[sc.length - 2])); // into to-vertex
    const routeKey = `${routeTypeOf(e)}:${e.route_id}`;
    push(
      { edge: e, which: "from", vertex: fromV, opposite: toV, routeKey, routeId: e.route_id },
      alignmentId(fromV, fromDir),
    );
    push(
      { edge: e, which: "to", vertex: toV, opposite: fromV, routeKey, routeId: e.route_id },
      alignmentId(toV, toDir),
    );
  }

  for (const ends of buckets.values()) {
    if (ends.length < 2) continue;

    // alignment direction (from the first member), to project lane order onto
    const a = ends[0];
    const along = unit(sub(a.opposite, a.vertex));
    const normal: V2 = [-along[1], along[0]]; // left normal

    // one lane per distinct route (a through-route keeps a single lane); order
    // by the route's perpendicular side, falling back to a stable route key.
    const byRoute = new Map<string, { routeKey: string; perp: number; ends: EdgeEnd[] }>();
    for (const end of ends) {
      const rel = sub(end.opposite, end.vertex);
      const perp = rel[0] * normal[0] + rel[1] * normal[1];
      const cur = byRoute.get(end.routeId);
      if (cur) cur.ends.push(end);
      else byRoute.set(end.routeId, { routeKey: end.routeKey, perp, ends: [end] });
    }

    const lanes = [...byRoute.values()].sort((x, y) =>
      x.routeKey < y.routeKey ? -1 : x.routeKey > y.routeKey ? 1 : 0,
    );
    if (lanes.length < 2) continue;

    const n = lanes.length;
    lanes.forEach((lane, i) => {
      const laneIndex = i - (n - 1) / 2; // symmetric, route_id asc → higher = +
      for (const end of lane.ends) {
        if (end.which === "from") end.edge.fromLane = laneIndex;
        else end.edge.toLane = laneIndex;
      }
    });
  }
}

function routeTypeOf(e: RenderedEdge): number {
  // rail (1) sorts before bus (3); exact value doesn't matter, only order
  return e.width >= 1 ? 1 : 3;
}

// ── G7: prune degree-2 chains ──────────────────────────────────────────────────
/**
 * Port of `Graph.pruneVertices`/`mergeEdges`: fuse consecutive edges of the same
 * pattern that meet at a pass-through stop (degree 2 — only this pattern touches
 * it) into ONE edge carrying the interior point. A straight multi-stop trunk
 * becomes a single edge with one alignment, so the whole run bundles cleanly
 * instead of as a chain of separate stop-pair edges.
 */
function seqIndex(e: RenderedEdge): number {
  const m = /__(\d+)$/.exec(e.edge_id);
  return m ? Number(m[1]) : 0;
}

export function pruneEdges(edges: RenderedEdge[]): RenderedEdge[] {
  const transit = edges.filter((e) => e.mode === "transit");
  const other = edges.filter((e) => e.mode !== "transit");

  const degree = new Map<string, number>();
  for (const e of transit) {
    degree.set(e.from_stop_id, (degree.get(e.from_stop_id) ?? 0) + 1);
    degree.set(e.to_stop_id, (degree.get(e.to_stop_id) ?? 0) + 1);
  }

  const byPattern = new Map<string, RenderedEdge[]>();
  for (const e of transit) {
    const arr = byPattern.get(e.pattern_id);
    if (arr) arr.push(e);
    else byPattern.set(e.pattern_id, [e]);
  }

  const out: RenderedEdge[] = [];
  for (const arr of byPattern.values()) {
    arr.sort((a, b) => seqIndex(a) - seqIndex(b));
    let cur: RenderedEdge = {
      ...arr[0],
      schematic: [...arr[0].schematic],
      geo: [...arr[0].geo],
    };
    for (let i = 1; i < arr.length; i++) {
      const shared = cur.to_stop_id; // === arr[i].from_stop_id
      if (degree.get(shared) === 2) {
        // pass-through: fuse, dropping the duplicate shared point
        cur.schematic = cur.schematic.concat(arr[i].schematic.slice(1));
        cur.geo = cur.geo.concat(arr[i].geo.slice(1));
        cur.to_stop_id = arr[i].to_stop_id;
        cur.edge_id = `${cur.pattern_id}__pruned${seqIndex(arr[i])}`;
        cur.anchors = [0, cur.schematic.length - 1];
      } else {
        out.push(cur);
        cur = { ...arr[i], schematic: [...arr[i].schematic], geo: [...arr[i].geo] };
      }
    }
    out.push(cur);
  }
  return [...out, ...other];
}

// ── G8: nearby-stop clustering ─────────────────────────────────────────────────
/**
 * Port of `PointClusterMap`: union-find merge of stops within `thresholdMetres`.
 * Returns stopId → cluster representative id. Re-run as the zoom (and so the
 * effective metre threshold for a pixel radius) changes, to declutter on zoom-out.
 */
export function clusterStops(
  stops: Array<{ id: string; pos: LngLat }>,
  thresholdMetres: number,
): Map<string, string> {
  const parent = new Map(stops.map((s) => [s.id, s.id]));
  const find = (x: string): string => {
    const p = parent.get(x)!;
    if (p === x) return x;
    const r = find(p);
    parent.set(x, r);
    return r;
  };
  const m = stops.map((s) => ({ id: s.id, p: toMetric(s.pos) }));
  if (thresholdMetres > 0) {
    for (let i = 0; i < m.length; i++) {
      for (let j = i + 1; j < m.length; j++) {
        const d = Math.hypot(m[i].p[0] - m[j].p[0], m[i].p[1] - m[j].p[1]);
        if (d < thresholdMetres) parent.set(find(m[i].id), find(m[j].id));
      }
    }
  }
  const out = new Map<string, string>();
  for (const s of stops) out.set(s.id, find(s.id));
  return out;
}

// ── per-end offset baking ──────────────────────────────────────────────────────
/**
 * Offset a polyline by a PER-END amount (metres), interpolated by arc length and
 * applied along the miter normal at each vertex — the analog of transitive's
 * getRenderCoords(fromOffset, toOffset). fromOffsetM applies at coords[0],
 * toOffsetM at the last point; interior offsets interpolate, so an edge tapers
 * smoothly between a bundled lane and an un-offset terminal.
 */
export function offsetPolyline(
  coords: LngLat[],
  fromOffsetM: number,
  toOffsetM: number,
): LngLat[] {
  if (fromOffsetM === 0 && toOffsetM === 0) return coords;
  const pts = coords.map(toMetric);
  const n = pts.length;
  if (n < 2) return coords;

  const cum = [0];
  for (let i = 1; i < n; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const total = cum[n - 1] || 1;

  const out: LngLat[] = [];
  for (let i = 0; i < n; i++) {
    const off = fromOffsetM + (toOffsetM - fromOffsetM) * (cum[i] / total);
    if (i === 0) {
      const d = unit(sub(pts[1], pts[0]));
      out.push(fromMetric(pts[0][0] - d[1] * off, pts[0][1] + d[0] * off));
    } else if (i === n - 1) {
      const d = unit(sub(pts[n - 1], pts[n - 2]));
      out.push(fromMetric(pts[i][0] - d[1] * off, pts[i][1] + d[0] * off));
    } else {
      const d1 = unit(sub(pts[i], pts[i - 1]));
      const d2 = unit(sub(pts[i + 1], pts[i]));
      const n1: V2 = [-d1[1], d1[0]];
      const n2: V2 = [-d2[1], d2[0]];
      let mit: V2 = [n1[0] + n2[0], n1[1] + n2[1]];
      const ml = Math.hypot(mit[0], mit[1]);
      let scale = off;
      if (ml < 1e-6) {
        mit = n1;
      } else {
        mit = [mit[0] / ml, mit[1] / ml];
        const cosHalf = mit[0] * n1[0] + mit[1] * n1[1];
        scale = cosHalf > 0.2 ? off / cosHalf : off; // miter length (capped)
      }
      out.push(fromMetric(pts[i][0] + mit[0] * scale, pts[i][1] + mit[1] * scale));
    }
  }
  return out;
}
