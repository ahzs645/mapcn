import type { LngLat } from "./types";

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

/**
 * Port of transitive.js `utils.pixels(scale, min, normal, max)` —
 * piecewise-linear interpolation across the scale domain [0.25, 1, 4].
 */
export function pixels(
  scale: number,
  min: number,
  normal: number,
  max: number,
): number {
  if (scale <= 0.25) return min;
  if (scale >= 4) return max;
  if (scale <= 1) return min + (normal - min) * ((scale - 0.25) / 0.75);
  return normal + (max - normal) * ((scale - 1) / 3);
}

/**
 * Linear morph from schematic geometry (progress 0) to geographic geometry
 * (progress 1). Mirrors transitive's two zoomFactor regimes (schematic at
 * minScale 0, geographic at minScale 1.5) but as a smooth crossfade so stops
 * and lines glide between the two layouts instead of hard-swapping.
 */
export function zoomToProgress(zoom: number): number {
  return clamp01((zoom - 13.8) / 1.6);
}

/** Component-wise lerp between two lng/lat coordinates. */
export function lerpLngLat(from: LngLat, to: LngLat, progress: number): LngLat {
  return [
    from[0] + (to[0] - from[0]) * progress,
    from[1] + (to[1] - from[1]) * progress,
  ];
}

/**
 * Map MapLibre zoom into transitive's `scale` domain so the `pixels()`
 * formula can drive marker / line / font sizes consistently.
 */
export function zoomToScale(zoom: number): number {
  if (zoom <= 11) return 0.25;
  if (zoom >= 16) return 4;
  if (zoom <= 13) return 0.25 + ((zoom - 11) / 2) * (1 - 0.25);
  return 1 + ((zoom - 13) / 3) * (4 - 1);
}

export const STOP_RADIUS = (scale: number) => pixels(scale, 4, 6, 9);
export const MAJOR_STOP_RADIUS = (scale: number) => pixels(scale, 6, 9, 13);
export const STOP_STROKE = (scale: number) => pixels(scale, 1, 2, 3);
export const STOP_FONT = (scale: number) => pixels(scale, 10, 12, 16);
export const PLACE_FONT = (scale: number) => pixels(scale, 11, 13, 17);
export const RAIL_WIDTH = (scale: number) => pixels(scale, 6, 10, 14);
export const BUS_WIDTH = (scale: number) => pixels(scale, 4, 7, 10);
export const WALK_WIDTH = (scale: number) => pixels(scale, 3, 5, 7);
export const ROUTE_BADGE_FONT = (scale: number) => pixels(scale, 10, 12, 15);
export const PLACE_RADIUS = (scale: number) => pixels(scale, 9, 12, 17);

export const NOT_FOCUSED_COLOR = "#cdd2d8";
export const NOT_FOCUSED_STROKE = "#a0a4ab";

export function dimColor(color: string, focused: boolean): string {
  return focused ? color : NOT_FOCUSED_COLOR;
}

export function metersPerPixel(latitude: number, zoom: number): number {
  return (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / 2 ** zoom;
}

export function haversineMeters(a: LngLat, b: LngLat): number {
  const R = 6371000;
  const phi1 = (a[1] * Math.PI) / 180;
  const phi2 = (b[1] * Math.PI) / 180;
  const dphi = ((b[1] - a[1]) * Math.PI) / 180;
  const dlambda = ((b[0] - a[0]) * Math.PI) / 180;
  const h =
    Math.sin(dphi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
