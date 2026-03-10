import { NextRequest, NextResponse } from "next/server";

const VALID_ENDPOINTS = ["route", "optimized_route", "isochrone", "sources_to_targets"];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const json = searchParams.get("json");
  const endpoint = searchParams.get("endpoint") || "route";

  if (!json) {
    return NextResponse.json({ error: "Missing json parameter" }, { status: 400 });
  }

  if (!VALID_ENDPOINTS.includes(endpoint)) {
    return NextResponse.json(
      { error: `Invalid endpoint. Supported: ${VALID_ENDPOINTS.join(", ")}` },
      { status: 400 }
    );
  }

  const res = await fetch(
    `https://valhalla1.openstreetmap.de/${endpoint}?json=${encodeURIComponent(json)}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "mapcn/1.0",
      },
      next: { revalidate: 3600 },
    }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: `Valhalla API error: ${res.status}` },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
