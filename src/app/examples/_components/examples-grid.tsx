"use client";

import { useRef, useState, useEffect, type ComponentType } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  examples as examplesMeta,
  categories,
} from "../_data/examples";

// Core
import { BasicMapCard } from "./basic-map-card";
import { MarkersCard } from "./markers-card";
import { RouteCard } from "./route-card";
import { ClusterCard } from "./cluster-card";
// MapLibre Layers
import { GeoJsonCard } from "./geojson-card";
import { ChoroplethExample } from "./choropleth-example";
import { HeatmapCard } from "./heatmap-card";
import { BuildingsCard } from "./buildings-card";
import { RasterCard } from "./raster-card";
import { ImageCard } from "./image-card";
import { VideoCard } from "./video-card";
import { InterpolateHeatmapCard } from "./interpolate-heatmap-card";
// Controls & Interactions
import { LegendCard } from "./legend-card";
import { LayerControlCard } from "./layer-control-card";
import { ProximityCard } from "./proximity-card";
import { MapCompareCard } from "./map-compare-card";
import { StyleSwitcherExample } from "./style-switcher-example";
import { PitchBearingExample } from "./pitch-bearing-example";
import { IsochroneCard } from "./isochrone-card";
// Valhalla Routing
import { TripPlannerCard } from "./trip-planner-card";
// Featured
import { DroneFlightCard } from "./drone-flight-card";
// Animation & 3D
import { FlyToExample } from "./flyto-example";
import { GlobeExample } from "./globe-example";
import { AnimatedRouteExample } from "./animated-route-example";
import { EarthquakeGlobeCard } from "./earthquake-globe-card";
import { WeatherCard } from "./weather-card";
import { WeatherDashboardCard } from "./weather-dashboard-card";
// deck.gl
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
// deck.gl Spatial Indexing
import { DeckglH3Card } from "./deckgl-h3-card";
import { DeckglH3ClusterCard } from "./deckgl-h3-cluster-card";
import { DeckglS2Card } from "./deckgl-s2-card";
import { DeckglGeohashCard } from "./deckgl-geohash-card";
import { DeckglQuadkeyCard } from "./deckgl-quadkey-card";
// deck.gl Geographic
import { DeckglMvtCard } from "./deckgl-mvt-card";
import { DeckglTileCard } from "./deckgl-tile-card";
import { DeckglWmsCard } from "./deckgl-wms-card";
import { DeckglTerrainCard } from "./deckgl-terrain-card";
// deck.gl 3D
import { DeckglScenegraphCard } from "./deckgl-scenegraph-card";
import { DeckglSimpleMeshCard } from "./deckgl-simple-mesh-card";
import { DeckglPointCloudCard } from "./deckgl-point-cloud-card";
// Satellite & Raster
import { DeckglCogCard } from "./deckgl-cog-card";
import { DeckglLandcoverCard } from "./deckgl-landcover-card";
import { DeckglNaipCard } from "./deckgl-naip-card";
// LiDAR
import { LidarCopcCard } from "./lidar-copc-card";
import { LidarEptCard } from "./lidar-ept-card";
import { LidarClassificationCard } from "./lidar-classification-card";
import { LidarMultipleCard } from "./lidar-multiple-card";
// ProMap
import { PromapCard } from "./promap-card";
// Valhalla Routing (additional)
import { ValhallaRoutePlanningCard } from "./valhalla-route-planning-card";
import { ValhallaDeliveryTrackingCard } from "./valhalla-delivery-tracking-card";
import { ValhallaMultiStopCard } from "./valhalla-multi-stop-card";
import { ValhallaTripPlaybackCard } from "./valhalla-trip-playback-card";
// Globe
import { GlobeAtmosphereCard } from "./globe-atmosphere-card";
import { GlobeDayNightCard } from "./globe-day-night-card";
// Featured (additional)
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

function LazyExampleCard({
  slug,
  title,
  description,
  Component,
}: {
  slug: string;
  title: string;
  description: string;
  Component: ComponentType;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
      },
      { rootMargin: "50px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "group rounded-xl overflow-hidden border border-border/50 bg-card shadow-sm transition-shadow hover:shadow-md"
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {visible ? (
          <>
            <Component />
            <Link
              href={`/examples/${slug}`}
              className="absolute top-2 right-2 z-10 rounded-md bg-background/80 backdrop-blur-sm border border-border/50 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
              aria-label={`Open ${title}`}
            >
              <ExternalLink className="size-3.5 text-foreground" />
            </Link>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
            <div className="flex gap-1">
              <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-pulse" />
              <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:150ms]" />
              <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </div>
      <Link href={`/examples/${slug}`} className="block px-4 py-3 border-t border-border/30">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {description}
        </p>
      </Link>
    </div>
  );
}

export function ExamplesGrid() {
  return (
    <>
      {categories.map((category) => {
        const categoryExamples = examplesMeta.filter(
          (e) => e.category === category
        );
        return (
          <section key={category} className="mb-12">
            <h2 className="text-lg font-semibold tracking-tight mb-4">
              {category}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {categoryExamples.map((example) => {
                const Component = componentMap[example.slug];
                if (!Component) return null;
                return (
                  <LazyExampleCard
                    key={example.slug}
                    slug={example.slug}
                    title={example.title}
                    description={example.description}
                    Component={Component}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}

export const exampleCount = examplesMeta.length;
