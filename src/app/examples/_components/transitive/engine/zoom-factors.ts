/**
 * Zoom-factor partitions — the analogue of transitive.js's `zoomFactors`
 * (`lib/display/display.js:getDefaultZoomFactors`). Each partition is a discrete
 * layout regime; crossing a boundary recomputes the whole schematic (a hard
 * swap, exactly like the original `scaleChanged → network = null → render()`).
 *
 * Thresholds/units: `mergeThreshold`, `gridCellSize` and `cornerRadius` are in
 * EPSG:3857 world metres (the engine's internal space). They are tuned so the
 * Washington-DC demo reads as a clean schematic when zoomed out and as the real
 * street geometry when zoomed in.
 */

export type ZoomFactor = {
  /** Snap edge directions to multiples of this angle (degrees). */
  angleConstraint: number;
  /** Vertex grid snap size (world m, 0 = off). */
  gridCellSize: number;
  /** Merge stops closer than this into one MULTI hub (world m, 0 = off). */
  mergeThreshold: number;
  /** Elbow rounding radius (world m, 0 = sharp corner). */
  cornerRadius: number;
  /** Render the true geographic geometry instead of the schematic elbow. */
  geographic: boolean;
};

export const ZOOM_FACTORS: ZoomFactor[] = [
  // P0 — fully schematic (octolinear, merged hubs)
  {
    angleConstraint: 45,
    gridCellSize: 0,
    mergeThreshold: 380,
    cornerRadius: 230,
    geographic: false,
  },
  // P1 — looser schematic, fewer merges
  {
    angleConstraint: 30,
    gridCellSize: 0,
    mergeThreshold: 150,
    cornerRadius: 170,
    geographic: false,
  },
  // P2 — near-geographic schematic (tight angle, no merge)
  {
    angleConstraint: 10,
    gridCellSize: 0,
    mergeThreshold: 0,
    cornerRadius: 110,
    geographic: false,
  },
  // P3 — true geographic geometry
  {
    angleConstraint: 5,
    gridCellSize: 0,
    mergeThreshold: 0,
    cornerRadius: 0,
    geographic: true,
  },
];

/** MapLibre zoom -> partition index. Upper bound of each partition. */
const PARTITION_BOUNDS = [13, 14.5, 15.5];

export function partitionForZoom(zoom: number): number {
  for (let i = 0; i < PARTITION_BOUNDS.length; i++) {
    if (zoom < PARTITION_BOUNDS[i]) return i;
  }
  return ZOOM_FACTORS.length - 1;
}
