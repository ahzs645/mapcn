"use client";

import { useRef, useState, useEffect, type ComponentType } from "react";
import { Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
// Controls & Interactions
import { LegendCard } from "./legend-card";
import { LayerControlCard } from "./layer-control-card";
import { ProximityCard } from "./proximity-card";
import { MapCompareCard } from "./map-compare-card";
import { StyleSwitcherExample } from "./style-switcher-example";
import { PitchBearingExample } from "./pitch-bearing-example";
// Animation & 3D
import { FlyToExample } from "./flyto-example";
import { GlobeExample } from "./globe-example";
import { AnimatedRouteExample } from "./animated-route-example";
import { EarthquakeGlobeCard } from "./earthquake-globe-card";
import { WeatherCard } from "./weather-card";
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

interface Example {
  title: string;
  description: string;
  component: ComponentType;
  category: string;
}

const examples: Example[] = [
  // ── Core ───────────────────────────────────────────────────────
  { title: "Basic Map", description: "A simple map with zoom controls and default styling.", component: BasicMapCard, category: "Core" },
  { title: "Markers & Tooltips", description: "Place interactive markers with hover tooltips on the map.", component: MarkersCard, category: "Core" },
  { title: "Route", description: "Draw a line connecting coordinates with numbered stops.", component: RouteCard, category: "Core" },
  { title: "Clustered Points", description: "Cluster thousands of earthquake points for efficient rendering.", component: ClusterCard, category: "Core" },
  // ── MapLibre Layers ────────────────────────────────────────────
  { title: "GeoJSON Polygons", description: "Render GeoJSON polygon data with fill and stroke styling.", component: GeoJsonCard, category: "MapLibre Layers" },
  { title: "Choropleth", description: "US states colored by unemployment rate with hover info.", component: ChoroplethExample, category: "MapLibre Layers" },
  { title: "Heatmap", description: "Visualize earthquake density with a weighted heatmap layer.", component: HeatmapCard, category: "MapLibre Layers" },
  { title: "3D Buildings", description: "Extruded polygons with data-driven height and color.", component: BuildingsCard, category: "MapLibre Layers" },
  { title: "Raster Tiles", description: "Overlay a Stamen Watercolor tile layer on the map.", component: RasterCard, category: "MapLibre Layers" },
  { title: "Image Overlay", description: "Overlay a georeferenced weather radar image on the map.", component: ImageCard, category: "MapLibre Layers" },
  { title: "Video Overlay", description: "Overlay georeferenced drone video footage on the map.", component: VideoCard, category: "MapLibre Layers" },
  // ── Controls & Interactions ────────────────────────────────────
  { title: "Interactive Legend", description: "Click legend items to filter US regions on the map.", component: LegendCard, category: "Controls" },
  { title: "Layer Control", description: "Toggle parks, route, and marker layers on/off.", component: LayerControlCard, category: "Controls" },
  { title: "Proximity Map", description: "Visualize distances between locations with color-coded lines.", component: ProximityCard, category: "Controls" },
  { title: "Map Compare", description: "Swipe to compare light and dark map styles side by side.", component: MapCompareCard, category: "Controls" },
  { title: "Style Switcher", description: "Toggle between different map styles on the fly.", component: StyleSwitcherExample, category: "Controls" },
  { title: "3D Perspective", description: "Control pitch, bearing, and zoom with sliders and presets.", component: PitchBearingExample, category: "Controls" },
  // ── Animation & Globe ──────────────────────────────────────────
  { title: "FlyTo Cities", description: "Smooth camera animations to cities around the world.", component: FlyToExample, category: "Animation & Globe" },
  { title: "Globe", description: "3D globe projection with auto-rotation.", component: GlobeExample, category: "Animation & Globe" },
  { title: "Animated Route", description: "A route that progressively draws itself across the map.", component: AnimatedRouteExample, category: "Animation & Globe" },
  { title: "Earthquake Globe", description: "Live USGS earthquake data rendered on a 3D globe.", component: EarthquakeGlobeCard, category: "Animation & Globe" },
  { title: "Weather Dashboard", description: "Real-time temperatures from Open-Meteo for 15 world cities.", component: WeatherCard, category: "Animation & Globe" },
  // ── deck.gl ────────────────────────────────────────────────────
  { title: "Scatterplot", description: "1,000 WebGL-rendered scatter points with deck.gl.", component: DeckglScatterplotCard, category: "deck.gl" },
  { title: "Arc Layer", description: "Great-circle arcs connecting world cities.", component: DeckglArcCard, category: "deck.gl" },
  { title: "Hexagon Layer", description: "3D hexagonal binning aggregation with elevation.", component: DeckglHexagonCard, category: "deck.gl" },
  { title: "Trips Animation", description: "Animated NYC taxi trips with real trajectory data.", component: DeckglTripsCard, category: "deck.gl" },
  { title: "Heatmap (deck.gl)", description: "GPU-accelerated density heatmap with deck.gl.", component: DeckglHeatmapCard, category: "deck.gl" },
  { title: "GeoJSON 3D", description: "3D extruded GeoJSON polygons with deck.gl.", component: DeckglGeoJsonCard, category: "deck.gl" },
  { title: "Column Layer", description: "3D columns showing US city populations.", component: DeckglColumnCard, category: "deck.gl" },
  { title: "Contour Layer", description: "Density contour isolines from point data.", component: DeckglContourCard, category: "deck.gl" },
  { title: "Grid Layer", description: "3D grid aggregation with elevation scaling.", component: DeckglGridCard, category: "deck.gl" },
  { title: "Screen Grid", description: "Screen-space grid density aggregation.", component: DeckglScreenGridCard, category: "deck.gl" },
];

const categories = [
  "Core",
  "MapLibre Layers",
  "Controls",
  "Animation & Globe",
  "deck.gl",
];

function LazyExampleCard({
  title,
  description,
  Component,
}: {
  title: string;
  description: string;
  Component: ComponentType;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

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
    <>
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
              <button
                onClick={() => setExpanded(true)}
                className="absolute top-2 right-2 z-10 rounded-md bg-background/80 backdrop-blur-sm border border-border/50 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-background"
                aria-label={`Expand ${title}`}
              >
                <Maximize2 className="size-3.5 text-foreground" />
              </button>
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
        <div className="px-4 py-3 border-t border-border/30">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {description}
          </p>
        </div>
      </div>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent
          className="max-w-[95vw] w-[95vw] h-[90vh] p-0 gap-0 overflow-hidden"
          showCloseButton={false}
        >
          <DialogHeader className="px-5 py-3 border-b border-border/30 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base">{title}</DialogTitle>
                <DialogDescription className="mt-0.5">
                  {description}
                </DialogDescription>
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="rounded-md border border-border/50 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
              >
                Esc
              </button>
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {expanded && <Component />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ExamplesGrid() {
  return (
    <>
      {categories.map((category) => {
        const categoryExamples = examples.filter(
          (e) => e.category === category
        );
        return (
          <section key={category} className="mb-12">
            <h2 className="text-lg font-semibold tracking-tight mb-4">
              {category}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {categoryExamples.map((example) => (
                <LazyExampleCard
                  key={example.title}
                  title={example.title}
                  description={example.description}
                  Component={example.component}
                />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

export const exampleCount = examples.length;
