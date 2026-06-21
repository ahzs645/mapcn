/**
 * Network builder — the engine entry point.
 *
 * Adapts the relevant parts of transitive.js's `core/network.js`:
 *  - project stops to world space,
 *  - merge nearby stops into MULTI hubs (the original's `PointClusterMap` /
 *    `mergeVertexThreshold`),
 *  - build graph edges from patterns so PARALLEL routes share one graph edge
 *    (`getEquivalentEdge`) and shared stops (e.g. Metro Center) are a single
 *    convergence vertex that every line touches,
 *  - snap + run the angle-constrained geometry,
 *  - emit a render-ready layout (lng/lat) where lines AND vertices come from the
 *    same coordinate space, so they can never detach.
 *
 * Lane separation for parallel lines is returned as a lane index and applied at
 * render time via MapLibre `line-offset` (px), not baked into the geometry.
 */

import {
  patternGeometry,
  transitiveData,
  walkSegments,
} from "../data";
import type { LngLat } from "../types";

import { Graph, type EnginePoint, type Vertex } from "./graph";
import { distance } from "./geometry";
import { forward, inverse, type WorldXY } from "./projection";
import type { ZoomFactor } from "./zoom-factors";

const WALK_COLOR = "#59d5ea";

export type LayoutVertex = {
  id: string;
  type: "STOP" | "MULTI" | "PLACE";
  lngLat: LngLat;
  memberStopIds: string[];
  stopName: string;
  routeCount: number;
  isTransfer: boolean;
};

export type LayoutEdge = {
  id: string;
  patternId: string;
  routeId: string;
  mode: "transit" | "walk";
  color: string;
  /** base width multiplier (rail vs bus) */
  width: number;
  coords: LngLat[];
  /** lane index, e.g. -0.5 / +0.5 — multiplied by (lineWidth + gap) at render */
  laneOffset: number;
  fromStopId: string;
  toStopId: string;
  dashArray?: [number, number];
};

export type TransitiveLayout = {
  partition: number;
  geographic: boolean;
  edges: LayoutEdge[];
  vertices: LayoutVertex[];
};

const ARC_SAMPLES = 12;

const routeById = new Map(transitiveData.routes.map((r) => [r.route_id, r]));
const stopById = new Map(transitiveData.stops.map((s) => [s.stop_id, s]));

function widthForRouteType(routeType: number): number {
  return routeType === 1 ? 1 : 0.7;
}

/** Project the geo[] shape between two consecutive stops of a pattern. */
function patternEdgeGeom(
  patternId: string,
  fromIndex: number,
  toIndex: number,
): WorldXY[] {
  const geom = patternGeometry[patternId];
  const a = geom.anchors[fromIndex];
  const b = geom.anchors[toIndex];
  return geom.geo.slice(a, b + 1).map((c) => forward(c));
}

/** A rendered line that references a shared graph edge. */
type RenderedEdge = {
  graphEdge: ReturnType<Graph["addEdge"]>;
  patternId: string;
  routeId: string;
  mode: "transit" | "walk";
  color: string;
  width: number;
  fromStopId: string;
  toStopId: string;
  dashArray?: [number, number];
  laneOffset: number;
};

class UnionFind {
  private parent: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  find(i: number): number {
    if (this.parent[i] !== i) this.parent[i] = this.find(this.parent[i]);
    return this.parent[i];
  }
  union(i: number, j: number) {
    this.parent[this.find(i)] = this.find(j);
  }
}

/** Merge stops within `threshold` (world m) into MULTI EnginePoints. */
function buildPoints(threshold: number): {
  points: EnginePoint[];
  pointByStopId: Map<string, EnginePoint>;
} {
  const stops = transitiveData.stops;
  const world = stops.map((s) => forward([s.stop_lon, s.stop_lat]));

  const uf = new UnionFind(stops.length);
  if (threshold > 0) {
    for (let i = 0; i < stops.length; i++) {
      for (let j = i + 1; j < stops.length; j++) {
        if (distance(world[i].x, world[i].y, world[j].x, world[j].y) < threshold) {
          uf.union(i, j);
        }
      }
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < stops.length; i++) {
    const root = uf.find(i);
    const arr = groups.get(root);
    if (arr) arr.push(i);
    else groups.set(root, [i]);
  }

  const points: EnginePoint[] = [];
  const pointByStopId = new Map<string, EnginePoint>();
  for (const indices of groups.values()) {
    const members = indices.map((i) => stops[i]);
    const wx = indices.reduce((s, i) => s + world[i].x, 0) / indices.length;
    const wy = indices.reduce((s, i) => s + world[i].y, 0) / indices.length;
    const point: EnginePoint = {
      id: members.length > 1 ? `multi:${members.map((m) => m.stop_id).join("+")}` : members[0].stop_id,
      type: members.length > 1 ? "MULTI" : "STOP",
      worldX: wx,
      worldY: wy,
      memberStopIds: members.map((m) => m.stop_id),
      stopName: members[0].stop_name,
      isSegmentEndPoint: true,
    };
    points.push(point);
    for (const m of members) pointByStopId.set(m.stop_id, point);
  }
  return { points, pointByStopId };
}

/** Assign symmetric lane indices to rendered edges that share a graph edge. */
function assignLanes(rendered: RenderedEdge[]) {
  const byGraphEdge = new Map<number, RenderedEdge[]>();
  for (const r of rendered) {
    const arr = byGraphEdge.get(r.graphEdge.id);
    if (arr) arr.push(r);
    else byGraphEdge.set(r.graphEdge.id, [r]);
  }
  for (const group of byGraphEdge.values()) {
    if (group.length === 1) {
      group[0].laneOffset = 0;
      continue;
    }
    // stable order: rail before bus, then by routeId
    group.sort((a, b) => {
      const ra = routeById.get(a.routeId);
      const rb = routeById.get(b.routeId);
      const ta = ra?.route_type ?? 99;
      const tb = rb?.route_type ?? 99;
      if (ta !== tb) return ta - tb;
      return a.routeId < b.routeId ? -1 : 1;
    });
    const n = group.length;
    group.forEach((r, i) => {
      r.laneOffset = i - (n - 1) / 2;
    });
  }
}

function worldPolylineToLngLat(coords: WorldXY[]): LngLat[] {
  return coords.map((c) => inverse(c));
}

export function buildLayout(
  partition: number,
  factor: ZoomFactor,
): TransitiveLayout {
  const { points, pointByStopId } = buildPoints(factor.mergeThreshold);
  const graph = new Graph(points);
  const rendered: RenderedEdge[] = [];

  const addRendered = (
    fromStopId: string,
    toStopId: string,
    geom: WorldXY[],
    meta: Omit<RenderedEdge, "graphEdge" | "laneOffset" | "fromStopId" | "toStopId">,
  ) => {
    const fromPoint = pointByStopId.get(fromStopId);
    const toPoint = pointByStopId.get(toStopId);
    if (!fromPoint?.graphVertex || !toPoint?.graphVertex) return;
    if (fromPoint.graphVertex === toPoint.graphVertex) return; // collapsed by merge
    let edge = graph.getEquivalentEdge(fromPoint.graphVertex, toPoint.graphVertex);
    if (!edge) {
      edge = graph.addEdge(fromPoint.graphVertex, toPoint.graphVertex, geom);
    }
    rendered.push({
      graphEdge: edge,
      fromStopId,
      toStopId,
      laneOffset: 0,
      ...meta,
    });
  };

  // transit edges, one per consecutive stop pair in each pattern
  for (const pattern of transitiveData.patterns) {
    const route = routeById.get(pattern.route_id);
    if (!route) continue;
    for (let i = 0; i < pattern.stops.length - 1; i++) {
      const fromStopId = pattern.stops[i].stop_id;
      const toStopId = pattern.stops[i + 1].stop_id;
      addRendered(fromStopId, toStopId, patternEdgeGeom(pattern.pattern_id, i, i + 1), {
        patternId: pattern.pattern_id,
        routeId: pattern.route_id,
        mode: "transit",
        color: route.route_color,
        width: widthForRouteType(route.route_type),
      });
    }
  }

  // walk edges
  for (const walk of walkSegments) {
    addRendered(
      walk.from_stop_id,
      walk.to_stop_id,
      walk.geo.map((c) => forward(c)),
      {
        patternId: walk.walk_id,
        routeId: "WALK",
        mode: "walk",
        color: WALK_COLOR,
        width: 0.6,
        dashArray: [0.1, 1.6],
      },
    );
  }

  graph.snapToGrid(factor.gridCellSize);
  graph.calculateGeometry(factor.angleConstraint);
  assignLanes(rendered);

  // route count per vertex (for hub/transfer detection)
  const routesByVertex = new Map<Vertex, Set<string>>();
  for (const r of rendered) {
    if (r.mode !== "transit") continue;
    for (const v of [r.graphEdge.fromVertex, r.graphEdge.toVertex]) {
      let set = routesByVertex.get(v);
      if (!set) routesByVertex.set(v, (set = new Set()));
      set.add(r.routeId);
    }
  }

  // emit edges
  const edges: LayoutEdge[] = rendered.map((r) => {
    const baseWorld = factor.geographic
      ? r.graphEdge.geomCoords
      : r.graphEdge.getSchematicCoords(factor.cornerRadius, ARC_SAMPLES);
    return {
      id: `${r.graphEdge.id}:${r.patternId}`,
      patternId: r.patternId,
      routeId: r.routeId,
      mode: r.mode,
      color: r.color,
      width: r.width,
      coords: worldPolylineToLngLat(baseWorld),
      laneOffset: r.laneOffset,
      fromStopId: r.fromStopId,
      toStopId: r.toStopId,
      dashArray: r.dashArray,
    };
  });

  // emit vertices (markers) at the same positions the edges use
  const vertices: LayoutVertex[] = graph.vertices.map((v) => {
    const routeCount = routesByVertex.get(v)?.size ?? 0;
    return {
      id: v.point.id,
      type: v.point.type,
      lngLat: inverse({ x: v.x, y: v.y }),
      memberStopIds: v.point.memberStopIds,
      stopName: representativeName(v),
      routeCount,
      isTransfer: routeCount >= 2 || v.point.type === "MULTI",
    };
  });

  return { partition, geographic: factor.geographic, edges, vertices };
}

/** Prefer the shortest member stop name as the cluster's display name. */
function representativeName(v: Vertex): string {
  if (v.point.memberStopIds.length <= 1) return v.point.stopName;
  return v.point.memberStopIds
    .map((id) => stopById.get(id)?.stop_name ?? "")
    .reduce((a, b) => (b && b.length < a.length ? b : a));
}
