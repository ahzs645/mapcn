"use client";

export type HistoricalMapRecord = {
  id: string;
  title: string;
  place: string;
  /** Publication year used to position the map on the timeline. */
  year: number;
  /** Inclusive [from, to] range the sheet is considered relevant for. */
  range: [number, number];
  /** Footprint centre — longitude. */
  lng: number;
  /** Footprint centre — latitude. */
  lat: number;
  /** Footprint size in degrees, [width, height], centred on lng/lat. */
  coverage: [number, number];
  /** Cartographer / publisher shown on the result card. */
  author: string;
  /** Holding institution / collection. */
  archive: string;
  scale: string;
  description: string;
};

export const historicalMaps: HistoricalMapRecord[] = [
  {
    id: "central-america-dispatch",
    title: "Central America (southern part), including Yucatan",
    place: "Yucatán",
    year: 1863,
    range: [1840, 1870],
    lng: -90.3,
    lat: 18.7,
    coverage: [11, 8],
    author: "Theodor Ettling — Weekly Dispatch Atlas",
    archive: "David Rumsey Map Collection",
    scale: "1:6 500 000",
    description: "Regional sheet covering Yucatán and the southern gulf.",
  },
  {
    id: "republica-mexicana",
    title: "Republica Mexicana",
    place: "Mexico",
    year: 1867,
    range: [1850, 1885],
    lng: -101.5,
    lat: 23.5,
    coverage: [22, 17],
    author: "Victor Debray",
    archive: "Biblioteca Nacional de México",
    scale: "1:1 267 200",
    description: "National map with state boundaries and major routes.",
  },
  {
    id: "mexico-central-america",
    title: "Mexico and Central America",
    place: "Mexico",
    year: 1864,
    range: [1845, 1880],
    lng: -99.5,
    lat: 19.4,
    coverage: [24, 18],
    author: "William Hughes",
    archive: "British Library",
    scale: "1:6 250 000",
    description: "Political geography of Mexico and Central America.",
  },
  {
    id: "mexico-guatemala",
    title: "Mexico and Guatemala",
    place: "Chiapas",
    year: 1848,
    range: [1835, 1865],
    lng: -92.4,
    lat: 16.9,
    coverage: [10, 8],
    author: "John Sharpe",
    archive: "Library of Congress",
    scale: "1:8 400 000",
    description: "Borderland sheet with terrain hachures and ports.",
  },
  {
    id: "schonberg-mexico",
    title: "Schonberg's Map of Mexico",
    place: "Mexico",
    year: 1867,
    range: [1855, 1885],
    lng: -103.4,
    lat: 20.7,
    coverage: [20, 15],
    author: "Schonberg & Co.",
    archive: "Stanford Libraries",
    scale: "1:6 311 000",
    description: "Commercial atlas sheet with dense place labels.",
  },
  {
    id: "colby-mexico",
    title: "Mexico",
    place: "Mexico",
    year: 1856,
    range: [1840, 1872],
    lng: -106.2,
    lat: 25.4,
    coverage: [18, 14],
    author: "Charles A. Colby",
    archive: "David Rumsey Map Collection",
    scale: "1:10 500 000",
    description: "Mid-century reference map of Mexico and surrounding waters.",
  },
  {
    id: "johnson-mexico",
    title: "Mexico",
    place: "Veracruz",
    year: 1864,
    range: [1850, 1880],
    lng: -97.6,
    lat: 21.2,
    coverage: [16, 13],
    author: "A. J. Johnson",
    archive: "Library of Congress",
    scale: "1:8 218 000",
    description: "Atlas plate with inset coastal and regional detail.",
  },
  {
    id: "tanner-mexico",
    title: "A Map of Mexico & Guatemala",
    place: "Mexico",
    year: 1834,
    range: [1825, 1855],
    lng: -100.8,
    lat: 22.4,
    coverage: [23, 17],
    author: "Henry S. Tanner",
    archive: "Library of Congress",
    scale: "1:5 700 000",
    description: "Early republican-era map with provincial divisions.",
  },
  {
    id: "valle-de-mexico",
    title: "Valle de México",
    place: "Ciudad de México",
    year: 1873,
    range: [1860, 1890],
    lng: -99.13,
    lat: 19.43,
    coverage: [2.4, 2],
    author: "Antonio García Cubas",
    archive: "Biblioteca Nacional de México",
    scale: "1:250 000",
    description: "Detailed survey of the basin of Mexico and its lakes.",
  },
  {
    id: "puebla-tlaxcala",
    title: "Estado de Puebla y Tlaxcala",
    place: "Puebla",
    year: 1858,
    range: [1845, 1875],
    lng: -98.0,
    lat: 19.0,
    coverage: [3.5, 3],
    author: "Manuel Orozco y Berra",
    archive: "Biblioteca Nacional de México",
    scale: "1:500 000",
    description: "State sheet with road network and elevation hachures.",
  },
  {
    id: "yucatan-peninsula",
    title: "Plano de la Península de Yucatán",
    place: "Yucatán",
    year: 1878,
    range: [1865, 1895],
    lng: -89.0,
    lat: 20.2,
    coverage: [6, 5],
    author: "Comisión Geográfica Exploradora",
    archive: "Mapoteca Manuel Orozco y Berra",
    scale: "1:1 000 000",
    description: "Peninsular survey with haciendas and coastal soundings.",
  },
  {
    id: "oaxaca-istmo",
    title: "Istmo de Tehuantepec",
    place: "Oaxaca",
    year: 1851,
    range: [1842, 1868],
    lng: -94.8,
    lat: 16.6,
    coverage: [4, 4],
    author: "J. J. Williams",
    archive: "American Geographical Society Library",
    scale: "1:600 000",
    description: "Survey of the isthmus for a proposed inter-ocean route.",
  },
  {
    id: "norte-frontera",
    title: "Mapa de la Frontera del Norte",
    place: "Chihuahua",
    year: 1886,
    range: [1872, 1900],
    lng: -106.0,
    lat: 28.6,
    coverage: [14, 9],
    author: "Comisión Geográfica Exploradora",
    archive: "Mapoteca Manuel Orozco y Berra",
    scale: "1:2 000 000",
    description: "Northern frontier states with railroads and mining districts.",
  },
  {
    id: "michoacan-jalisco",
    title: "Estados de Michoacán y Jalisco",
    place: "Jalisco",
    year: 1869,
    range: [1858, 1882],
    lng: -102.6,
    lat: 20.0,
    coverage: [6, 5],
    author: "Antonio García Cubas",
    archive: "David Rumsey Map Collection",
    scale: "1:800 000",
    description: "West-central states with lakes, volcanoes, and parishes.",
  },
];

export const timelineBounds = {
  min: 1500,
  max: 2002,
  step: 1,
};

/** Footprint corners for a record, derived from its centre and coverage. */
export function mapBounds(
  map: HistoricalMapRecord,
): [[number, number], [number, number]] {
  const [w, h] = map.coverage;
  return [
    [map.lng - w / 2, map.lat - h / 2],
    [map.lng + w / 2, map.lat + h / 2],
  ];
}

export type FootprintState = "default" | "hovered" | "selected";

/** GeoJSON polygons for every footprint, tagged with their current state. */
export function footprintCollection(
  maps: HistoricalMapRecord[],
  selectedId: string | null,
  hoveredId: string | null,
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  return {
    type: "FeatureCollection",
    features: maps.map((map) => {
      const [[west, south], [east, north]] = mapBounds(map);
      const state: FootprintState =
        map.id === selectedId
          ? "selected"
          : map.id === hoveredId
            ? "hovered"
            : "default";
      return {
        type: "Feature",
        properties: { id: map.id, title: map.title, state },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [west, south],
              [east, south],
              [east, north],
              [west, north],
              [west, south],
            ],
          ],
        },
      };
    }),
  };
}
