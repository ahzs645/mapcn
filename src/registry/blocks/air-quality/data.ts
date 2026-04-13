import { type ChartConfig } from "@/components/ui/chart";

export type AqiLevel = "good" | "moderate" | "unhealthy-sensitive" | "unhealthy" | "hazardous";

export interface Sensor {
  id: string;
  name: string;
  type: "AirBeam" | "Government" | "PurpleAir";
  lat: number;
  lng: number;
  aqi: number;
  pm25: number;
  pm10: number;
  temperature: number;
  humidity: number;
  lastUpdated: string;
  active: boolean;
}

export interface Thresholds {
  min: number;
  low: number;
  middle: number;
  high: number;
  max: number;
}

export const PM25_THRESHOLDS: Thresholds = {
  min: 0,
  low: 12,
  middle: 35,
  high: 55,
  max: 150,
};

export const AQI_COLORS: Record<AqiLevel, string> = {
  good: "#96D788",
  moderate: "#FFD960",
  "unhealthy-sensitive": "#FCA443",
  unhealthy: "#E95F5F",
  hazardous: "#8B5CF6",
};

export function getAqiLevel(aqi: number): AqiLevel {
  if (aqi <= 50) return "good";
  if (aqi <= 100) return "moderate";
  if (aqi <= 150) return "unhealthy-sensitive";
  if (aqi <= 200) return "unhealthy";
  return "hazardous";
}

export function getAqiColor(aqi: number): string {
  return AQI_COLORS[getAqiLevel(aqi)];
}

export function getAqiLabel(aqi: number): string {
  const level = getAqiLevel(aqi);
  const labels: Record<AqiLevel, string> = {
    good: "Good",
    moderate: "Moderate",
    "unhealthy-sensitive": "Unhealthy for Sensitive Groups",
    unhealthy: "Unhealthy",
    hazardous: "Hazardous",
  };
  return labels[level];
}

export const sensors: Sensor[] = [
  {
    id: "ab-001",
    name: "Downtown Station",
    type: "AirBeam",
    lat: 40.7484,
    lng: -73.9857,
    aqi: 42,
    pm25: 10.2,
    pm10: 18.5,
    temperature: 72,
    humidity: 45,
    lastUpdated: "2 min ago",
    active: true,
  },
  {
    id: "ab-002",
    name: "Central Park West",
    type: "AirBeam",
    lat: 40.7751,
    lng: -73.9712,
    aqi: 38,
    pm25: 9.1,
    pm10: 15.3,
    temperature: 70,
    humidity: 48,
    lastUpdated: "1 min ago",
    active: true,
  },
  {
    id: "gov-001",
    name: "Midtown Monitoring",
    type: "Government",
    lat: 40.7549,
    lng: -73.984,
    aqi: 67,
    pm25: 21.4,
    pm10: 34.2,
    temperature: 74,
    humidity: 42,
    lastUpdated: "5 min ago",
    active: true,
  },
  {
    id: "pa-001",
    name: "Brooklyn Heights",
    type: "PurpleAir",
    lat: 40.6959,
    lng: -73.9938,
    aqi: 53,
    pm25: 14.8,
    pm10: 22.1,
    temperature: 71,
    humidity: 50,
    lastUpdated: "3 min ago",
    active: true,
  },
  {
    id: "ab-003",
    name: "Upper East Side",
    type: "AirBeam",
    lat: 40.7736,
    lng: -73.956,
    aqi: 29,
    pm25: 7.0,
    pm10: 12.8,
    temperature: 69,
    humidity: 52,
    lastUpdated: "1 min ago",
    active: true,
  },
  {
    id: "gov-002",
    name: "Queens Blvd",
    type: "Government",
    lat: 40.7282,
    lng: -73.7949,
    aqi: 88,
    pm25: 28.6,
    pm10: 45.1,
    temperature: 75,
    humidity: 38,
    lastUpdated: "8 min ago",
    active: true,
  },
  {
    id: "pa-002",
    name: "Williamsburg",
    type: "PurpleAir",
    lat: 40.7081,
    lng: -73.9571,
    aqi: 61,
    pm25: 18.2,
    pm10: 29.7,
    temperature: 73,
    humidity: 44,
    lastUpdated: "4 min ago",
    active: true,
  },
  {
    id: "ab-004",
    name: "Harlem",
    type: "AirBeam",
    lat: 40.8116,
    lng: -73.9465,
    aqi: 115,
    pm25: 42.3,
    pm10: 68.9,
    temperature: 76,
    humidity: 36,
    lastUpdated: "2 min ago",
    active: true,
  },
  {
    id: "pa-003",
    name: "Jersey City",
    type: "PurpleAir",
    lat: 40.7178,
    lng: -74.0431,
    aqi: 74,
    pm25: 23.1,
    pm10: 37.5,
    temperature: 72,
    humidity: 46,
    lastUpdated: "6 min ago",
    active: true,
  },
  {
    id: "gov-003",
    name: "Bronx Station",
    type: "Government",
    lat: 40.8448,
    lng: -73.8648,
    aqi: 95,
    pm25: 31.2,
    pm10: 50.8,
    temperature: 77,
    humidity: 35,
    lastUpdated: "10 min ago",
    active: true,
  },
  {
    id: "ab-005",
    name: "Staten Island",
    type: "AirBeam",
    lat: 40.5795,
    lng: -74.1502,
    aqi: 31,
    pm25: 7.4,
    pm10: 13.6,
    temperature: 68,
    humidity: 55,
    lastUpdated: "3 min ago",
    active: true,
  },
  {
    id: "pa-004",
    name: "Astoria Park",
    type: "PurpleAir",
    lat: 40.7743,
    lng: -73.9249,
    aqi: 47,
    pm25: 11.8,
    pm10: 19.4,
    temperature: 71,
    humidity: 49,
    lastUpdated: "2 min ago",
    active: true,
  },
];

export const hourlyAqi = [
  { hour: "12AM", aqi: 38 },
  { hour: "2AM", aqi: 35 },
  { hour: "4AM", aqi: 32 },
  { hour: "6AM", aqi: 41 },
  { hour: "8AM", aqi: 58 },
  { hour: "10AM", aqi: 64 },
  { hour: "12PM", aqi: 52 },
  { hour: "2PM", aqi: 48 },
  { hour: "4PM", aqi: 55 },
  { hour: "6PM", aqi: 67 },
  { hour: "8PM", aqi: 54 },
  { hour: "10PM", aqi: 44 },
];

export const hourlyAqiChartConfig = {
  aqi: {
    label: "AQI",
    color: "var(--color-emerald-500)",
  },
} satisfies ChartConfig;

export const sensorTypeData = [
  { name: "AirBeam", value: 5, fill: "var(--color-blue-500)" },
  { name: "Government", value: 3, fill: "var(--color-amber-500)" },
  { name: "PurpleAir", value: 4, fill: "var(--color-violet-500)" },
];

export const sensorTypeChartConfig = {
  airbeam: { label: "AirBeam", color: "var(--color-blue-500)" },
  government: { label: "Government", color: "var(--color-amber-500)" },
  purpleair: { label: "PurpleAir", color: "var(--color-violet-500)" },
} satisfies ChartConfig;

export const pollutantRows = [
  { label: "PM2.5", value: 18.4, unit: "μg/m³" },
  { label: "PM10", value: 30.7, unit: "μg/m³" },
  { label: "NO₂", value: 22.1, unit: "ppb" },
  { label: "O₃", value: 38.5, unit: "ppb" },
  { label: "CO", value: 0.6, unit: "ppm" },
  { label: "SO₂", value: 3.2, unit: "ppb" },
];
