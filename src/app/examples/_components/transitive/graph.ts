/**
 * Morph layout builder.
 *
 * transitive.js renders a schematic transit diagram; here we keep that diagram
 * anchored to a real MapLibre map and morph between two layouts as you zoom:
 *
 *   progress 0  → schematic   (the hand-authored octolinear coords in data.ts)
 *   progress 1  → geographic  (the real-street coords)
 *
 * The single most important property — and the bug the previous iteration got
 * wrong — is that EVERYTHING morphs together: stop markers, line interiors AND
 * the line endpoints (anchors). If markers stay geographic while lines morph to
 * schematic, a shared station (e.g. Metro Center) detaches from its own lines.
 *
 * Parallel routes sharing a corridor (Blue + Orange between Rosslyn and Metro
 * Center) are collapsed onto ONE centerline; lane separation is then applied
 * uniformly as a MapLibre `line-offset` (see network-layer.tsx) so it works the
 * same in both regimes and never double-offsets.
 */

import { patternGeometry, transitiveData, walkSegments } from "./data";
import { computeLaneOffsets } from "./engine/bundle";
import { lerpLngLat } from "./styler";
import type { EdgeGroup, LngLat, RenderedEdge } from "./types";

/** Gap (px) between sibling lines on top of their stroke width. The source
 * bundles parallel lanes tight against each other, so keep this small. */
export const LANE_GAP_PX = 1;

const WALK_COLOR = "#59d5ea";

const routeById = new Map(transitiveData.routes.map((r) => [r.route_id, r]));

function widthScaleForRoute(routeType: number): number {
  return routeType === 1 ? 1 : 0.7;
}

function buildTransitEdges(): RenderedEdge[] {
  const edges: RenderedEdge[] = [];

  for (const pattern of transitiveData.patterns) {
    const route = routeById.get(pattern.route_id);
    if (!route) throw new Error(`Unknown route: ${pattern.route_id}`);

    const geometry = patternGeometry[pattern.pattern_id];
    if (!geometry) {
      throw new Error(`Missing geometry for pattern: ${pattern.pattern_id}`);
    }
    if (geometry.anchors.length !== pattern.stops.length) {
      throw new Error(
        `Pattern ${pattern.pattern_id}: anchors length ${geometry.anchors.length} ≠ stops length ${pattern.stops.length}`,
      );
    }

    for (let i = 0; i < pattern.stops.length - 1; i++) {
      const fromStopId = pattern.stops[i].stop_id;
      const toStopId = pattern.stops[i + 1].stop_id;
      const a = geometry.anchors[i];
      const b = geometry.anchors[i + 1];

      edges.push({
        edge_id: `${pattern.pattern_id}__${i}`,
        pattern_id: pattern.pattern_id,
        route_id: pattern.route_id,
        from_stop_id: fromStopId,
        to_stop_id: toStopId,
        geo: geometry.geo.slice(a, b + 1),
        schematic: geometry.schematic.slice(a, b + 1),
        anchors: [0, b - a],
        offset: 0,
        width: widthScaleForRoute(route.route_type),
        color: route.route_color,
        mode: "transit",
      });
    }
  }

  return edges;
}

function buildEdgeGroups(edges: RenderedEdge[]): EdgeGroup[] {
  const groups = new Map<string, EdgeGroup>();

  for (const edge of edges) {
    if (edge.mode !== "transit") continue;
    const [from, to] = [edge.from_stop_id, edge.to_stop_id].sort();
    const key = `${from}__${to}`;
    let group = groups.get(key);
    if (!group) {
      group = { key, from_stop_id: from, to_stop_id: to, edges: [] };
      groups.set(key, group);
    }
    group.edges.push(edge);
  }

  return Array.from(groups.values());
}

/**
 * Collapse the parallel members of each corridor onto a single shared
 * centerline (point-wise mean of their schematic coords). After this, lane
 * separation comes purely from `line-offset`, so a shared station marker sits on
 * the centerline and the lanes fan out symmetrically around it — exactly how the
 * source draws Metro Center's pill across the Blue/Orange/Red lanes.
 */
function collapseToCenterlines(groups: EdgeGroup[]): void {
  for (const group of groups) {
    if (group.edges.length < 2) continue;

    const reference = group.edges[0];
    const len = reference.schematic.length;
    if (!group.edges.every((e) => e.schematic.length === len)) continue;

    const centerline: LngLat[] = [];
    for (let i = 0; i < len; i++) {
      let lon = 0;
      let lat = 0;
      for (const edge of group.edges) {
        // align by direction so a backwards member still averages correctly
        const idx = edge.from_stop_id === group.from_stop_id ? i : len - 1 - i;
        lon += edge.schematic[idx][0];
        lat += edge.schematic[idx][1];
      }
      centerline.push([lon / group.edges.length, lat / group.edges.length]);
    }

    for (const edge of group.edges) {
      const aligned =
        edge.from_stop_id === group.from_stop_id
          ? centerline
          : [...centerline].reverse();
      edge.schematic = aligned.map((c) => [c[0], c[1]]);
    }
  }
}

function buildWalkEdges(): RenderedEdge[] {
  return walkSegments.map((walk) => ({
    edge_id: walk.walk_id,
    pattern_id: walk.walk_id,
    route_id: "WALK",
    from_stop_id: walk.from_stop_id,
    to_stop_id: walk.to_stop_id,
    geo: walk.geo,
    // schematic endpoints are patched to the stops' canonical schematic
    // positions once those are known (see patchWalkSchematic)
    schematic: walk.geo,
    anchors: walk.geo.map((_, i) => i),
    offset: 0,
    width: 0.6,
    color: WALK_COLOR,
    mode: "walk",
    dashArray: [0.1, 1.6],
  }));
}

// ── build ──────────────────────────────────────────────────────────────────

const transitEdges = buildTransitEdges();
export const edgeGroups = buildEdgeGroups(transitEdges);
// Blue/Orange share a corridor → collapse onto one centerline so they're
// collinear (then the bundler fans them into lanes). Red is a separate corridor
// but its schematic is already authored collinear with the trunk.
collapseToCenterlines(edgeGroups);
// Alignment bundling (apply2DOffsets port): assign per-end lane indices across
// ALL routes, so collinear ends — Red + Orange + Blue into Metro Center — bundle.
computeLaneOffsets(transitEdges);

const walkEdges = buildWalkEdges();
export const renderedEdges: RenderedEdge[] = [...transitEdges, ...walkEdges];

// ── per-stop layout (canonical schematic + geo + role) ───────────────────────

export type StopRole = "terminal" | "hub" | "stop";

export type StopLayout = {
  stop_id: string;
  stop_name: string;
  geo: LngLat;
  schematic: LngLat;
  role: StopRole;
  routeCount: number;
  /** number of parallel lanes through this stop (pill sizing) */
  laneSpan: number;
  /** orientation (radians) of the lines through a hub, for pill rotation */
  angle: number;
};

function endpointSchematic(edge: RenderedEdge, stopId: string): LngLat {
  return edge.from_stop_id === stopId
    ? edge.schematic[0]
    : edge.schematic[edge.schematic.length - 1];
}

function direction(edge: RenderedEdge, stopId: string): LngLat {
  // unit-ish direction of the schematic line leaving this stop
  const n = edge.schematic.length;
  const [a, b] =
    edge.from_stop_id === stopId
      ? [edge.schematic[0], edge.schematic[Math.min(1, n - 1)]]
      : [edge.schematic[n - 1], edge.schematic[Math.max(0, n - 2)]];
  return [b[0] - a[0], b[1] - a[1]];
}

function buildStopLayout(): Map<string, StopLayout> {
  const incident = new Map<string, RenderedEdge[]>();
  const corridorsForStop = new Map<string, Set<string>>();
  const routesForStop = new Map<string, Set<string>>();

  for (const edge of transitEdges) {
    for (const stopId of [edge.from_stop_id, edge.to_stop_id]) {
      if (!incident.has(stopId)) incident.set(stopId, []);
      incident.get(stopId)!.push(edge);
      if (!corridorsForStop.has(stopId)) corridorsForStop.set(stopId, new Set());
      corridorsForStop
        .get(stopId)!
        .add([edge.from_stop_id, edge.to_stop_id].sort().join("__"));
      if (!routesForStop.has(stopId)) routesForStop.set(stopId, new Set());
      routesForStop.get(stopId)!.add(edge.route_id);
    }
  }

  const layout = new Map<string, StopLayout>();
  for (const stop of transitiveData.stops) {
    const edges = incident.get(stop.stop_id) ?? [];
    const geo: LngLat = [stop.stop_lon, stop.stop_lat];

    // canonical schematic position = mean of the (centerline) endpoints of every
    // line that touches this stop
    let schematic: LngLat = geo;
    if (edges.length > 0) {
      let lon = 0;
      let lat = 0;
      for (const edge of edges) {
        const p = endpointSchematic(edge, stop.stop_id);
        lon += p[0];
        lat += p[1];
      }
      schematic = [lon / edges.length, lat / edges.length];
    }

    const corridorDegree = corridorsForStop.get(stop.stop_id)?.size ?? 0;
    const routeCount = routesForStop.get(stop.stop_id)?.size ?? 0;

    // lane span (for pill sizing) + the direction of the widest corridor, so the
    // pill's long axis lies across the lanes it spans (a vertical pill across a
    // horizontal trunk, like the source's Metro Center).
    let laneSpan = 1;
    let spanDir: LngLat | null = null;
    for (const edge of edges) {
      const group = edgeGroups.find(
        (g) =>
          g.key === [edge.from_stop_id, edge.to_stop_id].sort().join("__"),
      );
      const lanes = group?.edges.length ?? 1;
      if (lanes > laneSpan) {
        laneSpan = lanes;
        spanDir = direction(edge, stop.stop_id);
      }
    }
    if (!spanDir && edges.length > 0) spanDir = direction(edges[0], stop.stop_id);
    const angle = spanDir ? Math.atan2(spanDir[1], spanDir[0]) : 0;

    const role: StopRole =
      corridorDegree >= 2 ? "hub" : corridorDegree === 1 ? "terminal" : "stop";

    // a transfer hub's pill must span every route passing through it, including
    // ones that run in their own offset lane (e.g. Red over the Orange/Blue trunk
    // at Metro Center), so size by route count, not just the widest corridor.
    if (role === "hub") laneSpan = Math.max(laneSpan, routeCount);

    layout.set(stop.stop_id, {
      stop_id: stop.stop_id,
      stop_name: stop.stop_name,
      geo,
      schematic,
      role,
      routeCount,
      laneSpan,
      angle,
    });
  }

  return layout;
}

export const stopLayout = buildStopLayout();

/** Patch walk-edge schematic endpoints onto the stops' canonical positions. */
function patchWalkSchematic(): void {
  for (const edge of walkEdges) {
    const from = stopLayout.get(edge.from_stop_id);
    const to = stopLayout.get(edge.to_stop_id);
    if (!from || !to) continue;
    edge.schematic = [from.schematic, to.schematic];
    edge.geo = [from.geo, to.geo];
    edge.anchors = [0, 1];
  }
}
patchWalkSchematic();

// ── places ───────────────────────────────────────────────────────────────────

export type PlaceLayout = { place_id: string; geo: LngLat; schematic: LngLat };

function buildPlaceLayout(): Map<string, PlaceLayout> {
  const layout = new Map<string, PlaceLayout>();
  for (const place of transitiveData.places) {
    const geo: LngLat = [place.place_lon, place.place_lat];
    // anchor the place to its nearest stop, carrying the same schematic→geo
    // displacement so it travels with that stop during the morph
    let nearest: StopLayout | undefined;
    let best = Infinity;
    for (const s of stopLayout.values()) {
      const d = Math.hypot(s.geo[0] - geo[0], s.geo[1] - geo[1]);
      if (d < best) {
        best = d;
        nearest = s;
      }
    }
    // COLLAPSE: at the schematic (progress 0) the place sits exactly on its
    // anchor stop — like the source merging nearby points into one — so the
    // walk is zero-length and hidden. It morphs out to its true geographic
    // offset as progress → 1, where the walk distance becomes realistic.
    const schematic: LngLat = nearest ? [nearest.schematic[0], nearest.schematic[1]] : geo;
    layout.set(place.place_id, { place_id: place.place_id, geo, schematic });
  }
  return layout;
}

export const placeLayout = buildPlaceLayout();

// ── place → stop walk connectors ──────────────────────────────────────────────
// The source draws a dashed walk from each origin/destination place to its
// boarding stop. Derive them from the journey WALK segments that touch a place.

export function placeWalkId(placeId: string, stopId: string): string {
  return `walk-${placeId}-${stopId}`;
}

function buildPlaceWalks(): RenderedEdge[] {
  const seen = new Set<string>();
  const walks: RenderedEdge[] = [];
  for (const journey of transitiveData.journeys) {
    for (const seg of journey.segments) {
      if (seg.type !== "WALK") continue;
      const place =
        seg.from.type === "PLACE"
          ? seg.from
          : seg.to.type === "PLACE"
            ? seg.to
            : null;
      const stop =
        seg.from.type === "STOP"
          ? seg.from
          : seg.to.type === "STOP"
            ? seg.to
            : null;
      if (!place || !stop) continue;
      const id = placeWalkId(place.place_id, stop.stop_id);
      if (seen.has(id)) continue;
      seen.add(id);
      const pl = placeLayout.get(place.place_id);
      const st = stopLayout.get(stop.stop_id);
      if (!pl || !st) continue;
      walks.push({
        edge_id: id,
        pattern_id: id,
        route_id: "WALK",
        from_stop_id: stop.stop_id,
        to_stop_id: stop.stop_id,
        geo: [pl.geo, st.geo],
        schematic: [pl.schematic, st.schematic],
        anchors: [0, 1],
        offset: 0,
        width: 0.6,
        color: WALK_COLOR,
        mode: "walk",
        dashArray: [0.1, 1.6],
        placeWalk: true,
      });
    }
  }
  return walks;
}

renderedEdges.push(...buildPlaceWalks());

// ── intermediate station dots ────────────────────────────────────────────────
// Small dots strung along each corridor between the named stops, like the
// evenly-spaced station ticks in the source. Taken once per corridor (so the
// Blue/Orange bundle isn't double-dotted) from the centerline interior points.

export type DotVertex = { schematic: LngLat; geo: LngLat };

function buildDotVertices(): DotVertex[] {
  const dots: DotVertex[] = [];
  for (const group of edgeGroups) {
    const edge = group.edges[0];
    const n = Math.min(edge.schematic.length, edge.geo.length);
    for (let i = 1; i < n - 1; i++) {
      dots.push({ schematic: edge.schematic[i], geo: edge.geo[i] });
    }
  }
  return dots;
}

export const dotVertices = buildDotVertices();

// ── morphing ──────────────────────────────────────────────────────────────────

/** Linear morph between an edge's schematic (0) and geo (1) geometry. */
export function interpolateEdge(
  edge: RenderedEdge,
  progress: number,
): LngLat[] {
  return edge.geo.map((point, index) => {
    const schematic = edge.schematic[index] ?? point;
    return [
      schematic[0] + (point[0] - schematic[0]) * progress,
      schematic[1] + (point[1] - schematic[1]) * progress,
    ];
  });
}

/** Morphed lng/lat of a stop marker at the given progress. */
export function stopPosition(stop: StopLayout, progress: number): LngLat {
  return lerpLngLat(stop.schematic, stop.geo, progress);
}

/** Morphed lng/lat of a place marker at the given progress. */
export function placePosition(place: PlaceLayout, progress: number): LngLat {
  return lerpLngLat(place.schematic, place.geo, progress);
}

/** Morphed lng/lat of an intermediate station dot at the given progress. */
export function dotPosition(dot: DotVertex, progress: number): LngLat {
  return lerpLngLat(dot.schematic, dot.geo, progress);
}

// ── rounded corners ───────────────────────────────────────────────────────────
// transitive.js renders each elbow as a large smooth arc (its `cornerRadius`),
// which is what gives the schematic its signature look. MapLibre's line-join only
// rounds by half the stroke width, so we fillet the polyline ourselves: at each
// bend, cut back `radius` metres along both segments and sweep a quadratic arc
// between the cut points. Worked in metres (lng scaled by cos lat) so corners read
// as circular on screen rather than squashed.

const CORNER_RADIUS_M = 230;
const CORNER_SAMPLES = 8;

function metresBetween(a: LngLat, b: LngLat): number {
  const lat = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  const dx = (b[0] - a[0]) * 111320 * Math.cos(lat);
  const dy = (b[1] - a[1]) * 111320;
  return Math.hypot(dx, dy);
}

function stepToward(from: LngLat, to: LngLat, dMetres: number): LngLat {
  const len = metresBetween(from, to);
  if (len === 0) return [from[0], from[1]];
  const f = dMetres / len;
  return [from[0] + (to[0] - from[0]) * f, from[1] + (to[1] - from[1]) * f];
}

function quad(p0: LngLat, p1: LngLat, p2: LngLat, t: number): LngLat {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
  ];
}

export function roundCorners(coords: LngLat[], radiusMetres: number): LngLat[] {
  if (radiusMetres <= 0 || coords.length < 3) return coords;
  const out: LngLat[] = [coords[0]];
  for (let i = 1; i < coords.length - 1; i++) {
    const a = coords[i - 1];
    const v = coords[i];
    const b = coords[i + 1];
    const lenA = metresBetween(a, v);
    const lenB = metresBetween(v, b);
    // skip near-collinear points — no visible corner to round
    if (lenA === 0 || lenB === 0) {
      out.push(v);
      continue;
    }
    const ux = (v[0] - a[0]) / lenA;
    const uy = (v[1] - a[1]) / lenA;
    const wx = (b[0] - v[0]) / lenB;
    const wy = (b[1] - v[1]) / lenB;
    if (ux * wx + uy * wy > 0.999) {
      out.push(v);
      continue;
    }
    const d = Math.min(radiusMetres, lenA / 2, lenB / 2);
    const p1 = stepToward(v, a, d);
    const p2 = stepToward(v, b, d);
    out.push(p1);
    for (let s = 1; s < CORNER_SAMPLES; s++) {
      out.push(quad(p1, v, p2, s / CORNER_SAMPLES));
    }
    out.push(p2);
  }
  out.push(coords[coords.length - 1]);
  return out;
}

export { CORNER_RADIUS_M };
