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
  { slug: "interpolate-heatmap", title: "Interpolate Heatmap", description: "Real-time global temperature visualization using IDW interpolation with live Open-Meteo data.", category: "MapLibre Layers" },
  // ── Controls & Interactions ────────────────────────────────────
  { slug: "legend", title: "Interactive Legend", description: "Click legend items to filter US regions on the map.", category: "Controls" },
  { slug: "layer-control", title: "Layer Control", description: "Toggle parks, route, and marker layers on/off.", category: "Controls" },
  { slug: "proximity", title: "Proximity Map", description: "Visualize distances between locations with color-coded lines.", category: "Controls" },
  { slug: "map-compare", title: "Map Compare", description: "Swipe to compare light and dark map styles side by side.", category: "Controls" },
  { slug: "style-switcher", title: "Style Switcher", description: "Toggle between different map styles on the fly.", category: "Controls" },
  { slug: "3d-perspective", title: "3D Perspective", description: "Control pitch, bearing, and zoom with sliders and presets.", category: "Controls" },
  { slug: "isochrone", title: "Isochrone Map", description: "Visualize travel time or distance zones from a draggable origin point.", category: "Controls" },
  // ── Valhalla Routing ───────────────────────────────────────────
  { slug: "trip-planner", title: "Trip Planner", description: "Multi-day itinerary generator with POI suggestions using Valhalla routing.", category: "Valhalla Routing" },
  { slug: "route-planning", title: "Route Planning", description: "A to B routing with alternate routes using Valhalla routing API.", category: "Valhalla Routing" },
  { slug: "delivery-tracking", title: "Delivery Tracking", description: "Live delivery simulation with ETA updates using Valhalla routing.", category: "Valhalla Routing" },
  { slug: "multi-stop", title: "Multi-Stop Routes", description: "Traveling salesman route optimization with draggable waypoints.", category: "Valhalla Routing" },
  { slug: "trip-playback", title: "Trip Playback", description: "Animated route replay with timeline scrubbing using Valhalla routing.", category: "Valhalla Routing" },
  // ── Featured ───────────────────────────────────────────────────
  { slug: "drone-flight", title: "Drone Flight", description: "Cinematic drone flight animation along a GeoJSON path with animated trail and camera follow.", category: "Featured" },
  { slug: "hhi-map", title: "HHI Map", description: "US market concentration visualization with interactive choropleth filtering.", category: "Featured" },
  { slug: "nyc-snow", title: "NYC Snow Plowing", description: "3D visualization of snow accumulation on NYC streets with borough selection.", category: "Featured" },
  { slug: "actransit", title: "AC Transit", description: "Simulated real-time bus tracking with route visualization.", category: "Featured" },
  { slug: "wind", title: "Wind Animation", description: "Global wind speed and direction visualization with color-coded particles.", category: "Featured" },
  // ── Animation & Globe ──────────────────────────────────────────
  { slug: "flyto", title: "FlyTo Cities", description: "Smooth camera animations to cities around the world.", category: "Animation & Globe" },
  { slug: "globe", title: "Globe", description: "3D globe projection with auto-rotation.", category: "Animation & Globe" },
  { slug: "globe-atmosphere", title: "Globe Atmosphere", description: "Interactive dawn, day, dusk, and night atmosphere modes on a 3D globe.", category: "Animation & Globe" },
  { slug: "globe-day-night", title: "Globe Day/Night", description: "Real-time sun tracking with day/night visualization on a 3D globe.", category: "Animation & Globe" },
  { slug: "animated-route", title: "Animated Route", description: "A route that progressively draws itself across the map.", category: "Animation & Globe" },
  { slug: "earthquake-globe", title: "Earthquake Globe", description: "Live USGS earthquake data rendered on a 3D globe.", category: "Animation & Globe" },
  { slug: "weather", title: "Weather Markers", description: "Real-time temperatures from Open-Meteo for 15 world cities.", category: "Animation & Globe" },
  { slug: "weather-dashboard", title: "Weather Dashboard", description: "Global weather explorer with real-time data, AQI badges, geocoding search, and 7-day forecasts for 25 major cities.", category: "Animation & Globe" },
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
  { slug: "deckgl-line", title: "Line Layer", description: "Render line segments between source and target positions.", category: "deck.gl" },
  { slug: "deckgl-path", title: "Path Layer", description: "Render continuous paths with multiple vertices.", category: "deck.gl" },
  { slug: "deckgl-polygon", title: "Polygon Layer", description: "Render filled and stroked polygons with deck.gl.", category: "deck.gl" },
  { slug: "deckgl-solid-polygon", title: "Solid Polygon", description: "3D extruded solid polygon buildings visualization.", category: "deck.gl" },
  { slug: "deckgl-text", title: "Text Layer", description: "Render text labels at geographic locations.", category: "deck.gl" },
  { slug: "deckgl-icon", title: "Icon Layer", description: "Render icons and sprites at geographic locations.", category: "deck.gl" },
  { slug: "deckgl-bitmap", title: "Bitmap Layer", description: "Georeferenced image overlay on the map.", category: "deck.gl" },
  { slug: "deckgl-great-circle", title: "Great Circle", description: "Great circle arcs for global flight paths.", category: "deck.gl" },
  { slug: "deckgl-grid-cell", title: "Grid Cell Layer", description: "3D grid cell visualization with value-based coloring.", category: "deck.gl" },
  // ── deck.gl Spatial Indexing ─────────────────────────────────────
  { slug: "deckgl-h3", title: "H3 Hexagons", description: "Uber H3 hexagonal spatial indexing with extruded cells.", category: "deck.gl Spatial" },
  { slug: "deckgl-h3-cluster", title: "H3 Cluster", description: "Grouped H3 hexagons as merged cluster regions.", category: "deck.gl Spatial" },
  { slug: "deckgl-s2", title: "S2 Layer", description: "Google S2 geometry spherical cells for uniform coverage.", category: "deck.gl Spatial" },
  { slug: "deckgl-geohash", title: "Geohash Layer", description: "Geohash spatial indexing with automatic cell boundaries.", category: "deck.gl Spatial" },
  { slug: "deckgl-quadkey", title: "Quadkey Layer", description: "Bing Maps Quadkey tile system visualization.", category: "deck.gl Spatial" },
  // ── deck.gl Geographic ──────────────────────────────────────────
  { slug: "deckgl-mvt", title: "MVT Layer", description: "Mapbox Vector Tiles with custom styling using deck.gl.", category: "deck.gl Geographic" },
  { slug: "deckgl-tile", title: "Tile Layer", description: "Generic tile loading with custom sublayer rendering.", category: "deck.gl Geographic" },
  { slug: "deckgl-wms", title: "WMS Layer", description: "Web Map Service integration with tiled loading.", category: "deck.gl Geographic" },
  { slug: "deckgl-terrain", title: "Terrain Layer", description: "3D terrain visualization with elevation data and textures.", category: "deck.gl Geographic" },
  // ── deck.gl 3D ──────────────────────────────────────────────────
  { slug: "deckgl-scenegraph", title: "Scenegraph", description: "Animated glTF/GLB 3D models at data points.", category: "deck.gl 3D" },
  { slug: "deckgl-simple-mesh", title: "Simple Mesh", description: "Instanced 3D mesh objects using luma.gl geometries.", category: "deck.gl 3D" },
  { slug: "deckgl-point-cloud", title: "Point Cloud", description: "3D point cloud visualization from generated data.", category: "deck.gl 3D" },
  // ── Satellite & Raster ──────────────────────────────────────────
  { slug: "deckgl-cog", title: "COG Layer", description: "Cloud-Optimized GeoTIFF satellite imagery visualization.", category: "Satellite & Raster" },
  { slug: "deckgl-landcover", title: "Land Cover", description: "NLCD land use classification with colored columns.", category: "Satellite & Raster" },
  { slug: "deckgl-naip", title: "NAIP Mosaic", description: "USGS aerial imagery mosaic with tiled loading.", category: "Satellite & Raster" },
  // ── LiDAR Point Clouds ──────────────────────────────────────────
  { slug: "lidar-copc", title: "COPC Streaming", description: "Cloud-Optimized Point Cloud terrain visualization.", category: "LiDAR" },
  { slug: "lidar-ept", title: "EPT Streaming", description: "Entwine Point Tile urban point cloud visualization.", category: "LiDAR" },
  { slug: "lidar-classification", title: "Classification Filter", description: "ASPRS classification-colored LiDAR point cloud.", category: "LiDAR" },
  { slug: "lidar-multiple", title: "Multiple Sources", description: "Multiple point cloud datasets in a single view.", category: "LiDAR" },
  // ── ProMap ──────────────────────────────────────────────────────
  { slug: "promap", title: "Home Price Explorer", description: "US home price bubble map with city-level visualization.", category: "Featured" },
];

export const categories = [
  "Core",
  "MapLibre Layers",
  "Controls",
  "Valhalla Routing",
  "Featured",
  "Animation & Globe",
  "deck.gl",
  "deck.gl Spatial",
  "deck.gl Geographic",
  "deck.gl 3D",
  "Satellite & Raster",
  "LiDAR",
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
