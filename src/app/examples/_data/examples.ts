export interface ExampleMeta {
  slug: string;
  title: string;
  description: string;
  category: string;
}

export const examples: ExampleMeta[] = [
  // ── Core ───────────────────────────────────────────────────────
  { slug: "basic-map", title: "Basic Map", description: "A simple map with zoom controls and default styling.", category: "Core" },
  { slug: "markers", title: "Markers & Tooltips", description: "Place interactive markers with hover tooltips on the map.", category: "Core" },
  { slug: "route", title: "Route", description: "Draw a line connecting coordinates with numbered stops.", category: "Core" },
  { slug: "cluster", title: "Clustered Points", description: "Cluster thousands of earthquake points for efficient rendering.", category: "Core" },
  // ── MapLibre Layers ────────────────────────────────────────────
  { slug: "geojson", title: "GeoJSON Polygons", description: "Render GeoJSON polygon data with fill and stroke styling.", category: "MapLibre Layers" },
  { slug: "choropleth", title: "Choropleth", description: "US states colored by unemployment rate with hover info.", category: "MapLibre Layers" },
  { slug: "heatmap", title: "Heatmap", description: "Visualize earthquake density with a weighted heatmap layer.", category: "MapLibre Layers" },
  { slug: "3d-buildings", title: "3D Buildings", description: "Extruded polygons with data-driven height and color.", category: "MapLibre Layers" },
  { slug: "raster-tiles", title: "Raster Tiles", description: "Overlay a Stamen Watercolor tile layer on the map.", category: "MapLibre Layers" },
  { slug: "image-overlay", title: "Image Overlay", description: "Overlay a georeferenced weather radar image on the map.", category: "MapLibre Layers" },
  { slug: "video-overlay", title: "Video Overlay", description: "Overlay georeferenced drone video footage on the map.", category: "MapLibre Layers" },
  // ── Controls & Interactions ────────────────────────────────────
  { slug: "legend", title: "Interactive Legend", description: "Click legend items to filter US regions on the map.", category: "Controls" },
  { slug: "layer-control", title: "Layer Control", description: "Toggle parks, route, and marker layers on/off.", category: "Controls" },
  { slug: "proximity", title: "Proximity Map", description: "Visualize distances between locations with color-coded lines.", category: "Controls" },
  { slug: "map-compare", title: "Map Compare", description: "Swipe to compare light and dark map styles side by side.", category: "Controls" },
  { slug: "style-switcher", title: "Style Switcher", description: "Toggle between different map styles on the fly.", category: "Controls" },
  { slug: "3d-perspective", title: "3D Perspective", description: "Control pitch, bearing, and zoom with sliders and presets.", category: "Controls" },
  { slug: "isochrone", title: "Isochrone Map", description: "Visualize travel time or distance zones from a draggable origin point.", category: "Controls" },
  // ── Animation & Globe ──────────────────────────────────────────
  { slug: "flyto", title: "FlyTo Cities", description: "Smooth camera animations to cities around the world.", category: "Animation & Globe" },
  { slug: "globe", title: "Globe", description: "3D globe projection with auto-rotation.", category: "Animation & Globe" },
  { slug: "animated-route", title: "Animated Route", description: "A route that progressively draws itself across the map.", category: "Animation & Globe" },
  { slug: "earthquake-globe", title: "Earthquake Globe", description: "Live USGS earthquake data rendered on a 3D globe.", category: "Animation & Globe" },
  { slug: "weather", title: "Weather Dashboard", description: "Real-time temperatures from Open-Meteo for 15 world cities.", category: "Animation & Globe" },
  // ── deck.gl ────────────────────────────────────────────────────
  { slug: "deckgl-scatterplot", title: "Scatterplot", description: "1,000 WebGL-rendered scatter points with deck.gl.", category: "deck.gl" },
  { slug: "deckgl-arc", title: "Arc Layer", description: "Great-circle arcs connecting world cities.", category: "deck.gl" },
  { slug: "deckgl-hexagon", title: "Hexagon Layer", description: "3D hexagonal binning aggregation with elevation.", category: "deck.gl" },
  { slug: "deckgl-trips", title: "Trips Animation", description: "Animated NYC taxi trips with real trajectory data.", category: "deck.gl" },
  { slug: "deckgl-heatmap", title: "Heatmap (deck.gl)", description: "GPU-accelerated density heatmap with deck.gl.", category: "deck.gl" },
  { slug: "deckgl-geojson", title: "GeoJSON 3D", description: "3D extruded GeoJSON polygons with deck.gl.", category: "deck.gl" },
  { slug: "deckgl-column", title: "Column Layer", description: "3D columns showing US city populations.", category: "deck.gl" },
  { slug: "deckgl-contour", title: "Contour Layer", description: "Density contour isolines from point data.", category: "deck.gl" },
  { slug: "deckgl-grid", title: "Grid Layer", description: "3D grid aggregation with elevation scaling.", category: "deck.gl" },
  { slug: "deckgl-screengrid", title: "Screen Grid", description: "Screen-space grid density aggregation.", category: "deck.gl" },
];

export const categories = [
  "Core",
  "MapLibre Layers",
  "Controls",
  "Animation & Globe",
  "deck.gl",
];

export function getExampleBySlug(slug: string): ExampleMeta | undefined {
  return examples.find((e) => e.slug === slug);
}

export function getAdjacentExamples(slug: string): { prev: ExampleMeta | null; next: ExampleMeta | null } {
  const idx = examples.findIndex((e) => e.slug === slug);
  return {
    prev: idx > 0 ? examples[idx - 1] : null,
    next: idx < examples.length - 1 ? examples[idx + 1] : null,
  };
}
