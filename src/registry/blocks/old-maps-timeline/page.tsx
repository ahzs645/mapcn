"use client";

import { useMemo, useState } from "react";
import { Link2, MapPinned, PanelRightOpen } from "lucide-react";

import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerTooltip,
} from "@/registry/map";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { historicalMaps, type HistoricalMapRecord } from "./data";
import { OldMapsTimeline } from "./components/old-maps-timeline";

type ExplorerMode = "timeline" | "linked";

function yearMatches(map: HistoricalMapRecord, year: number) {
  return year >= map.range[0] && year <= map.range[1];
}

function nearestMapForYear(year: number) {
  return historicalMaps.reduce((nearest, map) =>
    Math.abs(map.year - year) < Math.abs(nearest.year - year) ? map : nearest,
  );
}

export default function Page() {
  const [year, setYear] = useState(1850);
  const [mode, setMode] = useState<ExplorerMode>("timeline");
  const [selectedMapId, setSelectedMapId] = useState("colby-mexico");

  const visibleMaps = useMemo(() => {
    const matches = historicalMaps.filter((map) => yearMatches(map, year));
    return matches.length ? matches : [nearestMapForYear(year)];
  }, [year]);

  const selectedMap =
    historicalMaps.find((map) => map.id === selectedMapId) ??
    nearestMapForYear(year);

  function updateYear(nextYear: number) {
    setYear(nextYear);
    if (mode === "linked") {
      setSelectedMapId(nearestMapForYear(nextYear).id);
    }
  }

  function selectMap(mapId: string) {
    const nextMap = historicalMaps.find((map) => map.id === mapId);
    if (!nextMap) return;
    setSelectedMapId(mapId);
    setYear(nextMap.year);
  }

  return (
    <div className="bg-background p-6">
      <div className="relative mx-auto h-[720px] max-w-7xl overflow-hidden rounded-lg border shadow-sm">
        <Map
          center={[-102.55, 23.88]}
          zoom={4.8}
          minZoom={1}
          maxZoom={10}
          styles={{
            light: "https://tiles.openfreemap.org/styles/bright",
            dark: "https://tiles.openfreemap.org/styles/dark",
          }}
        >
          <MapControls position="top-right" />

          <div className="bg-background/90 absolute top-4 left-4 z-20 flex items-center gap-2 rounded-md border p-1 shadow-sm backdrop-blur">
            <Button
              type="button"
              size="sm"
              variant={mode === "timeline" ? "secondary" : "ghost"}
              className="h-8 gap-1.5 px-2.5"
              onClick={() => setMode("timeline")}
            >
              <MapPinned className="size-4" />
              Timeline
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "linked" ? "secondary" : "ghost"}
              className="h-8 gap-1.5 px-2.5"
              onClick={() => {
                setMode("linked");
                setSelectedMapId(nearestMapForYear(year).id);
              }}
            >
              <Link2 className="size-4" />
              Link sidebar
            </Button>
          </div>

          <aside className="bg-background/90 absolute top-16 right-4 z-20 hidden w-[300px] rounded-md border p-3 shadow-sm backdrop-blur md:block">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <PanelRightOpen className="size-4" />
              Active maps
            </div>
            <div className="space-y-1.5">
              {visibleMaps.map((map) => (
                <button
                  key={map.id}
                  type="button"
                  onClick={() => selectMap(map.id)}
                  className={cn(
                    "hover:bg-muted w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                    map.id === selectedMap.id && "bg-muted",
                  )}
                >
                  <span className="block truncate font-medium">
                    {map.title}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {map.year} · {map.collection}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          {visibleMaps.map((map) => {
            const selected = map.id === selectedMap.id;
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
                        "grid place-items-center rounded-full border-2 border-white shadow-md",
                        selected
                          ? "size-9 bg-[#ab1000]"
                          : "size-5 bg-[#675c44]",
                      )}
                    >
                      <span className="size-2 rounded-full bg-white" />
                    </span>
                  </span>
                </MarkerContent>
                <MarkerTooltip
                  offset={16}
                  className="bg-background text-foreground border px-3 py-2"
                >
                  <p className="text-sm font-medium">{map.title}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {map.place} · {map.year}
                  </p>
                </MarkerTooltip>
              </MapMarker>
            );
          })}

          <OldMapsTimeline
            year={year}
            maps={historicalMaps}
            selectedMapId={selectedMap.id}
            onYearChange={updateYear}
            onSelectMap={selectMap}
          />
        </Map>
      </div>
    </div>
  );
}
