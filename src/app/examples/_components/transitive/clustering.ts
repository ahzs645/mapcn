import { transitiveData } from "./data";
import {
  clamp01,
  haversineMeters,
  metersPerPixel,
  pixels,
} from "./styler";
import type { LngLat, Stop } from "./types";

const MERGE_THRESHOLD_PX = 16;
const TRANSITION_BAND_PX = 8;
const PADDING_FACTOR = 6;

export type Cluster = {
  cluster_id: string;
  children: Stop[];
  centroid: LngLat;
  /** 0 = fully split (children render individually), 1 = fully merged. */
  mergeFactor: number;
  /** Bounding-box of the children in CSS pixels, centred on the centroid. */
  pixelBox: {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
    radius: number;
  };
};

export type StopVisibility = {
  /** Per-stop opacity for the individual marker (1 - merge factor). */
  individualOpacity: number;
  /** The cluster this stop belongs to, if it is currently being merged. */
  cluster: Cluster | null;
};

class UnionFind {
  parent: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  find(i: number): number {
    if (this.parent[i] !== i) this.parent[i] = this.find(this.parent[i]);
    return this.parent[i];
  }
  union(i: number, j: number): void {
    const ri = this.find(i);
    const rj = this.find(j);
    if (ri !== rj) this.parent[ri] = rj;
  }
}

function pairMergeFactor(distancePx: number): number {
  return clamp01(
    (MERGE_THRESHOLD_PX + TRANSITION_BAND_PX - distancePx) / TRANSITION_BAND_PX,
  );
}

function pixelOffsetFromCentroid(
  child: LngLat,
  centroid: LngLat,
  mpp: number,
): { dx: number; dy: number } {
  const dxMeters =
    (child[0] - centroid[0]) *
    111320 *
    Math.cos((centroid[1] * Math.PI) / 180);
  const dyMeters = (child[1] - centroid[1]) * 111320;
  return { dx: dxMeters / mpp, dy: -dyMeters / mpp };
}

function buildClusterFromGroup(
  members: Stop[],
  zoom: number,
  scale: number,
  index: number,
): Cluster {
  const centroid: LngLat = [
    members.reduce((sum, s) => sum + s.stop_lon, 0) / members.length,
    members.reduce((sum, s) => sum + s.stop_lat, 0) / members.length,
  ];
  const mpp = metersPerPixel(centroid[1], zoom);

  let minDx = Infinity;
  let maxDx = -Infinity;
  let minDy = Infinity;
  let maxDy = -Infinity;

  for (const stop of members) {
    const { dx, dy } = pixelOffsetFromCentroid(
      [stop.stop_lon, stop.stop_lat],
      centroid,
      mpp,
    );
    minDx = Math.min(minDx, dx);
    maxDx = Math.max(maxDx, dx);
    minDy = Math.min(minDy, dy);
    maxDy = Math.max(maxDy, dy);
  }

  const padding = pixels(scale, 4, PADDING_FACTOR, PADDING_FACTOR + 4);
  const width = Math.max(12, maxDx - minDx + padding * 2);
  const height = Math.max(12, maxDy - minDy + padding * 2);
  const radius = Math.min(width, height) / 2;

  let mergeFactor = 1;
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const distMeters = haversineMeters(
        [members[i].stop_lon, members[i].stop_lat],
        [members[j].stop_lon, members[j].stop_lat],
      );
      const distPx = distMeters / mpp;
      mergeFactor = Math.min(mergeFactor, pairMergeFactor(distPx));
    }
  }

  return {
    cluster_id: `cluster-${index}-${members.map((s) => s.stop_id).join("-")}`,
    children: members,
    centroid,
    mergeFactor,
    pixelBox: {
      width,
      height,
      offsetX: (minDx + maxDx) / 2,
      offsetY: (minDy + maxDy) / 2,
      radius,
    },
  };
}

/**
 * Mirror of transitive's `PointClusterMap` — finds nearby stops at the
 * current zoom and returns merged clusters plus per-stop visibility so
 * individual markers can crossfade with the merged rect.
 */
export function computeClusters(
  zoom: number,
  scale: number,
): {
  clusters: Cluster[];
  stopVisibility: Map<string, StopVisibility>;
} {
  const stops = transitiveData.stops;
  const uf = new UnionFind(stops.length);

  for (let i = 0; i < stops.length; i++) {
    for (let j = i + 1; j < stops.length; j++) {
      const a: LngLat = [stops[i].stop_lon, stops[i].stop_lat];
      const b: LngLat = [stops[j].stop_lon, stops[j].stop_lat];
      const midLat = (a[1] + b[1]) / 2;
      const distMeters = haversineMeters(a, b);
      const distPx = distMeters / metersPerPixel(midLat, zoom);
      if (distPx < MERGE_THRESHOLD_PX + TRANSITION_BAND_PX) {
        uf.union(i, j);
      }
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < stops.length; i++) {
    const root = uf.find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(i);
  }

  const clusters: Cluster[] = [];
  const stopVisibility = new Map<string, StopVisibility>();
  let clusterIndex = 0;

  for (const [, indices] of groups) {
    if (indices.length < 2) {
      const stop = stops[indices[0]];
      stopVisibility.set(stop.stop_id, {
        individualOpacity: 1,
        cluster: null,
      });
      continue;
    }
    const members = indices.map((i) => stops[i]);
    const cluster = buildClusterFromGroup(members, zoom, scale, clusterIndex++);
    clusters.push(cluster);
    for (const stop of members) {
      stopVisibility.set(stop.stop_id, {
        individualOpacity: 1 - cluster.mergeFactor,
        cluster,
      });
    }
  }

  return { clusters, stopVisibility };
}
