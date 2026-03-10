import { NextRequest, NextResponse } from "next/server";

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: {
    name?: string;
    tourism?: string;
    amenity?: string;
    cuisine?: string;
    stars?: string;
    [key: string]: string | undefined;
  };
}

interface Activity {
  name: string;
  type: "Attraction" | "Dining";
  time: string;
  coordinates: [number, number];
}

interface DayPlan {
  day: number;
  title: string;
  activities: Activity[];
  stay: { name: string; price: string; coordinates: [number, number] };
}

interface TripResponse {
  title: string;
  duration: string;
  budget: string;
  highlights: { name: string; coordinates: [number, number] }[];
  days: DayPlan[];
  routeWaypoints: [number, number][];
}

interface Waypoint {
  name: string;
  lat: number;
  lon: number;
}

const ACTIVITY_TIMES = ["9:00 AM", "12:00 PM", "3:00 PM", "7:00 PM"];
const HOTEL_PRICES = ["$150", "$180", "$220", "$250", "$280", "$320", "$350"];
const DAILY_FOOD_AND_ACTIVITIES_COST = 100;
const AVG_HOTEL_COST = 220;

const DEFAULT_WAYPOINTS: Waypoint[] = [
  { name: "San Francisco", lat: 37.7749, lon: -122.4194 },
  { name: "Big Sur", lat: 36.2704, lon: -121.9067 },
  { name: "Santa Barbara", lat: 34.4208, lon: -119.6982 },
  { name: "Los Angeles", lat: 34.0522, lon: -118.2437 },
];

async function fetchPOIs(
  lat: number,
  lon: number,
  radius: number,
  type: "attraction" | "restaurant" | "hotel"
): Promise<OverpassElement[]> {
  const queries: Record<string, string> = {
    attraction: `
      [out:json][timeout:25];
      (
        node["tourism"="attraction"](around:${radius},${lat},${lon});
        node["tourism"="museum"](around:${radius},${lat},${lon});
        node["tourism"="viewpoint"](around:${radius},${lat},${lon});
        node["historic"](around:${radius},${lat},${lon});
        way["tourism"="attraction"](around:${radius},${lat},${lon});
        way["tourism"="museum"](around:${radius},${lat},${lon});
      );
      out center 20;
    `,
    restaurant: `
      [out:json][timeout:25];
      (
        node["amenity"="restaurant"](around:${radius},${lat},${lon});
        node["amenity"="cafe"](around:${radius},${lat},${lon});
      );
      out 15;
    `,
    hotel: `
      [out:json][timeout:25];
      (
        node["tourism"="hotel"](around:${radius},${lat},${lon});
        way["tourism"="hotel"](around:${radius},${lat},${lon});
      );
      out center 10;
    `,
  };

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: queries[type],
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "mapcn/1.0",
    },
  });

  if (!res.ok) return [];
  const data = await res.json();
  return (data.elements as OverpassElement[]).filter((el) => el.tags?.name);
}

function getCoordinates(el: OverpassElement): [number, number] {
  if (el.lat && el.lon) return [el.lon, el.lat];
  if (el.center) return [el.center.lon, el.center.lat];
  return [0, 0];
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i]!, shuffled[j]!] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

function createActivity(
  el: OverpassElement | undefined,
  wp: Waypoint,
  type: "Attraction" | "Dining",
  time: string,
  prefix: string,
  fallback: string
): Activity {
  if (el) {
    return {
      name: `${prefix} ${el.tags?.name}`,
      type,
      time,
      coordinates: getCoordinates(el),
    };
  }
  return { name: `${fallback} ${wp.name}`, type, time, coordinates: [wp.lon, wp.lat] };
}

function calculateBudget(daysCount: number): string {
  const totalNights = daysCount - 1;
  const estimated = totalNights * AVG_HOTEL_COST + daysCount * DAILY_FOOD_AND_ACTIVITIES_COST;
  return `$${Math.round(estimated / 100) * 100}`;
}

export async function GET(request: NextRequest) {
  const waypoints = DEFAULT_WAYPOINTS;
  const days: DayPlan[] = [];
  const routeWaypoints: [number, number][] = [];

  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i]!;
    routeWaypoints.push([wp.lon, wp.lat]);

    const [attractions, restaurants, hotels] = await Promise.all([
      fetchPOIs(wp.lat, wp.lon, 5000, "attraction").catch(() => []),
      fetchPOIs(wp.lat, wp.lon, 3000, "restaurant").catch(() => []),
      fetchPOIs(wp.lat, wp.lon, 5000, "hotel").catch(() => []),
    ]);

    const sa = shuffleArray(attractions);
    const sr = shuffleArray(restaurants);
    const sh = shuffleArray(hotels);

    const activities: Activity[] = [
      createActivity(sa[0], wp, "Attraction", ACTIVITY_TIMES[0]!, "Visit", "Explore"),
      createActivity(sr[0], wp, "Dining", ACTIVITY_TIMES[1]!, "Lunch at", "Lunch in"),
      createActivity(sa[1], wp, "Attraction", ACTIVITY_TIMES[2]!, "Explore", "Walk around"),
      createActivity(sr[1], wp, "Dining", ACTIVITY_TIMES[3]!, "Dinner at", "Dinner in"),
    ];

    const price = HOTEL_PRICES[Math.floor(Math.random() * HOTEL_PRICES.length)]!;
    const stay = sh[0]
      ? { name: sh[0].tags?.name || `Hotel in ${wp.name}`, price, coordinates: getCoordinates(sh[0]) }
      : { name: `Hotel in ${wp.name}`, price, coordinates: [wp.lon, wp.lat] as [number, number] };

    const prev = waypoints[i - 1];
    const title = prev ? `${prev.name} to ${wp.name}` : `${wp.name} Exploration`;

    days.push({ day: i + 1, title, activities, stay });
  }

  const response: TripResponse = {
    title: "Pacific Coast Highway Adventure",
    duration: `${days.length} days`,
    budget: calculateBudget(days.length),
    highlights: waypoints.map((wp) => ({ name: wp.name, coordinates: [wp.lon, wp.lat] })),
    days,
    routeWaypoints,
  };

  return NextResponse.json(response, {
    headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
  });
}
