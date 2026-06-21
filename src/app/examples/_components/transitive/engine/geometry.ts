/**
 * 2D vector / geometry helpers.
 *
 * Direct ports of the functions transitive.js's layout depends on
 * (`lib/util/index.js`): `distance`, `ccw`, `getVectorAngle`,
 * `normalizeVector`, `rotateVector`, `negateVector`, `rayIntersection`,
 * `getRadiusFromAngleChord`, `pointAlongArc`. Kept in world (y-up) space — the
 * original ran them in screen space (y-down); the only behavioural difference is
 * the sign of y inputs, handled by callers.
 */

export type Vec = { x: number; y: number };

const TOLERANCE = 0.000001;

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

export function getRadiusFromAngleChord(angleR: number, chordLen: number): number {
  return chordLen / 2 / Math.sin(angleR / 2);
}

/** Port of `Edge.getElbowAngle` — sweep angle of the corner arc. */
export function getElbowAngleFromVectors(fromVector: Vec, toVector: Vec): number {
  const cx = fromVector.x - toVector.x;
  const cy = fromVector.y - toVector.y;
  const c = Math.sqrt(cx * cx + cy * cy) / 2;
  return Math.asin(c) * 2;
}

/** +1 ccw, -1 cw, 0 collinear. */
export function ccw(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): number {
  const raw = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
  return raw === 0 ? 0 : raw / Math.abs(raw);
}

export function getVectorAngle(x: number, y: number): number {
  let t = Math.atan(y / x);
  if (x < 0 && t <= 0) t += Math.PI;
  else if (x < 0 && t >= 0) t -= Math.PI;
  return t;
}

export function normalizeVector(v: Vec): Vec {
  const d = Math.sqrt(v.x * v.x + v.y * v.y);
  return { x: v.x / d, y: v.y / d };
}

export function rotateVector(v: Vec, theta: number): Vec {
  return {
    x: v.x * Math.cos(theta) - v.y * Math.sin(theta),
    y: v.x * Math.sin(theta) + v.y * Math.cos(theta),
  };
}

export function negateVector(v: Vec): Vec {
  return { x: -v.x, y: -v.y };
}

export type RayIntersection = { intersect: boolean; u: number; v: number };

export function rayIntersection(
  ax: number,
  ay: number,
  avx: number,
  avy: number,
  bx: number,
  by: number,
  bvx: number,
  bvy: number,
): RayIntersection {
  const denom = bvx * avy - bvy * avx;
  const u = ((by - ay) * bvx - (bx - ax) * bvy) / denom;
  const v = ((by - ay) * avx - (bx - ax) * avy) / denom;
  return { intersect: u > -TOLERANCE && v > -TOLERANCE, u, v };
}

/**
 * Point at fraction `t` (0..1) along the arc that starts at (x1,y1), ends at
 * (x2,y2), with radius `r`, sweep `theta`, orientation `ccwFlag` (+1/-1).
 * Port of `util.pointAlongArc`.
 */
export function pointAlongArc(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r: number,
  theta: number,
  ccwFlag: number,
  t: number,
): Vec {
  const dir = Math.abs(ccwFlag) / ccwFlag; // -> 1 or -1
  let rot = Math.PI / 2 - Math.abs(theta) / 2;
  const vectToCenter = normalizeVector(
    rotateVector({ x: x2 - x1, y: y2 - y1 }, dir * rot),
  );
  const cx = x1 + r * vectToCenter.x;
  const cy = y1 + r * vectToCenter.y;

  let vectFromCenter = negateVector(vectToCenter);
  rot = Math.abs(theta) * t * dir;
  vectFromCenter = normalizeVector(rotateVector(vectFromCenter, rot));

  return { x: cx + r * vectFromCenter.x, y: cy + r * vectFromCenter.y };
}
