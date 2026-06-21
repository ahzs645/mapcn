/**
 * Public engine API: `getLayout(partition)` returns the schematic layout for a
 * zoom-factor partition, memoized so the (static) layout for each partition is
 * computed at most once. Crossing a partition boundary is a hard swap — the
 * consumer just asks for the new partition's layout.
 */

import { buildLayout, type TransitiveLayout } from "./network";
import { ZOOM_FACTORS, partitionForZoom } from "./zoom-factors";

export type {
  TransitiveLayout,
  LayoutEdge,
  LayoutVertex,
} from "./network";
export { partitionForZoom } from "./zoom-factors";

const cache = new Map<number, TransitiveLayout>();

export function getLayout(partition: number): TransitiveLayout {
  const clamped = Math.max(0, Math.min(ZOOM_FACTORS.length - 1, partition));
  let layout = cache.get(clamped);
  if (!layout) {
    layout = buildLayout(clamped, ZOOM_FACTORS[clamped]);
    cache.set(clamped, layout);
  }
  return layout;
}

export function getLayoutForZoom(zoom: number): TransitiveLayout {
  return getLayout(partitionForZoom(zoom));
}
