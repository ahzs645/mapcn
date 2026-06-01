"use client";

export type HistoricalMapRecord = {
  id: string;
  title: string;
  place: string;
  year: number;
  range: [number, number];
  lng: number;
  lat: number;
  collection: string;
  scale: string;
  description: string;
};

export const historicalMaps: HistoricalMapRecord[] = [
  {
    id: "central-america-dispatch",
    title: "Central America (southern part), including Yucatan",
    place: "Mexico",
    year: 1863,
    range: [1840, 1870],
    lng: -90.3,
    lat: 18.7,
    collection: "Weekly Dispatch; Ettling, Theodor",
    scale: "1:6 500 000",
    description: "Regional sheet covering Yucatan and the southern gulf.",
  },
  {
    id: "republica-mexicana",
    title: "Republica Mexicana",
    place: "Mexico",
    year: 1867,
    range: [1850, 1880],
    lng: -101.5,
    lat: 23.5,
    collection: "Debray, V.",
    scale: "1:1 267 200",
    description: "National map with state boundaries and major routes.",
  },
  {
    id: "mexico-central-america",
    title: "Mexico and Central America",
    place: "Mexico",
    year: 1864,
    range: [1845, 1876],
    lng: -99.5,
    lat: 19.4,
    collection: "Hughes, William, 1818-1876",
    scale: "1:6 250 000",
    description: "Political geography of Mexico and Central America.",
  },
  {
    id: "mexico-guatemala",
    title: "Mexico and Guatemala",
    place: "Mexico",
    year: 1848,
    range: [1835, 1860],
    lng: -92.4,
    lat: 16.9,
    collection: "Sharpe, J.",
    scale: "1:8 400 000",
    description: "Borderland sheet with terrain hachures and ports.",
  },
  {
    id: "schonberg-mexico",
    title: "Schonberg's Map of Mexico",
    place: "Mexico",
    year: 1867,
    range: [1855, 1875],
    lng: -103.4,
    lat: 20.7,
    collection: "Schonberg & Co.",
    scale: "1:6 311 000",
    description: "Commercial atlas sheet with dense place labels.",
  },
  {
    id: "colby-mexico",
    title: "Mexico",
    place: "Mexico",
    year: 1856,
    range: [1840, 1870],
    lng: -106.2,
    lat: 25.4,
    collection: "Colby, Charles A.",
    scale: "1:10 500 000",
    description: "Mid-century reference map of Mexico and surrounding waters.",
  },
  {
    id: "johnson-mexico",
    title: "Mexico",
    place: "Mexico",
    year: 1864,
    range: [1845, 1875],
    lng: -97.6,
    lat: 21.2,
    collection: "Johnson, A.J.",
    scale: "1:8 218 000",
    description: "Atlas plate with inset coastal and regional detail.",
  },
];

export const timelineBounds = {
  min: 1500,
  max: 2002,
  step: 1,
};
