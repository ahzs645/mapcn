/**
 * Schematic graph core — a focused port of transitive.js's
 * `lib/graph/{vertex,edge,graph}.js`.
 *
 * Everything runs in EPSG:3857 world metres (y-up). The angle-constraint /
 * elbow math is lifted verbatim from the original `Edge.calculateGeometry` and
 * `Edge.getRenderCoords`; the original computed render coords in screen space
 * (y-down), so we feed vertex positions as `(x, -y)` and un-flip y when we read
 * the result back out (see `Edge.getSchematicCoords`). Offsets for parallel
 * lines are NOT baked here — they are applied at render time via MapLibre
 * `line-offset`, so `getRenderCoords` is only ever called with zero offset.
 */

import {
  ccw,
  distance,
  getElbowAngleFromVectors,
  getRadiusFromAngleChord,
  getVectorAngle,
  normalizeVector,
  pointAlongArc,
  rayIntersection,
  type Vec,
} from "./geometry";
import type { WorldXY } from "./projection";

export type PointType = "STOP" | "MULTI" | "PLACE";

export type EnginePoint = {
  id: string;
  type: PointType;
  /** Fixed geographic position (projected), drives angle constraints. */
  worldX: number;
  worldY: number;
  /** Member stop ids (one for STOP, many for MULTI). */
  memberStopIds: string[];
  stopName: string;
  isSegmentEndPoint: boolean;
  graphVertex?: Vertex;
};

let vertexId = 0;
let edgeId = 0;

export class Vertex {
  id: number;
  point: EnginePoint;
  /** Layout position (snapped/merged); starts at the point's world position. */
  x: number;
  y: number;
  edges: Edge[] = [];

  constructor(point: EnginePoint, x: number, y: number) {
    this.id = vertexId++;
    this.point = point;
    this.point.graphVertex = this;
    this.x = x;
    this.y = y;
  }

  addEdge(edge: Edge) {
    if (this.edges.indexOf(edge) === -1) this.edges.push(edge);
  }

  removeEdge(edge: Edge) {
    const i = this.edges.indexOf(edge);
    if (i !== -1) this.edges.splice(i, 1);
  }
}

const TOL = 0.01;

function equalVectors(x1: number, y1: number, x2: number, y2: number, tol = 0) {
  return Math.abs(x1 - x2) < tol && Math.abs(y1 - y2) < tol;
}

export class Edge {
  id: number;
  fromVertex: Vertex;
  toVertex: Vertex;
  /** Geographic shape (projected world coords) between the two endpoints. */
  geomCoords: WorldXY[];

  // computed by calculateGeometry
  fromAngle = 0;
  toAngle = 0;
  fromVector: Vec = { x: 0, y: 0 };
  toVector: Vec = { x: 0, y: 0 };

  constructor(fromVertex: Vertex, toVertex: Vertex, geomCoords: WorldXY[]) {
    this.id = edgeId++;
    this.fromVertex = fromVertex;
    this.toVertex = toVertex;
    this.geomCoords = geomCoords;
  }

  oppositeVertex(v: Vertex): Vertex | null {
    if (v === this.toVertex) return this.fromVertex;
    if (v === this.fromVertex) return this.toVertex;
    return null;
  }

  /** Midpoint of the geographic shape (world coords). */
  private worldMidpoint(): WorldXY {
    const coords = this.geomCoords;
    if (!coords || coords.length < 2) {
      return {
        x: (this.fromVertex.point.worldX + this.toVertex.point.worldX) / 2,
        y: (this.fromVertex.point.worldY + this.toVertex.point.worldY) / 2,
      };
    }
    let total = 0;
    for (let i = 1; i < coords.length; i++) {
      total += distance(coords[i - 1].x, coords[i - 1].y, coords[i].x, coords[i].y);
    }
    if (total === 0) return coords[0];
    let acc = 0;
    for (let i = 1; i < coords.length; i++) {
      const d = distance(coords[i - 1].x, coords[i - 1].y, coords[i].x, coords[i].y);
      if ((acc + d) / total >= 0.5) {
        const t = (0.5 - acc / total) / (d / total);
        return {
          x: coords[i - 1].x + t * (coords[i].x - coords[i - 1].x),
          y: coords[i - 1].y + t * (coords[i].y - coords[i - 1].y),
        };
      }
      acc += d;
    }
    return coords[coords.length - 1];
  }

  /**
   * Port of `Edge.calculateGeometry` — constrain the from/to angles to multiples
   * of `angleConstraint` (degrees) and, when the straight constrained rays don't
   * line up, rotate one endpoint angle until they intersect (adjustFrom/ToAngle).
   */
  calculateGeometry(angleConstraint: number) {
    const acR = (angleConstraint * Math.PI) / 180;

    const fx = this.fromVertex.point.worldX;
    const fy = this.fromVertex.point.worldY;
    const tx = this.toVertex.point.worldX;
    const ty = this.toVertex.point.worldY;
    const mid = this.worldMidpoint();

    const targetFromAngle = getVectorAngle(mid.x - fx, mid.y - fy);
    let constrainedFromAngle = Math.round(targetFromAngle / acR) * acR;
    const fromAngleDelta = Math.abs(constrainedFromAngle - targetFromAngle);
    let fvx = Math.cos(constrainedFromAngle);
    let fvy = Math.sin(constrainedFromAngle);

    const targetToAngle = getVectorAngle(mid.x - tx, mid.y - ty);
    let constrainedToAngle = Math.round(targetToAngle / acR) * acR;
    const toAngleDelta = Math.abs(constrainedToAngle - targetToAngle);
    let tvx = Math.cos(constrainedToAngle);
    let tvy = Math.sin(constrainedToAngle);

    const v = normalizeVector({
      x: this.toVertex.x - this.fromVertex.x,
      y: this.toVertex.y - this.fromVertex.y,
    });

    if (
      !equalVectors(fvx, fvy, -tvx, -tvy, TOL) ||
      !equalVectors(fvx, fvy, v.x, v.y, TOL)
    ) {
      const isect = rayIntersection(fx, fy, fvx, fvy, tx, ty, tvx, tvy);
      if (!isect.intersect) {
        // rotate one endpoint angle in acR increments until the rays meet
        if (Math.abs(fromAngleDelta - toAngleDelta) > 0.087) {
          if (fromAngleDelta < toAngleDelta) {
            constrainedToAngle = this.rotateUntilIntersect(
              fx, fy, fvx, fvy, tx, ty, constrainedToAngle, acR, false,
            );
            tvx = Math.cos(constrainedToAngle);
            tvy = Math.sin(constrainedToAngle);
          } else {
            constrainedFromAngle = this.rotateUntilIntersect(
              tx, ty, tvx, tvy, fx, fy, constrainedFromAngle, acR, true,
            );
            fvx = Math.cos(constrainedFromAngle);
            fvy = Math.sin(constrainedFromAngle);
          }
        } else {
          // symmetric fallback: nudge the 'to' angle
          constrainedToAngle = this.rotateUntilIntersect(
            fx, fy, fvx, fvy, tx, ty, constrainedToAngle, acR, false,
          );
          tvx = Math.cos(constrainedToAngle);
          tvy = Math.sin(constrainedToAngle);
        }
      }
    }

    this.fromAngle = constrainedFromAngle;
    this.toAngle = constrainedToAngle;
    this.calculateVectors();
  }

  /** Port of adjustFrom/ToAngle's rotate-until-intersection loop. */
  private rotateUntilIntersect(
    ax: number, ay: number, avx: number, avy: number,
    bx: number, by: number,
    startAngle: number, acR: number, adjustingFrom: boolean,
  ): number {
    const isCcw = ccw(ax, ay, ax + avx, ay + avy, bx, by);
    const delta = isCcw > 0 ? acR : -acR;
    let angle = startAngle;
    let i = 0;
    while (i++ < 100) {
      angle += delta;
      const bvx = Math.cos(angle);
      const bvy = Math.sin(angle);
      const isect = adjustingFrom
        ? rayIntersection(bx, by, bvx, bvy, ax, ay, avx, avy)
        : rayIntersection(ax, ay, avx, avy, bx, by, bvx, bvy);
      if (isect.intersect) break;
    }
    return angle;
  }

  private calculateVectors() {
    this.fromVector = { x: Math.cos(this.fromAngle), y: Math.sin(this.fromAngle) };
    this.toVector = {
      x: Math.cos(this.toAngle + Math.PI),
      y: Math.sin(this.toAngle + Math.PI),
    };
  }

  private isStraight(): boolean {
    const tol = 0.00001;
    return (
      Math.abs(this.fromVector.x - this.toVector.x) < tol &&
      Math.abs(this.fromVector.y - this.toVector.y) < tol
    );
  }

  /**
   * Port of `Edge.getRenderCoords` (forward, zero offset) → returns a sampled
   * world-coord polyline. Computed in screen space (y-down) exactly like the
   * original, then un-flipped to world (y-up) on the way out.
   *
   * @param cornerRadius elbow radius in world units (0 = sharp corner)
   * @param arcSamples points used to approximate a rounded corner
   */
  getSchematicCoords(cornerRadius: number, arcSamples: number): WorldXY[] {
    // screen-space endpoints: ry = -worldY (1:1 scale, so geometry is preserved)
    const fx = this.fromVertex.x;
    const fy = -this.fromVertex.y;
    const tx = this.toVertex.x;
    const ty = -this.toVertex.y;

    const fvx = this.fromVector.x;
    const fvy = -this.fromVector.y;
    const tvx = -this.toVector.x;
    const tvy = this.toVector.y;

    const screen: WorldXY[] = [{ x: fx, y: fy }];

    if (!this.isStraight() && cornerRadius > 0) {
      const isect = rayIntersection(fx, fy, fvx, fvy, tx, ty, tvx, tvy);
      if (isect.intersect) {
        const u = isect.u;
        const ex = fx + fvx * u;
        const ey = fy + fvy * u;
        const edgeCcw = ccw(fx, fy, ex, ey, tx, ty);
        const angleR = getElbowAngleFromVectors(this.fromVector, this.toVector);
        let d = cornerRadius * Math.tan(angleR / 2);
        const l1 = distance(fx, fy, ex, ey);
        const l2 = distance(tx, ty, ex, ey);
        d = Math.min(Math.min(l1, l2), d);

        const x1 = ex - this.fromVector.x * d;
        const y1 = ey + this.fromVector.y * d;
        const x2 = ex + this.toVector.x * d;
        const y2 = ey - this.toVector.y * d;

        const chord = distance(x1, y1, x2, y2);
        const radius = getRadiusFromAngleChord(angleR, chord);

        if (d <= 1e-6 || !isFinite(radius) || chord <= 1e-6) {
          // degenerate -> sharp corner at the elbow
          screen.push({ x: ex, y: ey });
        } else {
          const arcDeg = angleR * (180 / Math.PI) * (edgeCcw < 0 ? 1 : -1);
          const theta = (Math.PI * arcDeg) / 180;
          const isCcwArc = ccw(fx, fy, x1, y1, x2, y2);
          screen.push({ x: x1, y: y1 });
          for (let k = 1; k < arcSamples; k++) {
            screen.push(
              pointAlongArc(x1, y1, x2, y2, radius, theta, isCcwArc, k / arcSamples),
            );
          }
          screen.push({ x: x2, y: y2 });
        }
      }
    }

    screen.push({ x: tx, y: ty });

    // un-flip y back to world space
    return screen.map((p) => ({ x: p.x, y: -p.y }));
  }
}

export class Graph {
  vertices: Vertex[] = [];
  edges: Edge[] = [];

  constructor(points: EnginePoint[]) {
    for (const p of points) this.addVertex(p, p.worldX, p.worldY);
  }

  addVertex(point: EnginePoint, x: number, y: number): Vertex {
    const v = new Vertex(point, x, y);
    this.vertices.push(v);
    return v;
  }

  /** Find an existing edge between the two vertices (either direction). */
  getEquivalentEdge(from: Vertex, to: Vertex): Edge | undefined {
    return this.edges.find(
      (e) =>
        (e.fromVertex === from && e.toVertex === to) ||
        (e.fromVertex === to && e.toVertex === from),
    );
  }

  addEdge(from: Vertex, to: Vertex, geomCoords: WorldXY[]): Edge {
    const edge = new Edge(from, to, geomCoords);
    this.edges.push(edge);
    from.addEdge(edge);
    to.addEdge(edge);
    return edge;
  }

  /**
   * Merge a set of vertices into a single MULTI vertex at their centroid.
   * Port of the relevant branch of `Graph.mergeVertices` — won't merge places.
   */
  mergeVertices(vertexArray: Vertex[]) {
    const places = vertexArray.filter((v) => v.point.type === "PLACE");
    if (places.length > 0) return;

    const members: string[] = [];
    let names = "";
    for (const v of vertexArray) members.push(...v.point.memberStopIds);
    names = vertexArray[0].point.stopName;

    let xTotal = 0;
    let yTotal = 0;
    let wxTotal = 0;
    let wyTotal = 0;
    for (const v of vertexArray) {
      xTotal += v.x;
      yTotal += v.y;
      wxTotal += v.point.worldX;
      wyTotal += v.point.worldY;
    }
    const n = vertexArray.length;

    const mergePoint: EnginePoint = {
      id: `multi:${members.join("+")}`,
      type: "MULTI",
      worldX: wxTotal / n,
      worldY: wyTotal / n,
      memberStopIds: members,
      stopName: names,
      isSegmentEndPoint: vertexArray.some((v) => v.point.isSegmentEndPoint),
    };
    const merged = new Vertex(mergePoint, xTotal / n, yTotal / n);

    for (const v of vertexArray) {
      for (const edge of v.edges.slice()) {
        if (
          vertexArray.indexOf(edge.fromVertex) !== -1 &&
          vertexArray.indexOf(edge.toVertex) !== -1
        ) {
          // internal edge collapses away
          this.removeEdge(edge);
          continue;
        }
        if (edge.fromVertex === v) edge.fromVertex = merged;
        if (edge.toVertex === v) edge.toVertex = merged;
        merged.addEdge(edge);
      }
      const idx = this.vertices.indexOf(v);
      if (idx !== -1) this.vertices.splice(idx, 1);
    }

    this.vertices.push(merged);
  }

  removeEdge(edge: Edge) {
    const i = this.edges.indexOf(edge);
    if (i !== -1) this.edges.splice(i, 1);
    edge.fromVertex.removeEdge(edge);
    edge.toVertex.removeEdge(edge);
  }

  /** Port of `Graph.snapToGrid` — round to grid, then merge coincident. */
  snapToGrid(cellSize: number) {
    if (!cellSize || cellSize <= 0) return;
    const coincidence = new Map<string, Vertex[]>();
    for (const v of this.vertices) {
      v.x = Math.round(v.x / cellSize) * cellSize;
      v.y = Math.round(v.y / cellSize) * cellSize;
      const key = `${v.x}_${v.y}`;
      const arr = coincidence.get(key);
      if (arr) arr.push(v);
      else coincidence.set(key, [v]);
    }
    for (const arr of coincidence.values()) {
      if (arr.length > 1) this.mergeVertices(arr);
    }
  }

  calculateGeometry(angleConstraint: number) {
    for (const edge of this.edges) edge.calculateGeometry(angleConstraint);
  }
}
