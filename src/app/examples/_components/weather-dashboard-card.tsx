"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Map, MapMarker, MarkerContent, useMap } from "@/registry/map";
import {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudRainWind,
  Snowflake,
  CloudSnow,
  CloudLightning,
  Thermometer,
  Droplets,
  Wind,
  Compass,
  Search,
  X,
  MapPin,
  Loader2,
  RefreshCw,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";

// ── Types ────────────────────────────────────────────────────────

interface CityInfo {
  name: string;
  lat: number;
  lon: number;
  country: string;
}

interface CurrentWeather {
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  weather_code: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  is_day: number;
}

interface CityWeather extends CityInfo {
  current: CurrentWeather;
}

interface DailyForecast {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  wind_speed_10m_max: number[];
  sunrise: string[];
  sunset: string[];
}

interface CityForecast {
  latitude: number;
  longitude: number;
  current: CurrentWeather & {
    wind_gusts_10m: number;
    uv_index: number;
  };
  daily: DailyForecast;
}

interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
  population?: number;
}

interface AirQualityData {
  us_aqi: number;
  european_aqi: number;
  pm10: number;
  pm2_5: number;
}

interface AqiLevel {
  label: string;
  color: string;
  textColor: string;
}

// ── Constants ────────────────────────────────────────────────────

const MAJOR_CITIES: CityInfo[] = [
  { name: "New York", lat: 40.71, lon: -74.01, country: "US" },
  { name: "London", lat: 51.51, lon: -0.12, country: "GB" },
  { name: "Paris", lat: 48.85, lon: 2.35, country: "FR" },
  { name: "Tokyo", lat: 35.68, lon: 139.69, country: "JP" },
  { name: "Mumbai", lat: 19.07, lon: 72.88, country: "IN" },
  { name: "Sydney", lat: -33.87, lon: 151.21, country: "AU" },
  { name: "São Paulo", lat: -23.55, lon: -46.63, country: "BR" },
  { name: "Cairo", lat: 30.04, lon: 31.24, country: "EG" },
  { name: "Moscow", lat: 55.75, lon: 37.62, country: "RU" },
  { name: "Beijing", lat: 39.9, lon: 116.4, country: "CN" },
  { name: "Dubai", lat: 25.2, lon: 55.27, country: "AE" },
  { name: "Singapore", lat: 1.35, lon: 103.82, country: "SG" },
  { name: "Berlin", lat: 52.52, lon: 13.41, country: "DE" },
  { name: "Lagos", lat: 6.52, lon: 3.38, country: "NG" },
  { name: "Mexico City", lat: 19.43, lon: -99.13, country: "MX" },
  { name: "Bangkok", lat: 13.76, lon: 100.5, country: "TH" },
  { name: "Istanbul", lat: 41.01, lon: 28.98, country: "TR" },
  { name: "Buenos Aires", lat: -34.6, lon: -58.38, country: "AR" },
  { name: "Seoul", lat: 37.57, lon: 126.98, country: "KR" },
  { name: "Nairobi", lat: -1.29, lon: 36.82, country: "KE" },
  { name: "Toronto", lat: 43.65, lon: -79.38, country: "CA" },
  { name: "Rome", lat: 41.9, lon: 12.5, country: "IT" },
  { name: "Madrid", lat: 40.42, lon: -3.7, country: "ES" },
  { name: "Johannesburg", lat: -26.2, lon: 28.04, country: "ZA" },
  { name: "Auckland", lat: -36.85, lon: 174.76, country: "NZ" },
];

const WMO_ICON_MAP: Record<number, ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  0: Sun,
  1: CloudSun,
  2: CloudSun,
  3: Cloud,
  45: CloudFog,
  48: CloudFog,
  51: CloudDrizzle,
  53: CloudDrizzle,
  55: CloudDrizzle,
  56: CloudDrizzle,
  57: CloudDrizzle,
  61: CloudRain,
  63: CloudRain,
  65: CloudRain,
  66: CloudRain,
  67: CloudRain,
  71: Snowflake,
  73: Snowflake,
  75: Snowflake,
  77: Snowflake,
  80: CloudRainWind,
  81: CloudRainWind,
  82: CloudRainWind,
  85: CloudSnow,
  86: CloudSnow,
  95: CloudLightning,
  96: CloudLightning,
  99: CloudLightning,
};

const WMO_DESCRIPTION_MAP: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight showers",
  81: "Moderate showers",
  82: "Violent showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with heavy hail",
};

const AQI_LEVELS: { max: number; level: AqiLevel }[] = [
  { max: 50, level: { label: "Good", color: "#22c55e", textColor: "#14532d" } },
  { max: 100, level: { label: "Moderate", color: "#eab308", textColor: "#713f12" } },
  { max: 150, level: { label: "Unhealthy (SG)", color: "#f97316", textColor: "#7c2d12" } },
  { max: 200, level: { label: "Unhealthy", color: "#ef4444", textColor: "#7f1d1d" } },
  { max: 300, level: { label: "Very Unhealthy", color: "#a855f7", textColor: "#3b0764" } },
  { max: Infinity, level: { label: "Hazardous", color: "#881337", textColor: "#fecdd3" } },
];

// ── Helper functions ─────────────────────────────────────────────

function getAqiLevel(aqi: number): AqiLevel {
  const match = AQI_LEVELS.find((l) => aqi <= l.max);
  return match?.level ?? AQI_LEVELS[AQI_LEVELS.length - 1]!.level;
}

function getTemperatureColor(temp: number): string {
  if (temp <= -20) return "#1e40af";
  if (temp <= -5) return "#3b82f6";
  if (temp <= 5) return "#06b6d4";
  if (temp <= 15) return "#22c55e";
  if (temp <= 25) return "#eab308";
  if (temp <= 35) return "#f97316";
  return "#ef4444";
}

function getWeatherIcon(code: number): ComponentType<{ className?: string; style?: React.CSSProperties }> {
  return WMO_ICON_MAP[code] ?? Cloud;
}

function getWeatherDescription(code: number): string {
  return WMO_DESCRIPTION_MAP[code] ?? "Unknown";
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDayName(dateStr: string): string {
  return DAY_NAMES[new Date(dateStr).getDay()] ?? "";
}

// ── Custom hook ──────────────────────────────────────────────────

function useWeatherData() {
  const [citiesWeather, setCitiesWeather] = useState<CityWeather[]>([]);
  const [selectedCity, setSelectedCity] = useState<CityWeather | null>(null);
  const [selectedForecast, setSelectedForecast] = useState<CityForecast | null>(null);
  const [selectedCityAqi, setSelectedCityAqi] = useState<AirQualityData | null>(null);
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isForecastLoading, setIsForecastLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [citiesAirQuality, setCitiesAirQuality] = useState<globalThis.Map<string, AirQualityData>>(() => new globalThis.Map<string, AirQualityData>());

  const fetchAllCitiesWeather = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const lats = MAJOR_CITIES.map((c) => c.lat).join(",");
      const lons = MAJOR_CITIES.map((c) => c.lon).join(",");
      const weatherUrl =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${lats}&longitude=${lons}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,is_day` +
        `&timezone=auto`;
      const aqiUrl =
        `https://air-quality-api.open-meteo.com/v1/air-quality` +
        `?latitude=${lats}&longitude=${lons}` +
        `&current=us_aqi,european_aqi,pm10,pm2_5`;

      const [weatherResponse, aqiResponse] = await Promise.all([
        fetch(weatherUrl),
        fetch(aqiUrl),
      ]);

      const weatherData = await weatherResponse.json();
      const aqiData = await aqiResponse.json();

      if (Array.isArray(weatherData)) {
        setCitiesWeather(
          MAJOR_CITIES.map((city, index) => ({
            ...city,
            current: weatherData[index]?.current,
          }))
        );
      }

      if (Array.isArray(aqiData)) {
        const aqiMap = new globalThis.Map<string, AirQualityData>();
        MAJOR_CITIES.forEach((city, index) => {
          const aqi = aqiData[index]?.current;
          if (aqi) aqiMap.set(city.name, aqi);
        });
        setCitiesAirQuality(aqiMap);
      }

      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch weather data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCityForecast = useCallback(async (lat: number, lon: number) => {
    try {
      setIsForecastLoading(true);
      const forecastUrl =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day,uv_index` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,sunrise,sunset` +
        `&forecast_days=7&timezone=auto`;
      const aqiUrl =
        `https://air-quality-api.open-meteo.com/v1/air-quality` +
        `?latitude=${lat}&longitude=${lon}` +
        `&current=us_aqi,european_aqi,pm10,pm2_5`;

      const [forecastResponse, aqiResponse] = await Promise.all([
        fetch(forecastUrl),
        fetch(aqiUrl),
      ]);

      const forecastData = await forecastResponse.json();
      const aqiData = await aqiResponse.json();

      setSelectedForecast(forecastData);
      setSelectedCityAqi(aqiData.current ?? null);
    } catch {
      // silently fail
    } finally {
      setIsForecastLoading(false);
    }
  }, []);

  const searchCity = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
      const response = await fetch(url);
      const data = await response.json();
      setSearchResults(data.results ?? []);
    } catch {
      setSearchResults([]);
    }
  }, []);

  const selectCity = useCallback(
    (city: CityWeather) => {
      setSelectedCity(city);
      fetchCityForecast(city.lat, city.lon);
    },
    [fetchCityForecast]
  );

  const selectSearchResult = useCallback(
    (result: GeocodingResult) => {
      const newCity: CityWeather = {
        name: result.name,
        lat: result.latitude,
        lon: result.longitude,
        country: result.country,
        current: {
          temperature_2m: 0,
          relative_humidity_2m: 0,
          apparent_temperature: 0,
          weather_code: 0,
          wind_speed_10m: 0,
          wind_direction_10m: 0,
          is_day: 1,
        },
      };
      setSelectedCity(newCity);
      fetchCityForecast(result.latitude, result.longitude);
      setSearchResults([]);
    },
    [fetchCityForecast]
  );

  const clearSelection = useCallback(() => {
    setSelectedCity(null);
    setSelectedForecast(null);
    setSelectedCityAqi(null);
  }, []);

  return {
    citiesWeather,
    citiesAirQuality,
    selectedCity,
    selectedForecast,
    selectedCityAqi,
    searchResults,
    isLoading,
    isForecastLoading,
    error,
    lastUpdated,
    fetchAllCitiesWeather,
    searchCity,
    selectCity,
    selectSearchResult,
    clearSelection,
  };
}

// ── FlyToHandler (accesses map via context) ──────────────────────

function FlyToHandler({
  target,
}: {
  target: { lon: number; lat: number } | null;
}) {
  const { map } = useMap();
  const lastTarget = useRef<string | null>(null);

  useEffect(() => {
    if (!map || !target) return;
    const key = `${target.lon},${target.lat}`;
    if (lastTarget.current === key) return;
    lastTarget.current = key;
    map.flyTo({
      center: [target.lon, target.lat],
      zoom: 5,
      duration: 1500,
    });
  }, [map, target]);

  return null;
}

// ── Temperature Legend ────────────────────────────────────────────

function TemperatureLegend() {
  const colors = ["#1e40af", "#3b82f6", "#06b6d4", "#22c55e", "#eab308", "#f97316", "#ef4444"];
  return (
    <div className="rounded-lg border border-border/50 bg-background/90 px-3 py-2 backdrop-blur-sm">
      <div className="text-[10px] font-semibold text-muted-foreground mb-1.5">Temperature</div>
      <div
        className="h-2 w-full rounded-full"
        style={{
          background: `linear-gradient(to right, ${colors.join(", ")})`,
        }}
      />
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-muted-foreground">-20°</span>
        <span className="text-[9px] text-muted-foreground">35°+</span>
      </div>
    </div>
  );
}

// ── AQI Legend ────────────────────────────────────────────────────

function AqiLegend() {
  const items = [
    { label: "Good", color: "#22c55e" },
    { label: "Moderate", color: "#eab308" },
    { label: "Sensitive", color: "#f97316" },
    { label: "Unhealthy", color: "#ef4444" },
    { label: "V. Unhealthy", color: "#a855f7" },
    { label: "Hazardous", color: "#881337" },
  ];
  return (
    <div className="rounded-lg border border-border/50 bg-background/90 px-3 py-2 backdrop-blur-sm">
      <div className="text-[10px] font-semibold text-muted-foreground mb-1.5">AQI (US EPA)</div>
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[9px] text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Control Panel (search) ───────────────────────────────────────

function ControlPanel({
  searchResults,
  onSearch,
  onSelectResult,
}: {
  searchResults: GeocodingResult[];
  onSearch: (query: string) => void;
  onSelectResult: (result: GeocodingResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  function handleInput(value: string) {
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearch(value), 300);
  }

  function handleSelect(result: GeocodingResult) {
    setQuery(result.name);
    setFocused(false);
    onSelectResult(result);
  }

  function handleClear() {
    setQuery("");
    onSearch("");
  }

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Search City</h3>
        <div className="relative">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              type="text"
              placeholder="Search for a city..."
              className="w-full rounded-md border border-border bg-background py-2 pr-8 pl-8 text-sm outline-none focus:ring-2 focus:ring-primary/50"
              onChange={(e) => handleInput(e.target.value)}
              onFocus={() => setFocused(true)}
            />
            {query && (
              <button
                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={handleClear}
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {focused && searchResults.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-background shadow-lg">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors first:rounded-t-md last:rounded-b-md hover:bg-accent"
                  onClick={() => handleSelect(result)}
                >
                  <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <span className="font-medium">{result.name}</span>
                    <span className="text-muted-foreground">
                      , {result.admin1 ? `${result.admin1}, ` : ""}
                      {result.country}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/50 p-3">
        <p className="text-xs text-muted-foreground">
          <strong>Live Data:</strong> Weather from{" "}
          <a
            href="https://open-meteo.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Open-Meteo
          </a>{" "}
          (free, no API key). Click any marker to see forecast and air quality.
        </p>
      </div>
    </div>
  );
}

// ── City Card (detail view) ──────────────────────────────────────

function CityCard({
  city,
  forecast,
  airQuality,
  isForecastLoading,
  onClose,
}: {
  city: CityWeather;
  forecast: CityForecast | null;
  airQuality: AirQualityData | null;
  isForecastLoading: boolean;
  onClose: () => void;
}) {
  const WeatherIcon = getWeatherIcon(city.current.weather_code);
  const tempColor = getTemperatureColor(city.current.temperature_2m);

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold">{city.name}</h3>
          <p className="text-xs text-muted-foreground">{city.country}</p>
        </div>
        <button
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={onClose}
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Current conditions */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <WeatherIcon className="size-10" style={{ color: tempColor }} />
          <div>
            <p className="text-3xl font-bold" style={{ color: tempColor }}>
              {Math.round(city.current.temperature_2m)}°C
            </p>
            <p className="text-sm text-muted-foreground">
              {getWeatherDescription(city.current.weather_code)}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Thermometer className="size-3.5" />
            <span>Feels {Math.round(city.current.apparent_temperature)}°</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Droplets className="size-3.5" />
            <span>{city.current.relative_humidity_2m}%</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Wind className="size-3.5" />
            <span>{Math.round(city.current.wind_speed_10m)} km/h</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Compass className="size-3.5" />
            <span>{Math.round(city.current.wind_direction_10m)}°</span>
          </div>
        </div>
      </div>

      {/* Air Quality */}
      {airQuality && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-semibold text-muted-foreground">Air Quality</h4>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                backgroundColor: getAqiLevel(airQuality.us_aqi).color + "20",
                color: getAqiLevel(airQuality.us_aqi).color,
              }}
            >
              {getAqiLevel(airQuality.us_aqi).label}
            </span>
          </div>
          <div className="mb-3 flex items-baseline gap-2">
            <span
              className="text-2xl font-bold"
              style={{ color: getAqiLevel(airQuality.us_aqi).color }}
            >
              {airQuality.us_aqi}
            </span>
            <span className="text-xs text-muted-foreground">US AQI</span>
          </div>
          {/* AQI bar */}
          <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min((airQuality.us_aqi / 300) * 100, 100)}%`,
                backgroundColor: getAqiLevel(airQuality.us_aqi).color,
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-orange-400" />
              <span>PM2.5: {airQuality.pm2_5.toFixed(1)} µg/m³</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-amber-400" />
              <span>PM10: {airQuality.pm10.toFixed(1)} µg/m³</span>
            </div>
          </div>
        </div>
      )}

      {/* 7-day forecast */}
      {isForecastLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : forecast ? (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground">7-Day Forecast</h4>
          <div className="space-y-1">
            {forecast.daily.time.map((day, idx) => {
              const DayIcon = getWeatherIcon(forecast.daily.weather_code[idx] ?? 0);
              return (
                <div
                  key={day}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-accent/50"
                >
                  <span className="w-8 font-medium">{getDayName(day)}</span>
                  <DayIcon className="size-4" />
                  <div className="flex items-center gap-1">
                    <span
                      className="font-semibold"
                      style={{
                        color: getTemperatureColor(forecast.daily.temperature_2m_max[idx] ?? 0),
                      }}
                    >
                      {Math.round(forecast.daily.temperature_2m_max[idx] ?? 0)}°
                    </span>
                    <span className="text-muted-foreground">
                      {Math.round(forecast.daily.temperature_2m_min[idx] ?? 0)}°
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── Weather Marker ───────────────────────────────────────────────

function WeatherMarker({
  city,
  aqiData,
  isSelected,
  onClick,
}: {
  city: CityWeather;
  aqiData?: AirQualityData;
  isSelected: boolean;
  onClick: () => void;
}) {
  const Icon = getWeatherIcon(city.current.weather_code);
  const tempColor = getTemperatureColor(city.current.temperature_2m);

  return (
    <MapMarker longitude={city.lon} latitude={city.lat}>
      <MarkerContent>
        <button
          className={`flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border border-border/50 bg-background/90 px-2 py-1 shadow-sm backdrop-blur-sm transition-transform hover:scale-110 ${
            isSelected ? "ring-2 ring-primary" : ""
          }`}
          onClick={onClick}
        >
          <div className="flex items-center gap-1">
            <Icon className="size-3.5" />
            <span className="text-xs font-semibold" style={{ color: tempColor }}>
              {Math.round(city.current.temperature_2m)}°
            </span>
          </div>
          {aqiData && (
            <span
              className="rounded-sm px-1 text-[10px] font-medium leading-tight"
              style={{
                backgroundColor: getAqiLevel(aqiData.us_aqi).color + "20",
                color: getAqiLevel(aqiData.us_aqi).color,
              }}
            >
              AQI {aqiData.us_aqi}
            </span>
          )}
        </button>
      </MarkerContent>
    </MapMarker>
  );
}

// ── Main Component ───────────────────────────────────────────────

export function WeatherDashboardCard() {
  const {
    citiesWeather,
    citiesAirQuality,
    selectedCity,
    selectedForecast,
    selectedCityAqi,
    searchResults,
    isLoading,
    isForecastLoading,
    error,
    lastUpdated,
    fetchAllCitiesWeather,
    searchCity,
    selectCity,
    selectSearchResult,
    clearSelection,
  } = useWeatherData();

  const [panelOpen, setPanelOpen] = useState(true);
  const [flyTarget, setFlyTarget] = useState<{ lon: number; lat: number } | null>(null);

  useEffect(() => {
    fetchAllCitiesWeather();
  }, [fetchAllCitiesWeather]);

  function handleMarkerClick(city: CityWeather) {
    selectCity(city);
    setPanelOpen(true);
    setFlyTarget({ lon: city.lon, lat: city.lat });
  }

  function handleSelectResult(result: GeocodingResult) {
    selectSearchResult(result);
    setFlyTarget({ lon: result.longitude, lat: result.latitude });
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Map
        center={[20, 20]}
        zoom={1.5}
        minZoom={1}
        projection={{ type: "globe" }}
      >
        <FlyToHandler target={flyTarget} />

        {citiesWeather.map((city) => (
          <WeatherMarker
            key={city.name}
            city={city}
            aqiData={citiesAirQuality.get(city.name)}
            isSelected={selectedCity?.name === city.name}
            onClick={() => handleMarkerClick(city)}
          />
        ))}
      </Map>

      {/* Loading overlay */}
      {isLoading && citiesWeather.length === 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            <span>Fetching weather data...</span>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted">
          <div className="text-center text-destructive">
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Last updated */}
      {lastUpdated && (
        <div className="absolute bottom-2 right-2 z-10 rounded-sm bg-background/80 px-2 py-1 text-xs text-muted-foreground backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
            <button
              className="hover:text-foreground"
              title="Refresh"
              onClick={fetchAllCitiesWeather}
            >
              <RefreshCw className={`size-3 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      )}

      {/* Legends */}
      <div className="absolute bottom-10 left-2 z-10 flex flex-col gap-2">
        <TemperatureLegend />
        <AqiLegend />
      </div>

      {/* Toggle button */}
      <button
        className={`absolute top-4 left-4 z-10 flex size-9 items-center justify-center rounded-lg border border-border/50 shadow-sm backdrop-blur-sm transition-colors ${
          panelOpen
            ? "bg-background/95 hover:bg-accent"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
        onClick={() => setPanelOpen(!panelOpen)}
      >
        {panelOpen ? (
          <PanelLeftClose className="size-4" />
        ) : (
          <PanelLeftOpen className="size-4" />
        )}
      </button>

      {/* Floating panel */}
      {panelOpen && (
        <div
          className="absolute top-16 left-4 z-10 w-72 max-h-[calc(100%-5rem)] overflow-auto rounded-xl bg-background/95 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-left-5 duration-200"
        >
          {selectedCity ? (
            <CityCard
              city={selectedCity}
              forecast={selectedForecast}
              airQuality={selectedCityAqi}
              isForecastLoading={isForecastLoading}
              onClose={clearSelection}
            />
          ) : (
            <ControlPanel
              searchResults={searchResults}
              onSearch={searchCity}
              onSelectResult={handleSelectResult}
            />
          )}
        </div>
      )}
    </div>
  );
}
