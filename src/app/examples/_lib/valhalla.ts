export type LngLat = [number, number];

export function decodePolyline(encoded: string, precision = 6): LngLat[] {
  const coords: LngLat[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const factor = Math.pow(10, precision);

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push([lng / factor, lat / factor]);
  }

  return coords;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

export function formatDistance(km: number): string {
  return `${km.toFixed(1)} km`;
}

function segmentDistance(a: LngLat, b: LngLat): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return Math.sqrt(dx * dx + dy * dy);
}

export function computeSegmentDistances(coords: LngLat[]): number[] {
  const distances: number[] = [];
  for (let i = 0; i < coords.length - 1; i++) {
    distances.push(segmentDistance(coords[i], coords[i + 1]));
  }
  return distances;
}

export function getProgressData(
  coords: LngLat[],
  segmentDistances: number[],
  totalDistance: number,
  progress: number,
): { path: LngLat[]; position: LngLat } {
  if (coords.length === 0) return { path: [], position: [0, 0] };
  if (progress <= 0) return { path: [coords[0]], position: coords[0] };
  if (progress >= 100) {
    return { path: coords, position: coords[coords.length - 1] };
  }

  const target = (progress / 100) * totalDistance;
  let accumulated = 0;

  for (let i = 0; i < segmentDistances.length; i++) {
    if (accumulated + segmentDistances[i] >= target) {
      const t = (target - accumulated) / segmentDistances[i];
      const from = coords[i];
      const to = coords[i + 1];
      const position: LngLat = [
        from[0] + (to[0] - from[0]) * t,
        from[1] + (to[1] - from[1]) * t,
      ];
      return { path: [...coords.slice(0, i + 1), position], position };
    }
    accumulated += segmentDistances[i];
  }

  return { path: coords, position: coords[coords.length - 1] };
}
