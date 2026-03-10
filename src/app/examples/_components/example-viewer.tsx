"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
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
import { ActransitCard } from "./actransit-card";

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
  "actransit": ActransitCard,
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
        <nav className="flex-1 overflow-y-auto py-2 px-2">
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
function InfoPanel({ example }: { example: ExampleMeta }) {
  const { prev, next } = getAdjacentExamples(example.slug);

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
          <InfoPanel example={example} />
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
            <Component />
          </div>
        </div>
      </div>
    </div>
  );
}
