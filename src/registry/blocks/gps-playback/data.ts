"use client";

// Real GPS traces (downsampled from the LeafletPlayback demo dataset) rebased to a
// fixed clock so the timeline reads the same in every timezone. Times are formatted
// in UTC throughout this block — see formatClock/formatDay in components/playback-timeline.

/** Start of the playback clock: 2013-05-28 17:08:00 UTC. */
export const TIMELINE_BASE = Date.UTC(2013, 4, 28, 17, 8, 0);

/** A single GPS fix. `o` is the offset in seconds from TIMELINE_BASE. */
export type TrackSample = {
  o: number;
  lng: number;
  lat: number;
};

export type GpsTrack = {
  id: string;
  label: string;
  /** Accent color used for the marker, traveled path and timeline range bar. */
  color: string;
  samples: TrackSample[];
};

export const gpsTracks: GpsTrack[] = [
  {
    id: "river-loop",
    label: "River Loop Ride",
    color: "#2563eb",
    samples: [
    { o: 0, lng: -123.2654, lat: 44.54962 },
    { o: 39, lng: -123.26595, lat: 44.54542 },
    { o: 96, lng: -123.26636, lat: 44.54132 },
    { o: 116, lng: -123.26669, lat: 44.53843 },
    { o: 141, lng: -123.2671, lat: 44.53468 },
    { o: 168, lng: -123.26751, lat: 44.53084 },
    { o: 202, lng: -123.26806, lat: 44.52571 },
    { o: 235, lng: -123.26883, lat: 44.51901 },
    { o: 269, lng: -123.26942, lat: 44.51249 },
    { o: 312, lng: -123.27192, lat: 44.50788 },
    { o: 365, lng: -123.27966, lat: 44.50801 },
    { o: 394, lng: -123.28458, lat: 44.50798 },
    { o: 589, lng: -123.28495, lat: 44.50396 },
    { o: 664, lng: -123.28725, lat: 44.50804 },
    { o: 700, lng: -123.29468, lat: 44.50902 },
    { o: 734, lng: -123.30258, lat: 44.50814 },
    { o: 768, lng: -123.30971, lat: 44.50429 },
    { o: 806, lng: -123.31212, lat: 44.49964 },
    { o: 843, lng: -123.31733, lat: 44.49764 },
    { o: 886, lng: -123.32488, lat: 44.49754 },
    { o: 920, lng: -123.33219, lat: 44.49625 },
    { o: 973, lng: -123.33962, lat: 44.49576 },
    { o: 1007, lng: -123.34922, lat: 44.49572 },
    { o: 1041, lng: -123.35822, lat: 44.49573 },
    { o: 1084, lng: -123.36618, lat: 44.49572 },
    { o: 1142, lng: -123.37099, lat: 44.49387 },
    { o: 1202, lng: -123.3766, lat: 44.4919 },
    { o: 1250, lng: -123.38066, lat: 44.48897 },
    { o: 1307, lng: -123.38191, lat: 44.48366 },
    { o: 1366, lng: -123.37965, lat: 44.47935 },
    { o: 1418, lng: -123.37629, lat: 44.47504 },
    { o: 1463, lng: -123.37163, lat: 44.47258 },
    { o: 1484, lng: -123.36647, lat: 44.47258 },
    { o: 1535, lng: -123.3629, lat: 44.47255 },
    { o: 1579, lng: -123.36472, lat: 44.47632 },
    { o: 1613, lng: -123.36289, lat: 44.48226 },
    { o: 1647, lng: -123.36272, lat: 44.48886 },
    { o: 1681, lng: -123.36179, lat: 44.49518 },
    { o: 1715, lng: -123.36141, lat: 44.50065 },
    { o: 1749, lng: -123.36138, lat: 44.50644 },
    { o: 1783, lng: -123.36025, lat: 44.51217 },
    { o: 1817, lng: -123.36546, lat: 44.51648 },
    { o: 1852, lng: -123.36749, lat: 44.52191 },
    { o: 1886, lng: -123.36877, lat: 44.52805 },
    { o: 1920, lng: -123.36802, lat: 44.53322 },
    { o: 1960, lng: -123.36788, lat: 44.53869 },
    { o: 2062, lng: -123.37021, lat: 44.54235 },
    { o: 2134, lng: -123.37396, lat: 44.53973 },
    { o: 2202, lng: -123.36634, lat: 44.53908 },
    { o: 2253, lng: -123.35844, lat: 44.53991 },
    { o: 2287, lng: -123.35132, lat: 44.54098 },
    { o: 2321, lng: -123.34379, lat: 44.54233 },
    { o: 2355, lng: -123.33594, lat: 44.54367 },
    { o: 2389, lng: -123.32728, lat: 44.54611 },
    { o: 2423, lng: -123.31899, lat: 44.54866 },
    { o: 2518, lng: -123.31125, lat: 44.55106 },
    { o: 2552, lng: -123.30435, lat: 44.55325 },
    { o: 2586, lng: -123.29627, lat: 44.55457 },
    { o: 2629, lng: -123.28834, lat: 44.5545 },
    { o: 2671, lng: -123.28067, lat: 44.55469 },
    { o: 2718, lng: -123.27378, lat: 44.55689 },
    { o: 2745, lng: -123.26768, lat: 44.5562 },
    { o: 2762, lng: -123.26362, lat: 44.55739 },
    { o: 2787, lng: -123.25711, lat: 44.55896 },
    { o: 2804, lng: -123.25461, lat: 44.5618 },
    { o: 2822, lng: -123.25252, lat: 44.56428 },
    { o: 2883, lng: -123.25653, lat: 44.5663 },
    { o: 2928, lng: -123.2594, lat: 44.56726 },
    { o: 2961, lng: -123.26128, lat: 44.56572 },
    { o: 2986, lng: -123.26261, lat: 44.56333 },
    { o: 3020, lng: -123.26439, lat: 44.55988 },
    { o: 3046, lng: -123.26576, lat: 44.55718 },
    { o: 3083, lng: -123.26505, lat: 44.55332 },
    { o: 3108, lng: -123.26535, lat: 44.5503 },
    { o: 3123, lng: -123.26414, lat: 44.5498 },
    ],
  },
  {
    id: "blue-mountain",
    label: "Blue Mountain Run",
    color: "#e11d48",
    samples: [
    { o: 0, lng: -123.53419, lat: 44.44846 },
    { o: 57, lng: -123.53155, lat: 44.44707 },
    { o: 101, lng: -123.52805, lat: 44.44592 },
    { o: 147, lng: -123.5246, lat: 44.4476 },
    { o: 221, lng: -123.52218, lat: 44.44971 },
    { o: 243, lng: -123.5201, lat: 44.45321 },
    { o: 265, lng: -123.51588, lat: 44.4565 },
    { o: 287, lng: -123.5114, lat: 44.45999 },
    { o: 309, lng: -123.50847, lat: 44.46403 },
    { o: 331, lng: -123.50399, lat: 44.46665 },
    { o: 353, lng: -123.49828, lat: 44.46849 },
    { o: 375, lng: -123.49186, lat: 44.47024 },
    { o: 405, lng: -123.48973, lat: 44.47182 },
    { o: 427, lng: -123.48689, lat: 44.46895 },
    { o: 455, lng: -123.48346, lat: 44.46996 },
    { o: 479, lng: -123.483, lat: 44.4709 },
    { o: 505, lng: -123.47925, lat: 44.47303 },
    { o: 532, lng: -123.47584, lat: 44.47464 },
    { o: 558, lng: -123.47089, lat: 44.47482 },
    { o: 580, lng: -123.46565, lat: 44.47482 },
    { o: 602, lng: -123.46174, lat: 44.47784 },
    { o: 624, lng: -123.45828, lat: 44.48128 },
    { o: 646, lng: -123.45477, lat: 44.48487 },
    { o: 668, lng: -123.45123, lat: 44.48819 },
    { o: 690, lng: -123.44639, lat: 44.49136 },
    { o: 712, lng: -123.44207, lat: 44.49505 },
    { o: 734, lng: -123.43968, lat: 44.49964 },
    { o: 756, lng: -123.43671, lat: 44.50402 },
    { o: 778, lng: -123.43458, lat: 44.50865 },
    { o: 798, lng: -123.43181, lat: 44.51261 },
    { o: 820, lng: -123.42823, lat: 44.51679 },
    { o: 842, lng: -123.42318, lat: 44.52002 },
    { o: 864, lng: -123.41792, lat: 44.52321 },
    { o: 886, lng: -123.41246, lat: 44.52613 },
    { o: 906, lng: -123.40711, lat: 44.52836 },
    { o: 927, lng: -123.40147, lat: 44.53072 },
    { o: 949, lng: -123.3959, lat: 44.53302 },
    { o: 971, lng: -123.39188, lat: 44.53566 },
    { o: 993, lng: -123.38833, lat: 44.53871 },
    { o: 1021, lng: -123.38471, lat: 44.54113 },
    { o: 1044, lng: -123.38086, lat: 44.53959 },
    { o: 1071, lng: -123.37578, lat: 44.53921 },
    { o: 1104, lng: -123.36986, lat: 44.5391 },
    { o: 1141, lng: -123.36508, lat: 44.53934 },
    { o: 1170, lng: -123.36033, lat: 44.53991 },
    { o: 1196, lng: -123.35532, lat: 44.54021 },
    { o: 1218, lng: -123.35089, lat: 44.54104 },
    { o: 1240, lng: -123.34606, lat: 44.54189 },
    { o: 1262, lng: -123.34111, lat: 44.54275 },
    { o: 1284, lng: -123.33571, lat: 44.54369 },
    { o: 1306, lng: -123.33043, lat: 44.54512 },
    { o: 1328, lng: -123.32517, lat: 44.54674 },
    { o: 1350, lng: -123.31993, lat: 44.54837 },
    { o: 1372, lng: -123.31479, lat: 44.54998 },
    { o: 1427, lng: -123.3099, lat: 44.55145 },
    { o: 1456, lng: -123.30534, lat: 44.55288 },
    { o: 1478, lng: -123.30081, lat: 44.55426 },
    { o: 1500, lng: -123.29537, lat: 44.55451 },
    { o: 1527, lng: -123.29035, lat: 44.55451 },
    { o: 1570, lng: -123.28539, lat: 44.55456 },
    { o: 1618, lng: -123.28002, lat: 44.55491 },
    { o: 1646, lng: -123.27569, lat: 44.55674 },
    { o: 1696, lng: -123.27287, lat: 44.55523 },
    { o: 1736, lng: -123.26976, lat: 44.55365 },
    { o: 1763, lng: -123.26969, lat: 44.55216 },
    { o: 1792, lng: -123.26734, lat: 44.55189 },
    { o: 1851, lng: -123.2654, lat: 44.54991 },
    { o: 1940, lng: -123.26383, lat: 44.54951 },
    { o: 1986, lng: -123.26305, lat: 44.54931 },
    { o: 2376, lng: -123.26313, lat: 44.54926 },
    { o: 2559, lng: -123.26312, lat: 44.5492 },
    { o: 2711, lng: -123.26311, lat: 44.5492 },
    ],
  },
];

/** Absolute epoch (ms) of a sample. */
export function sampleTime(sample: TrackSample): number {
  return TIMELINE_BASE + sample.o * 1000;
}

export function trackStart(track: GpsTrack): number {
  return sampleTime(track.samples[0]);
}

export function trackEnd(track: GpsTrack): number {
  return sampleTime(track.samples[track.samples.length - 1]);
}

/** Earliest start / latest end across every track — the clock's full extent. */
export const playbackBounds = {
  start: Math.min(...gpsTracks.map(trackStart)),
  end: Math.max(...gpsTracks.map(trackEnd)),
};

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Initial bearing from a → b, in degrees clockwise from north [0, 360). */
export function bearingBetween(
  a: { lng: number; lat: number },
  b: { lng: number; lat: number },
): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export type TrackPosition = {
  lng: number;
  lat: number;
  /** Heading in degrees, for orienting the marker. */
  bearing: number;
  /** Whether the cursor sits within this track's own time span. */
  active: boolean;
};

/**
 * Position of a track at clock time `t` (epoch ms). The point is linearly
 * interpolated between surrounding GPS fixes and clamped to the track's span,
 * mirroring LeafletPlayback's per-tick interpolation.
 */
export function interpolatePosition(track: GpsTrack, t: number): TrackPosition {
  const samples = track.samples;
  const start = trackStart(track);
  const end = trackEnd(track);
  const active = t >= start && t <= end;
  const clamped = Math.max(start, Math.min(end, t));

  let i = 0;
  while (
    i < samples.length - 1 &&
    sampleTime(samples[i + 1]) <= clamped
  ) {
    i += 1;
  }

  const curr = samples[i];
  const next = samples[Math.min(i + 1, samples.length - 1)];
  const span = sampleTime(next) - sampleTime(curr);
  const ratio = span > 0 ? (clamped - sampleTime(curr)) / span : 0;

  const lng = curr.lng + (next.lng - curr.lng) * ratio;
  const lat = curr.lat + (next.lat - curr.lat) * ratio;
  const bearing =
    curr === next ? bearingBetween(samples[Math.max(0, i - 1)], curr) : bearingBetween(curr, next);

  return { lng, lat, bearing, active };
}

/** Full polyline for a track. */
export function fullPath(track: GpsTrack): [number, number][] {
  return track.samples.map((s) => [s.lng, s.lat]);
}

/** The portion of a track already travelled by clock time `t`. */
export function traveledPath(track: GpsTrack, t: number): [number, number][] {
  const coords: [number, number][] = [];
  for (const sample of track.samples) {
    if (sampleTime(sample) <= t) coords.push([sample.lng, sample.lat]);
    else break;
  }
  const head = interpolatePosition(track, t);
  coords.push([head.lng, head.lat]);
  return coords;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Clock time formatted in UTC, e.g. "17:12" or "17:12:18". */
export function formatClock(t: number, withSeconds = false): string {
  const d = new Date(t);
  const base = `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
  return withSeconds ? `${base}:${pad2(d.getUTCSeconds())}` : base;
}

/** Calendar day formatted in UTC, e.g. "Tue 28 May". */
export function formatDay(t: number): string {
  const d = new Date(t);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
