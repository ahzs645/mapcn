"use client";

import { useMemo, useReducer, useState } from "react";
import type { StyleSpecification } from "maplibre-gl";

import { Map, MapControls, MapMarker, MarkerContent } from "@/registry/map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
 * Designer model — ported from the tasmap editable shell
 * ------------------------------------------------------------------------- */

const MARKER_PATHS: Record<string, { path: string; viewBox: string }> = {
  circle_fill: {
    path: "M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z",
    viewBox: "0 0 24 24",
  },
  pin: {
    path: "M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z",
    viewBox: "0 0 24 24",
  },
  flag: {
    path: "M14.4,6L14,4H5V21H7V14H12.6L13,16H20V6H14.4Z",
    viewBox: "0 0 24 24",
  },
};

type MarkerType = keyof typeof MARKER_PATHS;

type DesignerConfig = {
  title: string;
  subTitle: string;
  author: string;
  primaryColor: string;
  backgroundColor: string;
  roadPrimaryColor: string;
  roadSecondaryColor: string;
  marker: {
    type: MarkerType;
    size: number;
    fill: string;
    inset: string;
  };
  enableAutoSave: boolean;
  enableOsmContribution: boolean;
  showFocusArea: boolean;
};

const initialConfig: DesignerConfig = {
  title: "My Map",
  subTitle: "",
  author: "",
  primaryColor: "#09558c",
  backgroundColor: "#f9f7f0",
  roadPrimaryColor: "#d4c5c7",
  roadSecondaryColor: "#e8ddd8",
  marker: {
    type: "circle_fill",
    size: 48,
    fill: "#09558c",
    inset: "#f9f7f0",
  },
  enableAutoSave: true,
  enableOsmContribution: false,
  showFocusArea: true,
};

const capturedTheme = {
  map: {
    water: "#E8F4F8",
    land: "#F7F5F3",
    green: "#E6F2E6",
    primaryRoad: "#D4C5C7",
    secondaryRoad: "#E8DDD8",
    label: "#8B7D7D",
  },
  brand: {
    primary: "#E4B5C0",
    background: "#F9F7F6",
  },
};

type DesignerState = {
  config: DesignerConfig;
  themeApplied: boolean;
  revision: number;
};

type DesignerAction =
  | { type: "config"; field: keyof DesignerConfig; value: unknown }
  | { type: "marker"; field: keyof DesignerConfig["marker"]; value: unknown }
  | { type: "apply-theme" }
  | { type: "reset" };

function reducer(state: DesignerState, action: DesignerAction): DesignerState {
  switch (action.type) {
    case "config":
      return {
        ...state,
        config: { ...state.config, [action.field]: action.value },
        revision: state.revision + 1,
      };
    case "marker": {
      const marker = { ...state.config.marker, [action.field]: action.value };
      const config = { ...state.config, marker };
      if (action.field === "fill") config.primaryColor = action.value as string;
      return { ...state, config, revision: state.revision + 1 };
    }
    case "apply-theme":
      return {
        config: {
          ...state.config,
          primaryColor: capturedTheme.brand.primary,
          backgroundColor: capturedTheme.brand.background,
          roadPrimaryColor: capturedTheme.map.primaryRoad,
          roadSecondaryColor: capturedTheme.map.secondaryRoad,
          marker: {
            ...state.config.marker,
            fill: capturedTheme.brand.primary,
            inset: capturedTheme.brand.background,
          },
        },
        themeApplied: true,
        revision: state.revision + 1,
      };
    case "reset":
      return { config: initialConfig, themeApplied: false, revision: 1 };
  }
}

/* ---------------------------------------------------------------------------
 * Map style — OpenMapTiles schema via OpenFreeMap, recolored from the config
 * ------------------------------------------------------------------------- */

function createDesignerStyle(
  config: DesignerConfig,
  themeApplied: boolean,
): StyleSpecification {
  const colors = {
    land: themeApplied ? capturedTheme.map.land : config.backgroundColor,
    water: themeApplied ? capturedTheme.map.water : "#d8edf7",
    green: themeApplied ? capturedTheme.map.green : "#d5e5d7",
    label: themeApplied ? capturedTheme.map.label : "#5c6269",
  };
  const source = "designer";

  return {
    version: 8,
    name: "Designer",
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {
      [source]: {
        type: "vector",
        url: "https://tiles.openfreemap.org/planet",
        attribution:
          '<a href="https://openfreemap.org">OpenFreeMap</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      },
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": colors.land },
      },
      {
        id: "landcover",
        source,
        "source-layer": "landcover",
        type: "fill",
        paint: {
          "fill-color": [
            "match",
            ["get", "class"],
            ["grass", "wood", "farmland"],
            colors.green,
            colors.land,
          ],
          "fill-opacity": 0.82,
        },
      },
      {
        id: "water",
        source,
        "source-layer": "water",
        type: "fill",
        paint: { "fill-color": colors.water, "fill-opacity": 0.9 },
      },
      {
        id: "road-secondary",
        source,
        "source-layer": "transportation",
        type: "line",
        filter: [
          "in",
          ["get", "class"],
          ["literal", ["secondary", "tertiary", "minor"]],
        ],
        paint: {
          "line-color": config.roadSecondaryColor,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            6,
            0.3,
            10,
            1,
            14,
            2.5,
          ],
        },
      },
      {
        id: "road-primary",
        source,
        "source-layer": "transportation",
        type: "line",
        filter: [
          "in",
          ["get", "class"],
          ["literal", ["motorway", "trunk", "primary"]],
        ],
        paint: {
          "line-color": config.roadPrimaryColor,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            0.5,
            10,
            1.8,
            14,
            4,
          ],
        },
      },
      {
        id: "admin-boundary",
        source,
        "source-layer": "boundary",
        type: "line",
        filter: ["<=", ["get", "admin_level"], 4],
        paint: {
          "line-color": config.primaryColor,
          "line-opacity": 0.42,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            2,
            0.5,
            8,
            1.5,
            12,
            3,
          ],
          "line-dasharray": [2, 1],
        },
      },
      {
        id: "place-labels",
        source,
        "source-layer": "place",
        type: "symbol",
        filter: ["in", ["get", "class"], ["literal", ["city", "town"]]],
        layout: {
          "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
          "text-font": ["Noto Sans Regular"],
          "text-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            2,
            10,
            8,
            15,
            12,
            22,
          ],
          "text-max-width": 8,
        },
        paint: {
          "text-color": colors.label,
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.4,
        },
      },
      {
        id: "water-labels",
        source,
        "source-layer": "water_name",
        type: "symbol",
        layout: {
          "symbol-placement": "line",
          "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
          "text-font": ["Noto Sans Regular"],
          "text-size": 12,
        },
        paint: {
          "text-color": colors.water,
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.4,
        },
      },
    ],
  };
}

/* ---------------------------------------------------------------------------
 * UI
 * ------------------------------------------------------------------------- */

const LAYER_TABS = [
  ["markers", "Markers"],
  ["style", "Style"],
  ["roads", "Roads"],
] as const;

type LayerTab = (typeof LAYER_TABS)[number][0];

const PANEL_TITLES: Record<LayerTab, string> = {
  markers: "Marker and copy",
  style: "Style tokens",
  roads: "Road preview",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
      {label}
      {children}
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="border-input flex items-center gap-2 rounded-md border px-2 py-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <span className="text-muted-foreground font-mono text-xs font-normal uppercase">
          {value}
        </span>
      </div>
    </Field>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-primary size-4"
      />
      {label}
    </label>
  );
}

export default function DesignerPage() {
  const [state, dispatch] = useReducer(reducer, {
    config: initialConfig,
    themeApplied: false,
    revision: 1,
  });
  const [tab, setTab] = useState<LayerTab>("markers");

  const config = state.config;
  const marker = config.marker;
  const markerIcon = MARKER_PATHS[marker.type];

  const mapStyle = useMemo(
    () => createDesignerStyle(config, state.themeApplied),
    [config, state.themeApplied],
  );

  const exportEnvelope = useMemo(
    () => ({
      format: "mapcn-designer-v1",
      revision: state.revision,
      config,
    }),
    [config, state.revision],
  );

  const setConfig = (field: keyof DesignerConfig) => (value: unknown) =>
    dispatch({ type: "config", field, value });
  const setMarker =
    (field: keyof DesignerConfig["marker"]) => (value: unknown) =>
      dispatch({ type: "marker", field, value });

  return (
    <main className="bg-background min-h-screen p-4 sm:p-6">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Map stage */}
        <section className="bg-card flex flex-col gap-4 rounded-lg border p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
                Dev route /dev/designer
              </p>
              <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
                {config.title || "Untitled map"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {config.subTitle || "Editable map designer"}
              </p>
            </div>
            <div
              className="bg-muted flex gap-1 rounded-md p-1"
              role="tablist"
              aria-label="Designer sections"
            >
              {LAYER_TABS.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={cn(
                    "rounded px-3 py-1.5 text-sm transition-colors",
                    tab === id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative aspect-[900/560] overflow-hidden rounded-md border">
            <Map
              center={[121.56, 25.04]}
              zoom={7}
              styles={{ light: mapStyle, dark: mapStyle }}
            >
              <MapMarker longitude={121.56} latitude={25.04} anchor="bottom">
                <MarkerContent>
                  <svg
                    viewBox={markerIcon.viewBox}
                    width={marker.size}
                    height={marker.size}
                    style={{
                      fill: marker.fill,
                      filter: "drop-shadow(0 8px 16px rgba(9, 35, 55, 0.28))",
                    }}
                    aria-hidden="true"
                  >
                    <path d={markerIcon.path} />
                    {marker.type === "circle_fill" && (
                      <circle
                        cx="12"
                        cy="9"
                        r="2.6"
                        style={{ fill: marker.inset }}
                      />
                    )}
                  </svg>
                </MarkerContent>
              </MapMarker>
              <MapControls position="bottom-right" />
            </Map>

            {config.showFocusArea && (
              <div
                className="pointer-events-none absolute top-1/2 left-1/2 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed"
                style={{ borderColor: config.primaryColor }}
              />
            )}

            <div className="bg-card/95 absolute top-4 left-4 z-10 flex flex-col gap-0.5 rounded-md border px-4 py-3 shadow-lg backdrop-blur-sm">
              <strong className="text-sm">
                {config.title || "Untitled map"}
              </strong>
              <span className="text-muted-foreground text-xs">
                {config.author || "Unnamed designer"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              Autosave {config.enableAutoSave ? "on" : "off"}
            </Badge>
            <Badge variant="secondary">
              OSM contribution {config.enableOsmContribution ? "on" : "off"}
            </Badge>
            <Badge variant="secondary">
              Focus area {config.showFocusArea ? "visible" : "hidden"}
            </Badge>
            <Badge variant="secondary">openfreemap vector tiles</Badge>
            <Badge variant="secondary">revision {state.revision}</Badge>
          </div>
        </section>

        {/* Editor panel */}
        <aside
          className="bg-card flex flex-col gap-4 rounded-lg border p-4 sm:p-5"
          aria-label="Designer controls"
        >
          <div>
            <p className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
              Designer controls
            </p>
            <h2 className="mt-1 text-lg font-semibold">{PANEL_TITLES[tab]}</h2>
          </div>

          {tab === "markers" && (
            <>
              <Field label="Title">
                <Input
                  value={config.title}
                  onChange={(e) => setConfig("title")(e.target.value)}
                />
              </Field>
              <Field label="Subtitle">
                <Input
                  value={config.subTitle}
                  onChange={(e) => setConfig("subTitle")(e.target.value)}
                />
              </Field>
              <Field label="Author">
                <Input
                  value={config.author}
                  onChange={(e) => setConfig("author")(e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <ColorField
                  label="Marker fill"
                  value={marker.fill}
                  onChange={setMarker("fill")}
                />
                <ColorField
                  label="Marker inset"
                  value={marker.inset}
                  onChange={setMarker("inset")}
                />
              </div>
              <Field label={`Marker size — ${marker.size}px`}>
                <input
                  type="range"
                  min={24}
                  max={96}
                  value={marker.size}
                  onChange={(e) => setMarker("size")(Number(e.target.value))}
                  className="accent-primary"
                />
              </Field>
              <Field label="Marker type">
                <select
                  value={marker.type}
                  onChange={(e) => setMarker("type")(e.target.value)}
                  className="border-input bg-background h-9 rounded-md border px-3 text-sm font-normal"
                >
                  {Object.keys(MARKER_PATHS).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}

          {tab === "style" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <ColorField
                  label="Primary"
                  value={config.primaryColor}
                  onChange={setConfig("primaryColor")}
                />
                <ColorField
                  label="Background"
                  value={config.backgroundColor}
                  onChange={setConfig("backgroundColor")}
                />
              </div>
              <div className="flex flex-col gap-2.5">
                <Toggle
                  label="Autosave"
                  checked={config.enableAutoSave}
                  onChange={setConfig("enableAutoSave")}
                />
                <Toggle
                  label="OSM contribution"
                  checked={config.enableOsmContribution}
                  onChange={setConfig("enableOsmContribution")}
                />
                <Toggle
                  label="Focus area"
                  checked={config.showFocusArea}
                  onChange={setConfig("showFocusArea")}
                />
              </div>
            </>
          )}

          {tab === "roads" && (
            <div className="grid grid-cols-2 gap-3">
              <ColorField
                label="Primary roads"
                value={config.roadPrimaryColor}
                onChange={setConfig("roadPrimaryColor")}
              />
              <ColorField
                label="Secondary roads"
                value={config.roadSecondaryColor}
                onChange={setConfig("roadSecondaryColor")}
              />
            </div>
          )}

          <div className="mt-2 flex gap-2">
            <Button onClick={() => dispatch({ type: "apply-theme" })}>
              Apply captured theme
            </Button>
            <Button variant="secondary" onClick={() => dispatch({ type: "reset" })}>
              Reset
            </Button>
          </div>

          <Collapsible>
            <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm">
              <ChevronDown className="size-4" />
              Export envelope
            </CollapsibleTrigger>
            <CollapsibleContent>
              <pre className="bg-muted mt-2 max-h-64 overflow-auto rounded-md p-3 text-xs">
                {JSON.stringify(exportEnvelope, null, 2)}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        </aside>
      </div>
    </main>
  );
}
