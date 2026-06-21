import type { LngLat } from "../types";

/**
 * EPSG:3857 (spherical mercator) forward / inverse projection.
 *
 * Port of the `sphericalmercator` package's `forward` / `inverse` used by
 * transitive.js (`lib/util/index.js` → `sm.forward` / `sm.inverse`). The whole
 * layout engine runs in this flat metre space and only converts back to
 * `lng/lat` at the very end, exactly as the original computes everything in the
 * graph's internal x/y space.
 */

export type WorldXY = { x: number; y: number };

const R = 6378137;
const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const MAX_LAT = 85.0511287798;

/** [lon, lat] -> world metres {x, y} (y is north-up). */
export function forward([lon, lat]: LngLat): WorldXY {
  const clampedLat = Math.max(Math.min(MAX_LAT, lat), -MAX_LAT);
  return {
    x: R * lon * D2R,
    y: R * Math.log(Math.tan(Math.PI * 0.25 + 0.5 * clampedLat * D2R)),
  };
}

/** world metres {x, y} -> [lon, lat]. */
export function inverse({ x, y }: WorldXY): LngLat {
  return [(x * R2D) / R, (2 * Math.atan(Math.exp(y / R)) - Math.PI * 0.5) * R2D];
}
