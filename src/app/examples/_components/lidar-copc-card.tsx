"use client";

import { useEffect, useMemo, useState } from "react";
import { Map, useMap } from "@/registry/map";
import { MapGradientLegendItem, MapLegend, MapOverlay } from "@/registry/map-ui";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { PointCloudLayer } from "@deck.gl/layers";
import { Upload } from "lucide-react";

interface PointData {
  position: [number, number, number];
  color: [number, number, number, number];
  normal: [number, number, number];
  intensity: number;
  classification: number;
  rgb: [number, number, number];
}

type ColorBy = "elevation" | "intensity" | "classification" | "rgb";
type RangeMode = "percentile" | "absolute";

const DATA: PointData[] = (() => {
  const points: PointData[] = [];
  const cx = -123.075,
    cy = 44.05;
  for (let i = 0; i < 50; i++) {
    for (let j = 0; j < 50; j++) {
      const x = cx + (i - 25) * 0.0002;
      const y = cy + (j - 25) * 0.0002;
      const z =
        Math.sin(i * 0.3) * Math.cos(j * 0.3) * 50 +
        50 +
        Math.random() * 10;
      const t = z / 120;
      const classification =
        j < 6 ? 9 : z > 85 ? 5 : i > 18 && i < 32 && j > 12 && j < 28 ? 6 : 2;
      points.push({
        position: [x, y, z],
        color: [
          Math.floor(68 + t * 187),
          Math.floor(1 + t * 148 + (1 - t) * 100),
          Math.floor(84 + (1 - t) * 171),
          255,
        ],
        normal: [0, 0, 1],
        intensity: Math.round(40 + t * 210),
        classification,
        rgb: [
          Math.floor(90 + t * 120),
          Math.floor(130 + (1 - t) * 80),
          Math.floor(120 + (1 - t) * 100),
        ],
      });
    }
  }
  return points;
})();

const elevationValues = DATA.map((point) => point.position[2]);
const minElevation = Math.floor(Math.min(...elevationValues));
const maxElevation = Math.ceil(Math.max(...elevationValues));
const elevationColors = ["#440154", "#31688e", "#35b779", "#fde725"];

const colormaps = [
  "Viridis",
  "Plasma",
  "Inferno",
  "Magma",
  "Cividis",
  "Turbo",
  "Jet",
  "Rainbow",
  "Terrain",
  "Cool-Warm",
  "Grayscale",
];

const classificationItems = [
  { id: 0, label: "Never Classified", color: [128, 128, 128] },
  { id: 2, label: "Ground", color: [165, 113, 78] },
  { id: 5, label: "High Vegetation", color: [0, 100, 0] },
  { id: 6, label: "Building", color: [255, 165, 0] },
  { id: 9, label: "Water", color: [0, 0, 255] },
  { id: 15, label: "Transmission Tower", color: [200, 200, 0] },
  { id: 17, label: "Bridge Deck", color: [0, 128, 255] },
  { id: 19, label: "Class 19", color: [128, 128, 128] },
  { id: 64, label: "Class 64", color: [128, 128, 128] },
  { id: 65, label: "Class 65", color: [128, 128, 128] },
  { id: 66, label: "Class 66", color: [128, 128, 128] },
  { id: 68, label: "Class 68", color: [128, 128, 128] },
  { id: 73, label: "Class 73", color: [128, 128, 128] },
  { id: 76, label: "Class 76", color: [128, 128, 128] },
  { id: 77, label: "Class 77", color: [128, 128, 128] },
];

const allClassificationIds = classificationItems.map((item) => item.id);

const colormapColors: Record<string, string[]> = {
  Viridis: ["#440154", "#31688e", "#35b779", "#fde725"],
  Plasma: ["#0d0887", "#9c179e", "#ed7953", "#f0f921"],
  Inferno: ["#000004", "#781c6d", "#ed6925", "#fcffa4"],
  Magma: ["#000004", "#721f81", "#f1605d", "#fcfdbf"],
  Cividis: ["#00204c", "#575d6d", "#a59c74", "#ffea46"],
  Turbo: ["#30123b", "#28bceb", "#a4fc3c", "#f05b12"],
  Jet: ["#00007f", "#007fff", "#ffff00", "#7f0000"],
  Rainbow: ["#6e40aa", "#1ac7c2", "#aff05b", "#ff5e63"],
  Terrain: ["#006837", "#a6d96a", "#ffffbf", "#8c510a"],
  "Cool-Warm": ["#3b4cc0", "#8db0fe", "#f4987a", "#b40426"],
  Grayscale: ["#111111", "#666666", "#bbbbbb", "#ffffff"],
};

type LidarSettings = {
  colorBy: ColorBy;
  colormap: string;
  rangeMode: RangeMode;
  rangePercentMin: number;
  rangePercentMax: number;
  rangeAbsMin: number;
  rangeAbsMax: number;
  pointSize: number;
  opacity: number;
  pickable: boolean;
  elevationFilter: boolean;
  zOffset: boolean;
  zOffsetValue: number;
  visibleClasses: Set<number>;
};

function getRangeBounds(settings: LidarSettings) {
  if (settings.rangeMode === "absolute") {
    return {
      min: settings.rangeAbsMin,
      max: Math.max(settings.rangeAbsMin + 1, settings.rangeAbsMax),
      label: `${settings.rangeAbsMin} - ${settings.rangeAbsMax}`,
    };
  }

  const span = maxElevation - minElevation;
  const min = minElevation + span * (settings.rangePercentMin / 100);
  const max = minElevation + span * (settings.rangePercentMax / 100);

  return {
    min,
    max: Math.max(min + 1, max),
    label: `${settings.rangePercentMin}% - ${settings.rangePercentMax}%`,
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function interpolateRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function colorRamp(value: number, colors: string[]): [number, number, number] {
  const t = Math.max(0, Math.min(1, value));
  const scaled = t * (colors.length - 1);
  const index = Math.min(colors.length - 2, Math.floor(scaled));
  const localT = scaled - index;
  return interpolateRgb(hexToRgb(colors[index]), hexToRgb(colors[index + 1]), localT);
}

function classificationColor(classification: number): [number, number, number] {
  const item = classificationItems.find((entry) => entry.id === classification);
  return (item?.color ?? [128, 128, 128]) as [number, number, number];
}

function RangeSliderGroup({
  min,
  max,
  step = 1,
  lower,
  upper,
  onLowerChange,
  onUpperChange,
}: {
  min: number;
  max: number;
  step?: number;
  lower: number;
  upper: number;
  onLowerChange: (value: number) => void;
  onUpperChange: (value: number) => void;
}) {
  const span = Math.max(step, max - min);
  const lowerPercent = ((lower - min) / span) * 100;
  const upperPercent = ((upper - min) / span) * 100;

  return (
    <div className="space-y-2">
      <div className="text-muted-foreground flex items-center justify-between text-[10px]">
        <span>Min {lower}</span>
        <span>Max {upper}</span>
      </div>
      <div className="relative h-5">
        <div className="absolute inset-x-0 top-2 h-1 rounded-full bg-muted" />
        <div
          className="absolute top-2 h-1 rounded-full bg-teal-600"
          style={{
            left: `${lowerPercent}%`,
            width: `${Math.max(0, upperPercent - lowerPercent)}%`,
          }}
        />
        <input
          type="range"
          aria-label="Minimum color range"
          min={min}
          max={max}
          step={step}
          value={lower}
          onChange={(event) =>
            onLowerChange(Math.min(Number(event.target.value), upper - step))
          }
          className="pointer-events-none absolute inset-x-0 top-0 z-20 h-5 w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:bg-teal-600 [&::-moz-range-thumb]:shadow [&::-webkit-slider-runnable-track]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:bg-teal-600 [&::-webkit-slider-thumb]:shadow"
        />
        <input
          type="range"
          aria-label="Maximum color range"
          min={min}
          max={max}
          step={step}
          value={upper}
          onChange={(event) =>
            onUpperChange(Math.max(Number(event.target.value), lower + step))
          }
          className="pointer-events-none absolute inset-x-0 top-0 z-30 h-5 w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:bg-teal-600 [&::-moz-range-thumb]:shadow [&::-webkit-slider-runnable-track]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:bg-teal-600 [&::-webkit-slider-thumb]:shadow"
        />
      </div>
    </div>
  );
}

function ClassificationLegend({
  visibleClasses,
  onVisibleClassesChange,
}: {
  visibleClasses: Set<number>;
  onVisibleClassesChange: (classes: Set<number>) => void;
}) {
  const setAllVisible = (visible: boolean) => {
    onVisibleClassesChange(new Set(visible ? allClassificationIds : []));
  };

  const toggleClass = (id: number, checked: boolean) => {
    const next = new Set(visibleClasses);
    if (checked) next.add(id);
    else next.delete(id);
    onVisibleClassesChange(next);
  };

  return (
    <div className="rounded-md border p-2">
      <div className="mb-2 flex justify-end gap-1.5">
        <button
          type="button"
          className="rounded border px-2 py-1 text-[10px]"
          onClick={() => setAllVisible(true)}
        >
          Show All
        </button>
        <button
          type="button"
          className="rounded border px-2 py-1 text-[10px]"
          onClick={() => setAllVisible(false)}
        >
          Hide All
        </button>
      </div>
      <div className="max-h-48 space-y-1 overflow-auto">
        {classificationItems.map((item) => (
          <label key={item.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={visibleClasses.has(item.id)}
              onChange={(event) => toggleClass(item.id, event.target.checked)}
            />
            <span
              className="size-2.5 rounded-sm border"
              style={{ backgroundColor: `rgb(${item.color.join(", ")})` }}
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function LidarControlPanel({
  settings,
  onSettingsChange,
}: {
  settings: LidarSettings;
  onSettingsChange: (settings: LidarSettings) => void;
}) {
  const updateSettings = (next: Partial<LidarSettings>) => {
    onSettingsChange({ ...settings, ...next });
  };

  const {
    colorBy,
    colormap,
    rangeMode,
    rangePercentMin,
    rangePercentMax,
    rangeAbsMin,
    rangeAbsMax,
    pointSize,
    opacity,
    pickable,
    elevationFilter,
    zOffset,
    zOffsetValue,
    visibleClasses,
  } = settings;
  const activeRange = getRangeBounds(settings);
  const showColorRamp = colorBy !== "classification" && colorBy !== "rgb";
  const showClassification = colorBy === "classification";

  return (
    <MapOverlay
      position="top-right"
      className="top-14 w-[min(365px,calc(100%-1.5rem))] overflow-hidden p-0"
    >
      <div className="flex items-center justify-between border-b px-3 py-2">
        <p className="text-xs font-semibold">LiDAR Viewer</p>
        <button
          type="button"
          aria-label="Close panel"
          className="text-muted-foreground hover:text-foreground text-lg leading-none"
        >
          x
        </button>
      </div>

      <div className="max-h-[500px] space-y-4 overflow-auto p-3 text-xs">
        <section className="space-y-2">
          <div className="border-border/70 bg-muted/40 flex flex-col items-center gap-2 rounded-md border border-dashed p-4 text-center text-muted-foreground">
            <Upload className="size-5" />
            <span>Drop LAS/LAZ file here or click to browse</span>
          </div>
          <label className="space-y-1">
            <span className="font-medium">Load COPC or EPT from URL</span>
            <div className="flex gap-2">
              <input
                readOnly
                value="https://s3.amazonaws.com/hobu-lidar/autzen-classified.copc.laz"
                className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1.5 text-[11px]"
              />
              <button
                type="button"
                className="rounded-md bg-primary px-2.5 py-1.5 text-primary-foreground"
              >
                Load
              </button>
            </div>
          </label>
        </section>

        <section className="space-y-3 border-t pt-3">
          <p className="font-semibold">Styling</p>
          <label className="space-y-1">
            <span className="font-medium">Color By</span>
            <select
              value={colorBy}
              onChange={(event) =>
                updateSettings({ colorBy: event.target.value as ColorBy })
              }
              className="w-full rounded-md border bg-background px-2 py-1.5"
            >
              <option value="elevation">Elevation</option>
              <option value="intensity">Intensity</option>
              <option value="classification">Classification</option>
              <option value="rgb">RGB (if available)</option>
            </select>
          </label>

          {showColorRamp ? (
            <>
              <label className="space-y-1">
                <span className="font-medium">Colormap</span>
                <select
                  value={colormap}
                  onChange={(event) => updateSettings({ colormap: event.target.value })}
                  className="w-full rounded-md border bg-background px-2 py-1.5"
                >
                  {colormaps.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="space-y-1">
                <div
                  className="h-3.5 rounded-sm border"
                  style={{
                    background: `linear-gradient(to right, ${(colormapColors[colormap] ?? elevationColors).join(", ")})`,
                  }}
                />
                <div className="text-muted-foreground flex justify-between text-[10px]">
                  <span>123.8</span>
                  <span>187.5</span>
                </div>
              </div>
            </>
          ) : null}

          {showClassification ? (
            <ClassificationLegend
              visibleClasses={visibleClasses}
              onVisibleClassesChange={(classes) =>
                updateSettings({ visibleClasses: classes })
              }
            />
          ) : null}

          <div className="space-y-2 rounded-md border p-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Color Range</span>
              <button
                type="button"
                title="Reset to default (2-98% percentile)"
                onClick={() =>
                  updateSettings({
                    rangeMode: "percentile",
                    rangePercentMin: 2,
                    rangePercentMax: 98,
                    rangeAbsMin: minElevation,
                    rangeAbsMax: maxElevation,
                  })
                }
                className="text-muted-foreground underline-offset-2 hover:underline"
              >
                Reset
              </button>
            </div>
            <div className="flex gap-3 text-muted-foreground">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="lidar-range-mode"
                  value="percentile"
                  checked={rangeMode === "percentile"}
                  onChange={(event) =>
                    updateSettings({ rangeMode: event.target.value as RangeMode })
                  }
                />
                Percentile
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="lidar-range-mode"
                  value="absolute"
                  checked={rangeMode === "absolute"}
                  onChange={(event) =>
                    updateSettings({ rangeMode: event.target.value as RangeMode })
                  }
                />
                Absolute
              </label>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>{activeRange.label}</span>
            </div>
            {rangeMode === "percentile" ? (
              <RangeSliderGroup
                min={0}
                max={100}
                lower={rangePercentMin}
                upper={rangePercentMax}
                onLowerChange={(value) =>
                  updateSettings({ rangePercentMin: value })
                }
                onUpperChange={(value) =>
                  updateSettings({ rangePercentMax: value })
                }
              />
            ) : (
              <RangeSliderGroup
                min={minElevation}
                max={maxElevation}
                lower={rangeAbsMin}
                upper={rangeAbsMax}
                onLowerChange={(value) =>
                  updateSettings({ rangeAbsMin: value })
                }
                onUpperChange={(value) =>
                  updateSettings({ rangeAbsMax: value })
                }
              />
            )}
          </div>
          <label className="space-y-1">
            <span className="flex items-center justify-between">
              <span className="font-medium">Point Size</span>
              <span className="text-muted-foreground">{pointSize.toFixed(1)}</span>
            </span>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={pointSize}
              onChange={(event) =>
                updateSettings({ pointSize: Number(event.target.value) })
              }
              className="w-full"
            />
          </label>
          <label className="space-y-1">
            <span className="flex items-center justify-between">
              <span className="font-medium">Opacity</span>
              <span className="text-muted-foreground">{opacity.toFixed(2)}</span>
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(event) =>
                updateSettings({ opacity: Number(event.target.value) })
              }
              className="w-full"
            />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" />
            3D Terrain
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={pickable}
              onChange={(event) => updateSettings({ pickable: event.target.checked })}
            />
            Enable point picking
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={elevationFilter}
                onChange={(event) =>
                  updateSettings({ elevationFilter: event.target.checked })
                }
              />
              Elevation Filter
            </label>
            {elevationFilter ? (
              <div className="rounded-md border p-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Range (m)</span>
                  <span>{Math.round(activeRange.min)} - {Math.round(activeRange.max)}</span>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Uses the active color range above.
                </p>
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={zOffset}
                onChange={(event) => updateSettings({ zOffset: event.target.checked })}
              />
              Z Offset
            </label>
            {zOffset ? (
              <label className="space-y-1">
                  <span className="flex items-center justify-between">
                    <span className="text-muted-foreground">Offset (m)</span>
                  <span className="text-muted-foreground">{zOffsetValue}</span>
                </span>
                <input
                  type="range"
                  min="-224"
                  max="-24"
                  step="1"
                  value={zOffsetValue}
                  onChange={(event) =>
                    updateSettings({ zOffsetValue: Number(event.target.value) })
                  }
                  className="w-full"
                />
              </label>
            ) : null}
          </div>
        </section>

        <section className="space-y-2 border-t pt-3">
          <p className="font-semibold">Loaded Point Clouds</p>
          <div className="rounded-md border p-2">
            <p className="font-medium">autzen-classified.copc.laz</p>
            <p className="text-muted-foreground">Sample COPC point cloud</p>
            <div className="mt-2 flex gap-1.5">
              <button type="button" className="rounded border px-2 py-1">Info</button>
              <button type="button" className="rounded border px-2 py-1">Zoom</button>
              <button type="button" className="rounded border px-2 py-1 text-destructive">Remove</button>
            </div>
          </div>
        </section>
      </div>
    </MapOverlay>
  );
}

function CopcOverlay({ settings }: { settings: LidarSettings }) {
  const { map, isLoaded } = useMap();
  const renderedData = useMemo(() => {
    const { min: rangeMin, max: rangeMax } = getRangeBounds(settings);
    const colors = colormapColors[settings.colormap] ?? elevationColors;

    return DATA.filter((point) => {
      if (
        settings.colorBy === "classification" &&
        !settings.visibleClasses.has(point.classification)
      ) {
        return false;
      }

      if (
        settings.elevationFilter &&
        (point.position[2] < rangeMin || point.position[2] > rangeMax)
      ) {
        return false;
      }

      return true;
    }).map((point) => {
      const z = point.position[2];
      const value =
        settings.colorBy === "intensity"
          ? point.intensity / 255
          : (z - rangeMin) / Math.max(1, rangeMax - rangeMin);

      const color =
        settings.colorBy === "classification"
          ? classificationColor(point.classification)
          : settings.colorBy === "rgb"
            ? point.rgb
            : colorRamp(value, colors);

      return {
        ...point,
        position: [
          point.position[0],
          point.position[1],
          settings.zOffset ? point.position[2] + settings.zOffsetValue : point.position[2],
        ] as [number, number, number],
        color: [
          color[0],
          color[1],
          color[2],
          Math.round(settings.opacity * 255),
        ] as [number, number, number, number],
      };
    });
  }, [settings]);

  useEffect(() => {
    if (!map || !isLoaded) return;

    let overlay: MapboxOverlay | null = null;

    const addOverlay = () => {
      overlay = new MapboxOverlay({
        layers: [
          new PointCloudLayer<PointData>({
            id: "copc-layer",
            data: renderedData,
            getPosition: (d) => d.position,
            getColor: (d) => d.color,
            getNormal: (d) => d.normal,
            pointSize: settings.pointSize,
            sizeUnits: "pixels",
            pickable: settings.pickable,
          }),
        ],
      });
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
    };
  }, [map, isLoaded, renderedData, settings.pickable, settings.pointSize]);

  return null;
}

export function LidarCopcCard() {
  const [settings, setSettings] = useState<LidarSettings>({
    colorBy: "elevation",
    colormap: "Viridis",
    rangeMode: "percentile",
    rangePercentMin: 2,
    rangePercentMax: 98,
    rangeAbsMin: minElevation,
    rangeAbsMax: maxElevation,
    pointSize: 2,
    opacity: 1,
    pickable: true,
    elevationFilter: false,
    zOffset: true,
    zOffsetValue: -124,
    visibleClasses: new Set(allClassificationIds),
  });

  return (
    <div className="h-full w-full">
      <Map center={[-123.075, 44.05]} zoom={14} pitch={60} theme="dark">
        <CopcOverlay settings={settings} />
        <MapLegend title="Elevation" position="bottom-left" collapsible>
          <MapGradientLegendItem
            colors={colormapColors[settings.colormap] ?? elevationColors}
            minLabel="Low"
            maxLabel="High"
          />
        </MapLegend>
        <LidarControlPanel
          settings={settings}
          onSettingsChange={setSettings}
        />
      </Map>
    </div>
  );
}
