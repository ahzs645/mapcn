"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  AlertTriangle,
  BarChart2,
  Check,
  CheckCircle,
  ChevronDown,
  Clock,
  CloudOff,
  HelpCircle,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Square,
  Users,
  Waves,
} from "lucide-react";
import { Map as MapCanvas, MapPopup, useMap } from "@/registry/map";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ScatterplotLayer, PolygonLayer } from "@deck.gl/layers";
import type { Layer } from "@deck.gl/core";
import { cn } from "@/lib/utils";
import {
  FLOOD_REGIONS,
  SEVERITY_BADGE_CLASS,
  SEVERITY_BAR_COLORS,
  SEVERITY_FILL,
  SEVERITY_LABELS,
  SEVERITY_LINE,
  SEVERITY_ORDER,
  fetchGaugeForecast,
  fetchGauges,
  fetchFloodStatuses,
  fetchPolygonKml,
  fetchSignificantEvents,
  getSeverityColor,
  getSeverityRadius,
  parseKmlToPolygon,
  type FloodMarker,
  type FloodRegion,
  type GoogleFloodSeverity,
  type GoogleFloodStatus,
  type GoogleGauge,
  type GoogleGaugeForecast,
  type GoogleSignificantEvent,
  type ParsedFloodPolygon,
  type SelectedGauge,
} from "./google-flood-forecasting-data";

const SEVERITY_ICONS: Record<
  GoogleFloodSeverity,
  React.ComponentType<{ className?: string }>
> = {
  FLOOD_SEVERITY_UNSPECIFIED: HelpCircle,
  UNKNOWN: HelpCircle,
  NO_FLOODING: CheckCircle,
  ABOVE_NORMAL: AlertCircle,
  SEVERE: AlertTriangle,
  EXTREME: Waves,
};

function SeverityBadge({
  severity,
  size = "sm",
}: {
  severity: GoogleFloodSeverity;
  size?: "sm" | "md";
}) {
  const Icon = SEVERITY_ICONS[severity] ?? HelpCircle;
  const colorClass = SEVERITY_BADGE_CLASS[severity] ?? SEVERITY_BADGE_CLASS.UNKNOWN;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        colorClass,
        size === "md"
          ? "px-2.5 py-1 text-xs gap-1.5"
          : "px-1.5 py-0.5 text-[10px] gap-1",
      )}
    >
      <Icon className={size === "md" ? "size-3.5" : "size-3"} />
      {SEVERITY_LABELS[severity] ?? "Unknown"}
    </span>
  );
}

interface FloodLayersProps {
  markers: FloodMarker[];
  polygons: ParsedFloodPolygon[];
  onPick: (marker: FloodMarker) => void;
}

function FloodLayers({ markers, polygons, onPick }: FloodLayersProps) {
  const { map, isLoaded } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const markersRef = useRef(markers);
  const polygonsRef = useRef(polygons);
  const onPickRef = useRef(onPick);

  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);
  useEffect(() => {
    polygonsRef.current = polygons;
  }, [polygons]);
  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  const buildLayers = useCallback(() => {
    const layers: Layer[] = [];

    if (polygonsRef.current.length > 0) {
      layers.push(
        new PolygonLayer({
          id: "flood-inundation",
          data: polygonsRef.current,
          getPolygon: (d: ParsedFloodPolygon) => d.coordinates,
          getFillColor: (d: ParsedFloodPolygon) =>
            SEVERITY_FILL[d.severity] ?? SEVERITY_FILL.UNKNOWN,
          getLineColor: (d: ParsedFloodPolygon) =>
            SEVERITY_LINE[d.severity] ?? SEVERITY_LINE.UNKNOWN,
          lineWidthMinPixels: 1,
          opacity: 0.8,
          stroked: true,
          filled: true,
        }),
      );
    }

    if (markersRef.current.length > 0) {
      layers.push(
        new ScatterplotLayer({
          id: "flood-gauges",
          data: markersRef.current,
          getPosition: (d: FloodMarker) => d.coordinates,
          getFillColor: (d: FloodMarker) => getSeverityColor(d.severity),
          getRadius: (d: FloodMarker) => getSeverityRadius(d.severity),
          radiusMinPixels: 5,
          radiusMaxPixels: 30,
          opacity: 0.9,
          pickable: true,
          stroked: true,
          getLineColor: [255, 255, 255, 80],
          lineWidthMinPixels: 1,
          antialiasing: true,
          autoHighlight: true,
          highlightColor: [255, 255, 255, 100],
          onClick: (info) => {
            if (info.object) onPickRef.current(info.object as FloodMarker);
          },
        }),
      );
    }

    return layers;
  }, []);

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;
    const addOverlay = () => {
      overlay = new MapboxOverlay({ layers: buildLayers() });
      overlayRef.current = overlay;
      map.addControl(overlay as unknown as maplibregl.IControl);
    };
    if (map.isStyleLoaded()) addOverlay();
    else map.once("load", addOverlay);

    return () => {
      map.off("load", addOverlay);
      if (overlay) {
        try {
          map.removeControl(overlay as unknown as maplibregl.IControl);
        } catch {}
      }
      overlayRef.current = null;
    };
  }, [map, isLoaded, buildLayers]);

  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.setProps({ layers: buildLayers() });
    }
  }, [markers, polygons, buildLayers]);

  return null;
}

function FlyToRegion({ region }: { region: FloodRegion }) {
  const { map, isLoaded } = useMap();
  useEffect(() => {
    if (!map || !isLoaded) return;
    map.flyTo({ center: region.center, zoom: region.zoom, duration: 1200 });
  }, [map, isLoaded, region]);
  return null;
}

function RegionSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected =
    FLOOD_REGIONS.find((r) => r.code === value) ?? FLOOD_REGIONS[0];

  return (
    <div className="relative px-3 py-2.5">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Region
      </p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-accent"
      >
        <span className="flex items-center gap-2 font-medium text-foreground">
          <MapPin className="size-3.5 text-primary" />
          {selected.name}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="absolute left-3 right-3 top-full z-20 mt-1 max-h-56 overflow-auto rounded-lg border border-border bg-popover shadow-xl">
          {FLOOD_REGIONS.map((r) => (
            <button
              key={r.code}
              type="button"
              onClick={() => {
                onChange(r.code);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent",
                r.code === value
                  ? "text-primary font-medium"
                  : "text-foreground",
              )}
            >
              <span className="font-mono text-[10px] text-muted-foreground">
                {r.code}
              </span>
              {r.name}
              {r.code === value && (
                <Check className="ml-auto size-3 text-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPanel({
  markers,
  loading,
  error,
  lastFetch,
  onRefresh,
}: {
  markers: FloodMarker[];
  loading: boolean;
  error: string | null;
  lastFetch: Date | null;
  onRefresh: () => void;
}) {
  const counts = useMemo(() => {
    const m = new Map<GoogleFloodSeverity, number>();
    for (const x of markers) m.set(x.severity, (m.get(x.severity) ?? 0) + 1);
    return m;
  }, [markers]);

  const active = SEVERITY_ORDER.filter((s) => (counts.get(s) ?? 0) > 0);

  const lastFetchLabel = lastFetch
    ? lastFetch.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Flood Status
        </span>
        <button
          type="button"
          onClick={onRefresh}
          className={cn(
            "flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            loading && "animate-spin",
          )}
        >
          <RefreshCw className="size-3.5" />
        </button>
      </div>
      {loading && markers.length === 0 ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-7 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : error ? (
        <div className="break-all rounded-md bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="mr-1 inline size-3.5" />
          {error}
        </div>
      ) : active.length === 0 ? (
        <div className="py-2 text-center text-xs text-muted-foreground">
          No active flood alerts
        </div>
      ) : (
        <div className="space-y-1.5">
          {active.map((s) => (
            <div key={s} className="flex items-center justify-between">
              <SeverityBadge severity={s} size="sm" />
              <span className="font-mono text-xs font-medium text-foreground">
                {counts.get(s)}
              </span>
            </div>
          ))}
        </div>
      )}
      {lastFetchLabel && (
        <div className="mt-3 border-t border-border pt-2 text-[10px] text-muted-foreground">
          Updated {lastFetchLabel}
        </div>
      )}
    </div>
  );
}

function GaugeForecastChart({
  forecast,
  loading,
  selected,
}: {
  forecast: GoogleGaugeForecast | undefined;
  loading: boolean;
  selected: boolean;
}) {
  const intervals = useMemo(() => {
    if (!forecast?.forecastSummary?.forecastTimeIntervalSummaries) return [];
    return forecast.forecastSummary.forecastTimeIntervalSummaries.map((s) => ({
      severity: s.severity,
      color: SEVERITY_BAR_COLORS[s.severity] ?? "#94a3b8",
      label: new Date(s.forecastInterval.startTime).toLocaleDateString([], {
        month: "short",
        day: "numeric",
      }),
    }));
  }, [forecast]);

  const overallSeverity: GoogleFloodSeverity =
    forecast?.forecastSummary?.severity ?? "NO_FLOODING";

  const forecastIssuedTime = forecast?.issuedTime
    ? new Date(forecast.issuedTime).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  const ranges = forecast?.forecastRanges ?? [];
  const forecastRangeLabel =
    ranges.length >= 2
      ? `${new Date(ranges[0].forecastStartTime).toLocaleDateString([], { month: "short", day: "numeric" })} – ${new Date(
          ranges[ranges.length - 1].forecastEndTime,
        ).toLocaleDateString([], { month: "short", day: "numeric" })}`
      : "";

  return (
    <div className="px-3 py-2.5">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Gauge Forecast
      </p>
      {loading ? (
        <div className="space-y-2">
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-8 flex-1 animate-pulse rounded bg-muted"
              />
            ))}
          </div>
        </div>
      ) : !forecast && selected ? (
        <div className="py-3 text-center text-xs text-muted-foreground">
          <CloudOff className="mx-auto mb-1 size-5 text-muted-foreground/40" />
          <p>No forecast model for this gauge</p>
        </div>
      ) : !forecast ? (
        <div className="py-3 text-center text-xs text-muted-foreground">
          <BarChart2 className="mx-auto mb-1 size-6 text-muted-foreground/40" />
          <p>Select a gauge to view forecast</p>
        </div>
      ) : intervals.length ? (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Overall:</span>
              <SeverityBadge severity={overallSeverity} size="sm" />
            </div>
            {forecastIssuedTime && (
              <span className="text-[10px] text-muted-foreground/60">
                {forecastIssuedTime}
              </span>
            )}
          </div>
          <div className="flex items-end gap-0.5">
            {intervals.map((interval, i) => (
              <div
                key={i}
                className="group relative flex flex-1 flex-col items-center"
              >
                <div
                  className="w-full rounded-t-sm transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: interval.color,
                    height: "28px",
                  }}
                />
                <span className="mt-1 text-[8px] text-muted-foreground">
                  {interval.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-md bg-green-500/10 p-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 shrink-0 text-green-500" />
            <div>
              <p className="text-xs font-medium text-foreground">
                No flooding expected
              </p>
              <p className="text-[10px] text-muted-foreground">
                {forecastRangeLabel}
                {forecastIssuedTime && <> · Updated {forecastIssuedTime}</>}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EventsPanel({
  events,
  loading,
}: {
  events: GoogleSignificantEvent[];
  loading: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const PREVIEW = 4;
  const visible = showAll ? events : events.slice(0, PREVIEW);
  const hasMore = events.length > PREVIEW;

  const formatPopulation = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
        ? `${(n / 1_000).toFixed(0)}K`
        : n.toString();

  const formatArea = (km2: number) =>
    km2 >= 1000 ? `${(km2 / 1000).toFixed(0)}K km²` : `${km2.toFixed(0)} km²`;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });

  return (
    <div className="p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Significant Events
      </p>
      {loading && events.length === 0 ? (
        <div className="space-y-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="py-2 text-center text-xs text-muted-foreground">
          No significant events
        </div>
      ) : (
        <div className="space-y-1.5">
          {visible.map((event, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card/50 p-2"
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <div className="flex flex-wrap gap-1">
                  {event.affectedCountryCodes.slice(0, 3).map((code) => (
                    <span
                      key={code}
                      className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                    >
                      {code}
                    </span>
                  ))}
                  {event.affectedCountryCodes.length > 3 && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      +{event.affectedCountryCodes.length - 3}
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatDate(event.eventInterval.startTime)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>
                  <Users className="mr-0.5 inline size-2.5" />
                  {formatPopulation(event.affectedPopulation)}
                </span>
                <span>
                  <Square className="mr-0.5 inline size-2.5" />
                  {formatArea(event.areaKm2)}
                </span>
              </div>
            </div>
          ))}
          {hasMore && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="w-full py-1 text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {showAll ? "Show less" : `Show ${events.length - PREVIEW} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "";

function GoogleFloodInner({ apiKey }: { apiKey: string }) {
  const [regionCode, setRegionCode] = useState("IN");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [floodStatuses, setFloodStatuses] = useState<GoogleFloodStatus[]>([]);
  const [gaugeMeta, setGaugeMeta] = useState<Map<string, GoogleGauge>>(
    new Map(),
  );
  const [significantEvents, setSignificantEvents] = useState<
    GoogleSignificantEvent[]
  >([]);
  const [polygons, setPolygons] = useState<ParsedFloodPolygon[]>([]);
  const [selectedGauge, setSelectedGauge] = useState<SelectedGauge | null>(
    null,
  );
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const currentRegion =
    FLOOD_REGIONS.find((r) => r.code === regionCode) ?? FLOOD_REGIONS[0];

  const markers = useMemo<FloodMarker[]>(() => {
    return floodStatuses.map((s) => {
      const g = gaugeMeta.get(s.gaugeId);
      return {
        gaugeId: s.gaugeId,
        coordinates: [s.gaugeLocation.longitude, s.gaugeLocation.latitude],
        severity: s.severity,
        stationName: g?.siteName || s.gaugeId,
        riverName: g?.river,
        issuedTime: s.issuedTime,
        hasInundationMap: (s.inundationMapSet?.inundationMaps?.length ?? 0) > 0,
      };
    });
  }, [floodStatuses, gaugeMeta]);

  const refresh = useCallback(
    (code: string, signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      const run = async () => {
        try {
          const [statuses, gauges, events] = await Promise.all([
            fetchFloodStatuses(code, apiKey, signal),
            fetchGauges(code, apiKey, signal).catch(
              () => new Map<string, GoogleGauge>(),
            ),
            fetchSignificantEvents(apiKey, signal),
          ]);
          if (signal?.aborted) return;
          setFloodStatuses(statuses);
          setGaugeMeta(gauges);
          setSignificantEvents(events);
          setLastFetch(new Date());
        } catch (e) {
          if (signal?.aborted) return;
          setError(e instanceof Error ? e.message : "Failed to fetch flood data");
        } finally {
          if (!signal?.aborted) setLoading(false);
        }
      };
      run();
    },
    [apiKey],
  );

  useEffect(() => {
    const controller = new AbortController();
    refresh(regionCode, controller.signal);
    return () => controller.abort();
  }, [regionCode, refresh]);

  const handleSelectGauge = useCallback(
    (marker: FloodMarker) => {
      setPolygons([]);
      setSelectedGauge({
        ...marker,
        forecastLoading: true,
      });

      const status = floodStatuses.find((s) => s.gaugeId === marker.gaugeId);
      const gauge = gaugeMeta.get(marker.gaugeId);
      const hasModel = gauge?.hasModel !== false;

      const controller = new AbortController();
      const signal = controller.signal;

      const loadForecast = hasModel
        ? fetchGaugeForecast(marker.gaugeId, apiKey, signal).catch(() => null)
        : Promise.resolve(null);

      const loadPolygons =
        status && marker.hasInundationMap
          ? (async () => {
              const maps = status.inundationMapSet?.inundationMaps ?? [];
              const results = await Promise.allSettled(
                maps.slice(0, 3).map(async (m) => {
                  const kml = await fetchPolygonKml(
                    m.serializedPolygonId,
                    apiKey,
                    signal,
                  );
                  return parseKmlToPolygon(
                    kml,
                    status.gaugeId,
                    m.severity,
                    m.serializedPolygonId,
                  );
                }),
              );
              const loaded: ParsedFloodPolygon[] = [];
              for (const r of results) {
                if (r.status === "fulfilled" && r.value) loaded.push(r.value);
              }
              if (!signal.aborted) setPolygons(loaded);
            })().catch(() => undefined)
          : Promise.resolve();

      Promise.all([loadForecast, loadPolygons]).then(([forecast]) => {
        if (signal.aborted) return;
        setSelectedGauge((prev) =>
          prev && prev.gaugeId === marker.gaugeId
            ? { ...prev, forecast: forecast ?? undefined, forecastLoading: false }
            : prev,
        );
      });
    },
    [apiKey, floodStatuses, gaugeMeta],
  );

  const handleClosePopup = () => {
    setSelectedGauge(null);
    setPolygons([]);
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <>
      <FlyToRegion region={currentRegion} />
      <FloodLayers
        markers={markers}
        polygons={polygons}
        onPick={handleSelectGauge}
      />

      {selectedGauge && (
        <MapPopup
          longitude={selectedGauge.coordinates[0]}
          latitude={selectedGauge.coordinates[1]}
          onClose={handleClosePopup}
          closeButton
          offset={12}
        >
          <div className="space-y-1 p-1 w-[220px]">
            <SeverityBadge severity={selectedGauge.severity} size="md" />
            <p className="text-sm font-semibold text-popover-foreground">
              {selectedGauge.stationName}
              {selectedGauge.hasInundationMap && (
                <span
                  title="Inundation map loaded"
                  className="ml-1 inline-block size-1.5 rounded-full bg-primary align-middle"
                />
              )}
            </p>
            {selectedGauge.riverName && (
              <p className="text-xs text-muted-foreground">
                <Waves className="mr-1 inline size-3" />
                {selectedGauge.riverName}
              </p>
            )}
            {selectedGauge.stationName !== selectedGauge.gaugeId && (
              <p className="text-[10px] font-mono text-muted-foreground/60">
                {selectedGauge.gaugeId}
              </p>
            )}
            <div className="border-t border-border pt-1 text-[11px] text-muted-foreground">
              <Clock className="mr-1 inline size-3" />
              {formatTime(selectedGauge.issuedTime)}
            </div>
          </div>
        </MapPopup>
      )}

      {loading && markers.length === 0 && (
        <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-lg border border-border/50 bg-background/90 px-4 py-2 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" />
            Loading flood data…
          </div>
        </div>
      )}

      <div className="absolute right-3 top-3 z-10 w-72 max-h-[calc(100%-1.5rem)] overflow-auto rounded-lg border border-border bg-card/95 backdrop-blur-sm shadow-md">
        <div className="border-b border-border px-3 py-2">
          <p className="text-xs font-semibold text-foreground">
            Flood Forecast
          </p>
        </div>
        <RegionSelector
          value={regionCode}
          onChange={(code) => {
            setRegionCode(code);
            setSelectedGauge(null);
            setPolygons([]);
          }}
        />
        <div className="border-t border-border">
          <StatusPanel
            markers={markers}
            loading={loading}
            error={error}
            lastFetch={lastFetch}
            onRefresh={() => refresh(regionCode)}
          />
        </div>
        <div className="border-t border-border">
          <GaugeForecastChart
            forecast={selectedGauge?.forecast}
            loading={selectedGauge?.forecastLoading ?? false}
            selected={!!selectedGauge}
          />
        </div>
        <div className="border-t border-border">
          <EventsPanel events={significantEvents} loading={loading} />
        </div>
      </div>
    </>
  );
}

function MissingKeyMessage() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
      <div className="max-w-md rounded-lg border border-border bg-card/95 p-5 text-sm shadow-lg backdrop-blur-sm">
        <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
          <AlertCircle className="size-4 text-primary" />
          Google API key required
        </div>
        <p className="text-muted-foreground">
          This example fetches live data from the Google Flood Forecasting API.
          Set <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">NEXT_PUBLIC_GOOGLE_API_KEY</code>{" "}
          in your environment to enable it.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Apply for access at{" "}
          <a
            href="https://developers.google.com/flood-forecasting"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            developers.google.com/flood-forecasting
          </a>
          .
        </p>
      </div>
    </div>
  );
}

export function GoogleFloodForecastingCard() {
  const initialRegion = FLOOD_REGIONS.find((r) => r.code === "IN") ?? FLOOD_REGIONS[0];

  return (
    <div className="relative h-full w-full min-h-[300px]">
      <MapCanvas center={initialRegion.center} zoom={initialRegion.zoom}>
        {API_KEY ? <GoogleFloodInner apiKey={API_KEY} /> : null}
      </MapCanvas>
      {!API_KEY && <MissingKeyMessage />}
    </div>
  );
}
