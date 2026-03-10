import { NextResponse } from "next/server";

interface WeatherPoint {
  lat: number;
  lon: number;
  val: number;
}

function generateGrid(): { lat: number; lon: number }[] {
  const points: { lat: number; lon: number }[] = [];
  const n = 10;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      points.push({
        lat: -80 + (i * 160) / n,
        lon: -180 + (j * 360) / n,
      });
    }
  }
  return points;
}

export async function GET() {
  const grid = generateGrid();

  // Open-Meteo supports comma-separated coordinates — batch in chunks of 50
  const chunkSize = 50;
  const results: WeatherPoint[] = [];

  for (let i = 0; i < grid.length; i += chunkSize) {
    const chunk = grid.slice(i, i + chunkSize);
    const lats = chunk.map((p) => p.lat).join(",");
    const lons = chunk.map((p) => p.lon).join(",");

    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m`,
        { next: { revalidate: 1800 } }
      );

      if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
      const data = await res.json();

      // Open-Meteo returns an array when multiple coords are given
      const items = Array.isArray(data) ? data : [data];
      for (let j = 0; j < chunk.length; j++) {
        const temp = items[j]?.current?.temperature_2m ?? 0;
        results.push({ lat: chunk[j]!.lat, lon: chunk[j]!.lon, val: temp });
      }
    } catch (e) {
      // Fallback: fill with 0 for failed chunks
      for (const p of chunk) {
        results.push({ lat: p.lat, lon: p.lon, val: 0 });
      }
    }
  }

  return NextResponse.json(results, {
    headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
  });
}
