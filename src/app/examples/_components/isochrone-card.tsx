"use client";

import { useEffect, useState, useCallback, useId, useMemo } from "react";
import { Map, MapMarker, MarkerContent, useMap } from "@/registry/map";
import { Car, Bike, Footprints, Clock, Ruler, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type TransportMode = "auto" | "bicycle" | "pedestrian";
type MetricType = "time" | "distance";

interface IsochroneFeature {
  type: "Feature";
  properties: { color: string; contour?: number; metric?: string; [k: string]: unknown };
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

interface IsochroneData {
  type: "FeatureCollection";
  features: IsochroneFeature[];
}

const TIME_CONTOURS = [
  { time: 5, color: "dc2626", label: "5 min", hex: "#dc2626" },
  { time: 10, color: "2563eb", label: "10 min", hex: "#2563eb" },
  { time: 15, color: "16a34a", label: "15 min", hex: "#16a34a" },
];

const DISTANCE_CONTOURS = [
  { distance: 2, color: "dc2626", label: "2 km", hex: "#dc2626" },
  { distance: 5, color: "2563eb", label: "5 km", hex: "#2563eb" },
  { distance: 10, color: "16a34a", label: "10 km", hex: "#16a34a" },
];

const SAMPLE_ORIGIN: [number, number] = [-96.797, 32.777];
const SAMPLE_DATA_URL = "/examples/isochrone/dallas-auto-time.geojson";

const MODE_SCALE: Record<TransportMode, number> = {
  auto: 1,
  bicycle: 0.45,
  pedestrian: 0.18,
};

const MODES: { value: TransportMode; label: string; Icon: typeof Car }[] = [
  { value: "auto", label: "Car", Icon: Car },
  { value: "bicycle", label: "Bike", Icon: Bike },
  { value: "pedestrian", label: "Walk", Icon: Footprints },
];

function IsochroneLayer({
  data,
  fillOpacity = 0.78,
}: {
  data: IsochroneData;
  fillOpacity?: number;
}) {
  const { map, isLoaded } = useMap();
  const idBase = useId();
  const sourceId = `iso-src-${idBase}`;

  useEffect(() => {
    if (!map || !isLoaded) return;

    const processed: IsochroneData = {
      type: "FeatureCollection",
      features: data.features.map((feature) => {
        const contourValue =
          typeof feature.properties.contour === "number"
            ? feature.properties.contour
            : 0;

        return {
          ...feature,
          properties: {
            ...feature.properties,
            contourValue,
            fillColor: feature.properties.color.startsWith("#")
              ? feature.properties.color
              : `#${feature.properties.color}`,
          },
        };
      }),
    };

    const contourValues = Array.from(
      new Set(
        processed.features
          .map((feature) => feature.properties.contourValue)
          .filter((value): value is number => typeof value === "number"),
      ),
    ).sort((a, b) => b - a);

    const removeIsochroneLayers = () => {
      for (const contourValue of contourValues) {
        const fillId = `iso-fill-${idBase}-${contourValue}`;
        const lineId = `iso-line-${idBase}-${contourValue}`;

        if (map.getLayer(lineId)) map.removeLayer(lineId);
        if (map.getLayer(fillId)) map.removeLayer(fillId);
      }
    };

    const add = () => {
      try {
        if (map.getSource(sourceId)) {
          removeIsochroneLayers();
          (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(
            processed as unknown as GeoJSON.GeoJSON
          );
        } else {
          map.addSource(sourceId, {
            type: "geojson",
            data: processed as unknown as GeoJSON.GeoJSON,
          });
        }

        for (const contourValue of contourValues) {
          const fillId = `iso-fill-${idBase}-${contourValue}`;
          const lineId = `iso-line-${idBase}-${contourValue}`;
          const filter: maplibregl.FilterSpecification = [
            "==",
            ["get", "contourValue"],
            contourValue,
          ];

          map.addLayer({
            id: fillId,
            type: "fill",
            source: sourceId,
            filter,
            paint: {
              "fill-color": ["get", "fillColor"],
              "fill-opacity": fillOpacity,
            },
          });

          map.addLayer({
            id: lineId,
            type: "line",
            source: sourceId,
            filter,
            paint: {
              "line-color": ["get", "fillColor"],
              "line-width": 1.5,
              "line-opacity": 0.75,
            },
          });
        }
      } catch {}
    };

    if (map.isStyleLoaded()) add();
    else map.once("load", add);

    return () => {
      try {
        removeIsochroneLayers();
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, data]);

  return null;
}

function IsochroneControls({
  metric,
  mode,
  loading,
  contours,
  onMetricChange,
  onModeChange,
}: {
  metric: MetricType;
  mode: TransportMode;
  loading: boolean;
  contours: { label: string; hex: string }[];
  onMetricChange: (m: MetricType) => void;
  onModeChange: (m: TransportMode) => void;
}) {
  return (
    <div className="absolute top-2 left-2 z-10 w-48 rounded-lg bg-background/90 backdrop-blur-sm border border-border/50 p-3 shadow-md text-xs">
      <div className="mb-2">
        <div className="font-medium mb-1.5 text-foreground">Metric</div>
        <div className="flex gap-1">
          {([
            { value: "time" as const, Icon: Clock, label: "Time" },
            { value: "distance" as const, Icon: Ruler, label: "Dist" },
          ]).map(({ value, Icon, label }) => (
            <button
              key={value}
              disabled={loading}
              onClick={() => onMetricChange(value)}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 transition-colors cursor-pointer",
                metric === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
            >
              <Icon className="size-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-2">
        <div className="font-medium mb-1.5 text-foreground">Transport</div>
        <div className="flex gap-1">
          {MODES.map(({ value, Icon, label }) => (
            <button
              key={value}
              disabled={loading}
              onClick={() => onModeChange(value)}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 transition-colors cursor-pointer",
                mode === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
            >
              <Icon className="size-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-border/30 pt-2">
        <div className="font-medium mb-1 text-foreground">
          {metric === "time" ? "Travel Time" : "Distance"}
        </div>
        <div className="flex flex-col gap-0.5">
          {contours.map((c) => (
            <div key={c.label} className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: c.hex }}
              />
              <span className="text-muted-foreground">{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-1.5 mt-2 text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Loading...
        </div>
      )}

      <p className="mt-2 text-[10px] text-muted-foreground leading-tight">
        Drag marker to change origin
      </p>
    </div>
  );
}

function IsochroneMapContent() {
  const [origin, setOrigin] = useState<[number, number]>(SAMPLE_ORIGIN);
  const [sampleData, setSampleData] = useState<IsochroneData | null>(null);
  const [metric, setMetric] = useState<MetricType>("time");
  const [mode, setMode] = useState<TransportMode>("auto");
  const [loading, setLoading] = useState(false);

  const contours =
    metric === "time"
      ? TIME_CONTOURS.map((c) => ({ label: c.label, hex: c.hex }))
      : DISTANCE_CONTOURS.map((c) => ({ label: c.label, hex: c.hex }));

  useEffect(() => {
    let ignore = false;

    async function loadSampleData() {
      setLoading(true);

      try {
        const res = await fetch(SAMPLE_DATA_URL);
        if (!res.ok) throw new Error(`Sample data error: ${res.status}`);
        const json = (await res.json()) as IsochroneData;
        if (!ignore) setSampleData(json);
      } catch (e) {
        if (e instanceof Error) {
          console.error("Isochrone sample data error:", e);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadSampleData();

    return () => {
      ignore = true;
    };
  }, []);

  const data = useMemo(() => {
    if (!sampleData) return null;
    return transformIsochroneData(sampleData, origin, metric, mode);
  }, [sampleData, origin, metric, mode]);

  const handleDragEnd = useCallback((lngLat: { lng: number; lat: number }) => {
    setOrigin([lngLat.lng, lngLat.lat]);
  }, []);

  return (
    <>
      {data && <IsochroneLayer data={data} fillOpacity={0.7} />}
      <MapMarker
        longitude={origin[0]}
        latitude={origin[1]}
        draggable
        onDragEnd={handleDragEnd}
      >
        <MarkerContent>
          <div className="size-4 rounded-full bg-red-500 border-2 border-white shadow-lg" />
        </MarkerContent>
      </MapMarker>
      <IsochroneControls
        metric={metric}
        mode={mode}
        loading={loading}
        contours={contours}
        onMetricChange={setMetric}
        onModeChange={setMode}
      />
    </>
  );
}

export function IsochroneCard() {
  return (
    <div className="h-full w-full relative">
      <Map center={SAMPLE_ORIGIN} zoom={10}>
        <IsochroneMapContent />
      </Map>
    </div>
  );
}

function transformIsochroneData(
  data: IsochroneData,
  origin: [number, number],
  metric: MetricType,
  mode: TransportMode,
): IsochroneData {
  const contourConfig = metric === "time" ? TIME_CONTOURS : DISTANCE_CONTOURS;
  const scale = metric === "time" ? MODE_SCALE[mode] : 1;
  const sortedFeatures = [...data.features].sort(
    (a, b) => (a.properties.contour ?? 0) - (b.properties.contour ?? 0),
  );

  return {
    type: "FeatureCollection",
    features: sortedFeatures.map((feature, index) => {
      const contour = contourConfig[index] ?? contourConfig[contourConfig.length - 1];
      const contourValue =
        "time" in contour ? contour.time : contour.distance;

      return {
        ...feature,
        properties: {
          ...feature.properties,
          color: contour.color,
          contour: contourValue,
          metric,
        },
        geometry: transformGeometry(feature.geometry, origin, scale),
      };
    }),
  };
}

function transformGeometry(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  origin: [number, number],
  scale: number,
): GeoJSON.Polygon | GeoJSON.MultiPolygon {
  if (geometry.type === "Polygon") {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map((ring) =>
        ring.map((coordinate) => transformCoordinate(coordinate, origin, scale)),
      ),
    };
  }

  return {
    ...geometry,
    coordinates: geometry.coordinates.map((polygon) =>
      polygon.map((ring) =>
        ring.map((coordinate) => transformCoordinate(coordinate, origin, scale)),
      ),
    ),
  };
}

function transformCoordinate(
  coordinate: GeoJSON.Position,
  origin: [number, number],
  scale: number,
): GeoJSON.Position {
  const [lng, lat, ...rest] = coordinate;

  return [
    origin[0] + (lng - SAMPLE_ORIGIN[0]) * scale,
    origin[1] + (lat - SAMPLE_ORIGIN[1]) * scale,
    ...rest,
  ];
}
