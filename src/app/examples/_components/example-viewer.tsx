"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  examples,
  categories,
  getExampleBySlug,
  getAdjacentExamples,
  type ExampleMeta,
} from "../_data/examples";

// ── Component map (static imports) ────────────────────────────────
import { BasicMapCard } from "./basic-map-card";
import { MarkersCard } from "./markers-card";
import { RouteCard } from "./route-card";
import { ClusterCard } from "./cluster-card";
import { GeoJsonCard } from "./geojson-card";
import { ChoroplethExample } from "./choropleth-example";
import { HeatmapCard } from "./heatmap-card";
import { BuildingsCard } from "./buildings-card";
import { RasterCard } from "./raster-card";
import { ImageCard } from "./image-card";
import { VideoCard } from "./video-card";
import { InterpolateHeatmapCard } from "./interpolate-heatmap-card";
import { LegendCard } from "./legend-card";
import { LayerControlCard } from "./layer-control-card";
import { ProximityCard } from "./proximity-card";
import { MapCompareCard } from "./map-compare-card";
import { StyleSwitcherExample } from "./style-switcher-example";
import { PitchBearingExample } from "./pitch-bearing-example";
import { IsochroneCard } from "./isochrone-card";
import { TripPlannerCard } from "./trip-planner-card";
import { DroneFlightCard } from "./drone-flight-card";
import { FlyToExample } from "./flyto-example";
import { GlobeExample } from "./globe-example";
import { AnimatedRouteExample } from "./animated-route-example";
import { EarthquakeGlobeCard } from "./earthquake-globe-card";
import { WeatherCard } from "./weather-card";
import { WeatherDashboardCard } from "./weather-dashboard-card";
import { DeckglScatterplotCard } from "./deckgl-scatterplot-card";
import { DeckglArcCard } from "./deckgl-arc-card";
import { DeckglHexagonCard } from "./deckgl-hexagon-card";
import { DeckglTripsCard } from "./deckgl-trips-card";
import { DeckglHeatmapCard } from "./deckgl-heatmap-card";
import { DeckglGeoJsonCard } from "./deckgl-geojson-card";
import { DeckglColumnCard } from "./deckgl-column-card";
import { DeckglContourCard } from "./deckgl-contour-card";
import { DeckglGridCard } from "./deckgl-grid-card";
import { DeckglScreenGridCard } from "./deckgl-screengrid-card";
import { DeckglLineCard } from "./deckgl-line-card";
import { DeckglPathCard } from "./deckgl-path-card";
import { DeckglPolygonCard } from "./deckgl-polygon-card";
import { DeckglSolidPolygonCard } from "./deckgl-solid-polygon-card";
import { DeckglTextCard } from "./deckgl-text-card";
import { DeckglIconCard } from "./deckgl-icon-card";
import { DeckglBitmapCard } from "./deckgl-bitmap-card";
import { DeckglGreatCircleCard } from "./deckgl-great-circle-card";
import { DeckglGridCellCard } from "./deckgl-grid-cell-card";
import { DeckglH3Card } from "./deckgl-h3-card";
import { DeckglH3ClusterCard } from "./deckgl-h3-cluster-card";
import { DeckglS2Card } from "./deckgl-s2-card";
import { DeckglGeohashCard } from "./deckgl-geohash-card";
import { DeckglQuadkeyCard } from "./deckgl-quadkey-card";
import { DeckglMvtCard } from "./deckgl-mvt-card";
import { DeckglTileCard } from "./deckgl-tile-card";
import { DeckglWmsCard } from "./deckgl-wms-card";
import { DeckglTerrainCard } from "./deckgl-terrain-card";
import { DeckglScenegraphCard } from "./deckgl-scenegraph-card";
import { DeckglSimpleMeshCard } from "./deckgl-simple-mesh-card";
import { DeckglPointCloudCard } from "./deckgl-point-cloud-card";
import { DeckglCogCard } from "./deckgl-cog-card";
import { DeckglLandcoverCard } from "./deckgl-landcover-card";
import { DeckglNaipCard } from "./deckgl-naip-card";
import { LidarCopcCard } from "./lidar-copc-card";
import { LidarEptCard } from "./lidar-ept-card";
import { LidarClassificationCard } from "./lidar-classification-card";
import { LidarMultipleCard } from "./lidar-multiple-card";
import { PromapCard } from "./promap-card";
import { ValhallaRoutePlanningCard } from "./valhalla-route-planning-card";
import { ValhallaDeliveryTrackingCard } from "./valhalla-delivery-tracking-card";
import { ValhallaMultiStopCard } from "./valhalla-multi-stop-card";
import { ValhallaTripPlaybackCard } from "./valhalla-trip-playback-card";
import { GlobeAtmosphereCard } from "./globe-atmosphere-card";
import { GlobeDayNightCard } from "./globe-day-night-card";
import { HhiMapCard } from "./hhi-map-card";
import { NycSnowPlowingCard } from "./nyc-snow-plowing-card";
import { WindCard } from "./wind-card";
import { WindMapBlockCard } from "./wind-map-block-card";
import { WebglWindCard } from "./webgl-wind-card";
import { ActransitCard } from "./actransit-card";
import {
  TimelineCard,
  TIMELINE_CONTROL_STYLES,
  TIMELINE_GRANULARITY_OPTIONS,
  TIMELINE_MAP_STYLES,
  TIMELINE_WINDOW_OPTIONS,
  type TimelineControlStyleKey,
  type TimelineGranularity,
  type TimelineMapStyleKey,
  type TimelineWindowAnchor,
  type TimelineWindowSize,
} from "./timeline-card";
import { TransitiveCard } from "./transitive-card";

const SIDEBAR_SCROLL_KEY = "mapcn:examples-sidebar-scroll";

const componentMap: Record<string, ComponentType> = {
  "basic-map": BasicMapCard,
  "markers": MarkersCard,
  "route": RouteCard,
  "cluster": ClusterCard,
  "geojson": GeoJsonCard,
  "choropleth": ChoroplethExample,
  "heatmap": HeatmapCard,
  "3d-buildings": BuildingsCard,
  "raster-tiles": RasterCard,
  "image-overlay": ImageCard,
  "video-overlay": VideoCard,
  "interpolate-heatmap": InterpolateHeatmapCard,
  "legend": LegendCard,
  "layer-control": LayerControlCard,
  "proximity": ProximityCard,
  "map-compare": MapCompareCard,
  "style-switcher": StyleSwitcherExample,
  "3d-perspective": PitchBearingExample,
  "isochrone": IsochroneCard,
  "trip-planner": TripPlannerCard,
  "drone-flight": DroneFlightCard,
  "flyto": FlyToExample,
  "globe": GlobeExample,
  "animated-route": AnimatedRouteExample,
  "earthquake-globe": EarthquakeGlobeCard,
  "weather": WeatherCard,
  "weather-dashboard": WeatherDashboardCard,
  "deckgl-scatterplot": DeckglScatterplotCard,
  "deckgl-arc": DeckglArcCard,
  "deckgl-hexagon": DeckglHexagonCard,
  "deckgl-trips": DeckglTripsCard,
  "deckgl-heatmap": DeckglHeatmapCard,
  "deckgl-geojson": DeckglGeoJsonCard,
  "deckgl-column": DeckglColumnCard,
  "deckgl-contour": DeckglContourCard,
  "deckgl-grid": DeckglGridCard,
  "deckgl-screengrid": DeckglScreenGridCard,
  "deckgl-line": DeckglLineCard,
  "deckgl-path": DeckglPathCard,
  "deckgl-polygon": DeckglPolygonCard,
  "deckgl-solid-polygon": DeckglSolidPolygonCard,
  "deckgl-text": DeckglTextCard,
  "deckgl-icon": DeckglIconCard,
  "deckgl-bitmap": DeckglBitmapCard,
  "deckgl-great-circle": DeckglGreatCircleCard,
  "deckgl-grid-cell": DeckglGridCellCard,
  "deckgl-h3": DeckglH3Card,
  "deckgl-h3-cluster": DeckglH3ClusterCard,
  "deckgl-s2": DeckglS2Card,
  "deckgl-geohash": DeckglGeohashCard,
  "deckgl-quadkey": DeckglQuadkeyCard,
  "deckgl-mvt": DeckglMvtCard,
  "deckgl-tile": DeckglTileCard,
  "deckgl-wms": DeckglWmsCard,
  "deckgl-terrain": DeckglTerrainCard,
  "deckgl-scenegraph": DeckglScenegraphCard,
  "deckgl-simple-mesh": DeckglSimpleMeshCard,
  "deckgl-point-cloud": DeckglPointCloudCard,
  "deckgl-cog": DeckglCogCard,
  "deckgl-landcover": DeckglLandcoverCard,
  "deckgl-naip": DeckglNaipCard,
  "lidar-copc": LidarCopcCard,
  "lidar-ept": LidarEptCard,
  "lidar-classification": LidarClassificationCard,
  "lidar-multiple": LidarMultipleCard,
  "promap": PromapCard,
  "route-planning": ValhallaRoutePlanningCard,
  "delivery-tracking": ValhallaDeliveryTrackingCard,
  "multi-stop": ValhallaMultiStopCard,
  "trip-playback": ValhallaTripPlaybackCard,
  "globe-atmosphere": GlobeAtmosphereCard,
  "globe-day-night": GlobeDayNightCard,
  "hhi-map": HhiMapCard,
  "nyc-snow": NycSnowPlowingCard,
  "wind": WindCard,
  "wind-map": WindMapBlockCard,
  "webgl-wind": WebglWindCard,
  "actransit": ActransitCard,
  "transitive": TransitiveCard,
  "timeline": TimelineCard,
};

// ── Sidebar ───────────────────────────────────────────────────────
function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const currentSlug = pathname.split("/").pop();
  const navRef = useRef<HTMLElement>(null);
  const activeLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (collapsed) return;

    const nav = navRef.current;
    const activeLink = activeLinkRef.current;
    if (!nav || !activeLink) return;

    const savedScroll = window.sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
    if (savedScroll) {
      nav.scrollTop = Number(savedScroll);
    }

    window.requestAnimationFrame(() => {
      const navRect = nav.getBoundingClientRect();
      const activeRect = activeLink.getBoundingClientRect();
      const activeIsVisible =
        activeRect.top >= navRect.top && activeRect.bottom <= navRect.bottom;

      if (!activeIsVisible) {
        activeLink.scrollIntoView({ block: "nearest" });
      }
    });
  }, [collapsed, currentSlug]);

  const handleNavScroll = () => {
    const nav = navRef.current;
    if (!nav) return;

    window.sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(nav.scrollTop));
  };

  return (
    <aside
      className={cn(
        "h-full border-r border-border/50 bg-background flex flex-col shrink-0 transition-[width] duration-200",
        collapsed ? "w-12" : "w-60"
      )}
    >
      <div className="flex items-center justify-between px-3 py-3 border-b border-border/30">
        {!collapsed && <Logo className="text-sm" />}
        <button
          onClick={onToggle}
          className="p-1 rounded-md hover:bg-muted transition-colors cursor-pointer"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </button>
      </div>

      {!collapsed && (
        <nav
          ref={navRef}
          onScroll={handleNavScroll}
          className="flex-1 overflow-y-auto py-2 px-2"
        >
          {categories.map((category) => {
            const items = examples.filter((e) => e.category === category);
            return (
              <div key={category} className="mb-3">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {category}
                </div>
                {items.map((item) => (
                  <Link
                    key={item.slug}
                    ref={currentSlug === item.slug ? activeLinkRef : undefined}
                    href={`/examples/${item.slug}`}
                    className={cn(
                      "block rounded-md px-2 py-1.5 text-xs transition-colors",
                      currentSlug === item.slug
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>
      )}

      {!collapsed && (
        <div className="border-t border-border/30 px-3 py-2">
          <Link
            href="/examples"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3" />
            All Examples
          </Link>
        </div>
      )}
    </aside>
  );
}

// ── Info panel ────────────────────────────────────────────────────
function InfoPanel({
  example,
  timelineGranularity,
  onTimelineGranularityChange,
  timelineControlStyle,
  onTimelineControlStyleChange,
  timelineWindowSize,
  onTimelineWindowSizeChange,
  timelineWindowAnchor,
  onTimelineWindowAnchorChange,
  showBucketCounts,
  onShowBucketCountsChange,
  showStats,
  onShowStatsChange,
  showCloseControl,
  onShowCloseControlChange,
  timelineStyle,
  onTimelineStyleChange,
}: {
  example: ExampleMeta;
  timelineGranularity?: TimelineGranularity;
  onTimelineGranularityChange?: (granularity: TimelineGranularity) => void;
  timelineControlStyle?: TimelineControlStyleKey;
  onTimelineControlStyleChange?: (style: TimelineControlStyleKey) => void;
  timelineWindowSize?: TimelineWindowSize;
  onTimelineWindowSizeChange?: (size: TimelineWindowSize) => void;
  timelineWindowAnchor?: TimelineWindowAnchor;
  onTimelineWindowAnchorChange?: (anchor: TimelineWindowAnchor) => void;
  showBucketCounts?: boolean;
  onShowBucketCountsChange?: (show: boolean) => void;
  showStats?: boolean;
  onShowStatsChange?: (show: boolean) => void;
  showCloseControl?: boolean;
  onShowCloseControlChange?: (show: boolean) => void;
  timelineStyle?: TimelineMapStyleKey;
  onTimelineStyleChange?: (style: TimelineMapStyleKey) => void;
}) {
  const { prev, next } = getAdjacentExamples(example.slug);
  const showTimelineStyle = example.slug === "timeline" && timelineStyle && onTimelineStyleChange;
  const showTimelineControlStyle =
    example.slug === "timeline" && timelineControlStyle && onTimelineControlStyleChange;
  const showTimelineOptions =
    example.slug === "timeline" &&
    timelineGranularity &&
    onTimelineGranularityChange &&
    timelineWindowSize !== undefined &&
    onTimelineWindowSizeChange &&
    timelineWindowAnchor &&
    onTimelineWindowAnchorChange &&
    onShowBucketCountsChange &&
    onShowStatsChange &&
    onShowCloseControlChange;

  return (
    <div className="h-full flex flex-col border-r border-border/50 bg-background">
      <div className="flex-1 overflow-y-auto p-5">
        <div className="mb-1">
          <span className="inline-block text-[10px] font-medium uppercase tracking-wider text-primary/70 bg-primary/10 rounded px-1.5 py-0.5">
            {example.category}
          </span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight mt-2">
          {example.title}
        </h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          {example.description}
        </p>

        {showTimelineControlStyle && (
          <div className="mt-6">
            <div className="text-xs font-medium text-foreground mb-2">
              Timeline style
            </div>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(TIMELINE_CONTROL_STYLES).map(([key, option]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onTimelineControlStyleChange(key as TimelineControlStyleKey)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-left transition-colors cursor-pointer",
                    timelineControlStyle === key
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-border/50 bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  <span className="block text-xs font-medium">{option.name}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                    {option.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {showTimelineOptions && (
          <div className="mt-6 space-y-4">
            <div>
              <div className="text-xs font-medium text-foreground mb-2">
                Granularity
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-md border border-border/50 p-1">
                {Object.entries(TIMELINE_GRANULARITY_OPTIONS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onTimelineGranularityChange(key as TimelineGranularity)}
                    className={cn(
                      "rounded px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer",
                      timelineGranularity === key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-foreground mb-2">
                Range window
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-md border border-border/50 p-1">
                {TIMELINE_WINDOW_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onTimelineWindowSizeChange(option.value)}
                    className={cn(
                      "rounded px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer",
                      timelineWindowSize === option.value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-foreground mb-2">
                Window anchor
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-md border border-border/50 p-1">
                {(["start", "end"] as const).map((anchor) => (
                  <button
                    key={anchor}
                    type="button"
                    disabled={timelineWindowSize === -1}
                    onClick={() => onTimelineWindowAnchorChange(anchor)}
                    className={cn(
                      "rounded px-2 py-1 text-[11px] font-medium capitalize transition-colors cursor-pointer disabled:pointer-events-none disabled:opacity-40",
                      timelineWindowAnchor === anchor
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                  >
                    {anchor}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-foreground mb-2">
                Display
              </div>
              <div className="space-y-2 rounded-md border border-border/50 p-2">
                {[
                  ["Bucket counts", showBucketCounts, onShowBucketCountsChange],
                  ["Stats label", showStats, onShowStatsChange],
                  ["Close control", showCloseControl, onShowCloseControlChange],
                ].map(([label, checked, onChange]) => (
                  <label
                    key={label as string}
                    className="flex items-center justify-between gap-3 text-xs text-muted-foreground"
                  >
                    <span>{label as string}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(checked)}
                      onChange={(event) => {
                        (onChange as (show: boolean) => void)(event.target.checked);
                      }}
                      className="size-4 accent-primary cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {showTimelineStyle && (
          <div className="mt-6">
            <div className="text-xs font-medium text-foreground mb-2">
              Map style
            </div>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(TIMELINE_MAP_STYLES).map(([key, option]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onTimelineStyleChange(key as TimelineMapStyleKey)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-left text-xs font-medium transition-colors cursor-pointer",
                    timelineStyle === key
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-border/50 bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  {option.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <div className="text-xs font-medium text-foreground mb-2">
            Installation
          </div>
          <div className="rounded-md bg-muted/50 border border-border/30 px-3 py-2">
            <code className="text-xs text-muted-foreground">
              npx mapcn add map
            </code>
          </div>
        </div>
      </div>

      <div className="border-t border-border/30 px-4 py-3 flex items-center justify-between">
        {prev ? (
          <Link
            href={`/examples/${prev.slug}`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="size-3" />
            {prev.title}
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link
            href={`/examples/${next.slug}`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {next.title}
            <ChevronRight className="size-3" />
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}

// ── Main viewer ──────────────────────────────────────────────────
export function ExampleViewer({ slug }: { slug: string }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [timelineStyle, setTimelineStyle] = useState<TimelineMapStyleKey>("dark");
  const [timelineControlStyle, setTimelineControlStyle] =
    useState<TimelineControlStyleKey>("activity");
  const [timelineGranularity, setTimelineGranularity] =
    useState<TimelineGranularity>("week");
  const [timelineWindowSize, setTimelineWindowSize] =
    useState<TimelineWindowSize>(1);
  const [timelineWindowAnchor, setTimelineWindowAnchor] =
    useState<TimelineWindowAnchor>("start");
  const [showBucketCounts, setShowBucketCounts] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [showCloseControl, setShowCloseControl] = useState(true);
  const example = getExampleBySlug(slug);
  const Component = componentMap[slug];

  if (!example || !Component) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />

      <div className="flex-1 flex min-w-0">
        {/* Info panel — 1/3 */}
        <div className="hidden md:flex w-80 shrink-0">
          <InfoPanel
            example={example}
            timelineGranularity={timelineGranularity}
            onTimelineGranularityChange={setTimelineGranularity}
            timelineControlStyle={timelineControlStyle}
            onTimelineControlStyleChange={setTimelineControlStyle}
            timelineWindowSize={timelineWindowSize}
            onTimelineWindowSizeChange={setTimelineWindowSize}
            timelineWindowAnchor={timelineWindowAnchor}
            onTimelineWindowAnchorChange={setTimelineWindowAnchor}
            showBucketCounts={showBucketCounts}
            onShowBucketCountsChange={setShowBucketCounts}
            showStats={showStats}
            onShowStatsChange={setShowStats}
            showCloseControl={showCloseControl}
            onShowCloseControlChange={setShowCloseControl}
            timelineStyle={timelineStyle}
            onTimelineStyleChange={setTimelineStyle}
          />
        </div>

        {/* Map — fills remaining space */}
        <div className="flex-1 relative min-w-0">
          {/* Mobile header */}
          <div className="md:hidden absolute top-0 left-0 right-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border/30 px-4 py-2">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-sm font-medium">{example.title}</h1>
                <p className="text-xs text-muted-foreground truncate">
                  {example.description}
                </p>
              </div>
              <ThemeToggle />
            </div>
          </div>

          {/* Theme toggle (desktop) */}
          <div className="hidden md:block absolute top-2 right-2 z-10">
            <ThemeToggle />
          </div>

          <div className="h-full w-full">
            {slug === "timeline" ? (
              <TimelineCard
                timelineStyle={timelineStyle}
                timelineControlStyle={timelineControlStyle}
                timelineGranularity={timelineGranularity}
                timelineWindowSize={timelineWindowSize}
                timelineWindowAnchor={timelineWindowAnchor}
                showBucketCounts={showBucketCounts}
                showStats={showStats}
                showCloseControl={showCloseControl}
              />
            ) : (
              <Component />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
