import { patternGeometry, transitiveData, walkSegments } from "./data";
import type { EdgeGroup, LngLat, RenderedEdge, Stop } from "./types";

/** Gap (px) between sibling lines on top of their stroke width. */
export const LANE_GAP_PX = 4;

const routeById = new Map(
  transitiveData.routes.map((route) => [route.route_id, route]),
);
const stopById = new Map<string, Stop>(
  transitiveData.stops.map((s) => [s.stop_id, s]),
);

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

function buildWalkEdges(): RenderedEdge[] {
  return walkSegments.map((walk) => ({
    edge_id: walk.walk_id,
    pattern_id: walk.walk_id,
    route_id: "WALK",
    from_stop_id: walk.from_stop_id,
    to_stop_id: walk.to_stop_id,
    geo: walk.geo,
    schematic: walk.geo,
    anchors: walk.geo.map((_, i) => i),
    offset: 0,
    width: 4,
    color: "#59d5ea",
    mode: "walk",
    dashArray: [0.1, 1.6],
  }));
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
 * Project each edge's schematic midpoint onto the perpendicular-to-direction
 * axis of the group. Edges further to the right of travel get more positive
 * offsets so the bundle order matches the spatial layout (otherwise an
 * alphabetical sort can flip neighbouring routes across the centerline).
 */
function perpendicularProjection(edge: RenderedEdge, group: EdgeGroup): number {
  const fromStop = stopById.get(group.from_stop_id);
  const toStop = stopById.get(group.to_stop_id);
  if (!fromStop || !toStop) return 0;

  const dLon = toStop.stop_lon - fromStop.stop_lon;
  const dLat = toStop.stop_lat - fromStop.stop_lat;

  // Right-of-direction perpendicular in geo coords (lat-up screen): (Δlat, -Δlon)
  const px = dLat;
  const py = -dLon;

  const mid = edge.schematic[Math.floor(edge.schematic.length / 2)];
  const relLon = mid[0] - fromStop.stop_lon;
  const relLat = mid[1] - fromStop.stop_lat;
  return relLon * px + relLat * py;
}

/**
 * Mirror of transitive's `Graph.apply2DOffsets` — within each edge group,
 * order the parallel pattern edges by their perpendicular position and lay
 * them out as lanes around the centerline. Direction is normalised so an
 * edge that traverses the group backwards still ends up on the correct side.
 */
function applyLaneOffsets(groups: EdgeGroup[]): void {
  for (const group of groups) {
    if (group.edges.length === 1) {
      group.edges[0].offset = 0;
      continue;
    }

    const sorted = [...group.edges].sort(
      (a, b) =>
        perpendicularProjection(a, group) - perpendicularProjection(b, group),
    );
    const n = sorted.length;

    // edge.offset stores a LANE INDEX (e.g. -0.5, +0.5 for n=2; -1, 0, +1 for
    // n=3) — actual pixel offset is computed in the line-offset expression
    // as `laneIndex * (lineWidth + LANE_GAP_PX)` so spacing scales with zoom.
    sorted.forEach((edge, i) => {
      const laneIndex = i - (n - 1) / 2;
      const sameDirection = edge.from_stop_id === group.from_stop_id;
      edge.offset = laneIndex * (sameDirection ? 1 : -1);
    });
  }
}

const transitEdges = buildTransitEdges();
const walkEdges = buildWalkEdges();
export const edgeGroups = buildEdgeGroups(transitEdges);
applyLaneOffsets(edgeGroups);

export const renderedEdges: RenderedEdge[] = [...transitEdges, ...walkEdges];

/**
 * A "hub" stop is one served by 2+ patterns from different route bundles —
 * the source treats these as MultiPoints and renders them as morphing
 * rectangles instead of plain circles. We surface the same set so markers
 * can swap their shape based on this membership.
 */
function computeHubStops(): Set<string> {
  const stopRoutes = new Map<string, Set<string>>();
  for (const pattern of transitiveData.patterns) {
    for (const { stop_id } of pattern.stops) {
      if (!stopRoutes.has(stop_id)) stopRoutes.set(stop_id, new Set());
      stopRoutes.get(stop_id)!.add(pattern.route_id);
    }
  }
  const hubs = new Set<string>();
  for (const [stopId, routes] of stopRoutes) {
    if (routes.size >= 2) hubs.add(stopId);
  }
  return hubs;
}

export const hubStopIds = computeHubStops();

/** Linear morph between schematic[i] and geo[i]. Anchor indices are pinned. */
export function interpolateEdge(
  edge: RenderedEdge,
  progress: number,
): LngLat[] {
  return edge.geo.map((point, index) => {
    if (edge.anchors.includes(index)) return point;
    const schematic = edge.schematic[index];
    return [
      schematic[0] + (point[0] - schematic[0]) * progress,
      schematic[1] + (point[1] - schematic[1]) * progress,
    ];
  });
}
