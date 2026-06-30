"use client";

import { useMemo, useRef, useState } from "react";
import { PanelLeftOpen } from "lucide-react";

import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerTooltip,
  type MapRef,
} from "@/registry/map";
import { cn } from "@/lib/utils";
import {
  historicalMaps,
  mapBounds,
  type HistoricalMapRecord,
} from "./data";
import { OldMapsTimeline } from "./components/old-maps-timeline";
import { ResultsSidebar } from "./components/results-sidebar";
import { MapFootprints } from "./components/map-footprints";

function yearMatches(map: HistoricalMapRecord, year: number) {
  return year >= map.range[0] && year <= map.range[1];
}

function nearestMapForYear(year: number) {
  return historicalMaps.reduce((nearest, map) =>
    Math.abs(map.year - year) < Math.abs(nearest.year - year) ? map : nearest,
  );
}

function matchesQuery(map: HistoricalMapRecord, query: string) {
  if (!query) return true;
  const haystack =
    `${map.title} ${map.place} ${map.author} ${map.archive}`.toLowerCase();
  return haystack.includes(query);
}

export default function Page() {
  const mapRef = useRef<MapRef>(null);
  const [year, setYear] = useState(1860);
  const [selectedMapId, setSelectedMapId] = useState("republica-mexicana");
  const [hoveredMapId, setHoveredMapId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const normalizedQuery = query.trim().toLowerCase();

  // Maps published within the selected year window, filtered by the search.
  // Drives the sidebar list, the map markers and the highlighted footprints.
  const visibleMaps = useMemo(() => {
    return historicalMaps
      .filter(
        (map) => yearMatches(map, year) && matchesQuery(map, normalizedQuery),
      )
      .sort(
        (a, b) =>
          Math.abs(a.year - year) - Math.abs(b.year - year) ||
          a.title.localeCompare(b.title),
      );
  }, [year, normalizedQuery]);

  const selectedMap =
    historicalMaps.find((map) => map.id === selectedMapId) ??
    nearestMapForYear(year);

  // Keep the selected sheet's footprint on the map even if the search/year
  // would otherwise hide it.
  const footprintMaps = useMemo(() => {
    if (visibleMaps.some((map) => map.id === selectedMap.id)) {
      return visibleMaps;
    }
    return [...visibleMaps, selectedMap];
  }, [visibleMaps, selectedMap]);

  function selectMap(mapId: string) {
    const next = historicalMaps.find((map) => map.id === mapId);
    if (!next) return;
    setSelectedMapId(mapId);
    setYear(next.year);
    setMobileOpen(false);
    mapRef.current?.fitBounds(mapBounds(next), {
      padding: { top: 64, bottom: 170, left: 48, right: 48 },
      maxZoom: 7.5,
      duration: 900,
    });
  }

  return (
    <div className="bg-background p-4 sm:p-6">
      <div className="relative mx-auto flex h-[760px] max-w-7xl overflow-hidden rounded-lg border shadow-sm">
        {mobileOpen ? (
          <button
            type="button"
            aria-label="Close results"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 z-30 bg-black/20 md:hidden"
          />
        ) : null}

        <ResultsSidebar
          className={cn(
            "absolute inset-y-0 left-0 z-40 max-w-[340px] transition-transform duration-300 md:relative md:z-auto md:max-w-none md:translate-x-0",
            mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full md:flex",
          )}
          maps={visibleMaps}
          totalCount={historicalMaps.length}
          year={year}
          query={query}
          selectedMapId={selectedMap.id}
          hoveredMapId={hoveredMapId}
          onQueryChange={setQuery}
          onSelectMap={selectMap}
          onHoverMap={setHoveredMapId}
          onClose={() => setMobileOpen(false)}
        />

        <div className="relative flex-1">
          <Map
            ref={mapRef}
            center={[-101, 22]}
            zoom={4.6}
            minZoom={1}
            maxZoom={10}
            styles={{
              light: "https://tiles.openfreemap.org/styles/bright",
              dark: "https://tiles.openfreemap.org/styles/dark",
            }}
          >
            <MapControls position="top-right" />

            <MapFootprints
              maps={footprintMaps}
              selectedMapId={selectedMap.id}
              hoveredMapId={hoveredMapId}
              onSelectMap={selectMap}
              onHoverMap={setHoveredMapId}
            />

            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="bg-background/90 absolute top-4 left-4 z-20 flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium shadow-sm backdrop-blur md:hidden"
            >
              <PanelLeftOpen className="size-4" />
              {visibleMaps.length} results
            </button>

            {visibleMaps.map((map) => {
              const selected = map.id === selectedMap.id;
              const hovered = !selected && map.id === hoveredMapId;
              return (
                <MapMarker
                  key={map.id}
                  longitude={map.lng}
                  latitude={map.lat}
                  offset={[0, 8]}
                >
                  <MarkerContent>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={() => selectMap(map.id)}
                      onMouseEnter={() => setHoveredMapId(map.id)}
                      onMouseLeave={() => setHoveredMapId(null)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          selectMap(map.id);
                        }
                      }}
                      className="grid place-items-center"
                      aria-label={map.title}
                    >
                      <span
                        className={cn(
                          "border-background grid place-items-center rounded-full border-2 shadow-md transition-all",
                          selected
                            ? "bg-primary size-9"
                            : hovered
                              ? "bg-primary/70 size-7"
                              : "bg-muted-foreground size-5",
                        )}
                      >
                        <span className="bg-background size-2 rounded-full" />
                      </span>
                    </span>
                  </MarkerContent>
                  <MarkerTooltip
                    offset={16}
                    className="bg-background text-foreground border px-3 py-2"
                  >
                    <p className="text-sm font-medium">{map.title}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {map.place} · {map.year} · {map.author}
                    </p>
                  </MarkerTooltip>
                </MapMarker>
              );
            })}

            <OldMapsTimeline
              year={year}
              maps={historicalMaps}
              selectedMapId={selectedMap.id}
              hoveredMapId={hoveredMapId}
              onYearChange={setYear}
              onSelectMap={selectMap}
              onHoverMap={setHoveredMapId}
            />
          </Map>
        </div>
      </div>
    </div>
  );
}
