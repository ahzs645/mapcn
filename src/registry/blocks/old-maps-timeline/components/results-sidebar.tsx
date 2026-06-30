"use client";

import { useEffect, useRef } from "react";
import { MapPin, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { MapThumbnail } from "./map-thumbnail";
import type { HistoricalMapRecord } from "../data";

type ResultsSidebarProps = {
  maps: HistoricalMapRecord[];
  totalCount: number;
  year: number;
  query: string;
  selectedMapId: string;
  hoveredMapId: string | null;
  onQueryChange: (value: string) => void;
  onSelectMap: (id: string) => void;
  onHoverMap: (id: string | null) => void;
  onClose?: () => void;
  className?: string;
};

export function ResultsSidebar({
  maps,
  totalCount,
  year,
  query,
  selectedMapId,
  hoveredMapId,
  onQueryChange,
  onSelectMap,
  onHoverMap,
  onClose,
  className,
}: ResultsSidebarProps) {
  const itemRefs = useRef(new Map<string, HTMLButtonElement | null>());

  // Keep the active card in view as the timeline / map drive the selection.
  useEffect(() => {
    const node = itemRefs.current.get(selectedMapId);
    node?.scrollIntoView({ block: "nearest" });
  }, [selectedMapId]);

  return (
    <aside
      className={cn(
        "bg-background flex h-full w-full flex-col border-r md:w-[360px]",
        className,
      )}
    >
      <div className="space-y-3 border-b p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-md bg-[#ab1000] text-white">
              <MapPin className="size-4" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">
                OldMapsOnline
              </p>
              <p className="text-muted-foreground text-[11px]">
                Historical map explorer
              </p>
            </div>
          </div>
          {onClose ? (
            <button
              type="button"
              aria-label="Close results"
              onClick={onClose}
              className="hover:bg-muted text-muted-foreground grid size-8 place-items-center rounded-md md:hidden"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search places or cartographers"
            aria-label="Search maps"
            className="border-input bg-background focus-visible:ring-ring h-9 w-full rounded-md border pr-3 pl-8 text-sm shadow-sm outline-none focus-visible:ring-2"
          />
        </div>

        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>
            <span className="text-foreground font-medium">{maps.length}</span>{" "}
            of {totalCount} maps
          </span>
          <span>around {year}</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {maps.length === 0 ? (
          <p className="text-muted-foreground p-6 text-center text-sm">
            No maps match this period. Try dragging the timeline or clearing the
            search.
          </p>
        ) : (
          <ul className="divide-y">
            {maps.map((map) => {
              const selected = map.id === selectedMapId;
              const hovered = map.id === hoveredMapId;
              return (
                <li key={map.id}>
                  <button
                    type="button"
                    ref={(node) => {
                      itemRefs.current.set(map.id, node);
                    }}
                    onClick={() => onSelectMap(map.id)}
                    onMouseEnter={() => onHoverMap(map.id)}
                    onMouseLeave={() => onHoverMap(null)}
                    onFocus={() => onHoverMap(map.id)}
                    onBlur={() => onHoverMap(null)}
                    className={cn(
                      "flex w-full gap-3 border-l-2 border-transparent px-4 py-3 text-left transition-colors",
                      hovered && !selected && "bg-muted/60",
                      selected && "border-l-[#ab1000] bg-[#ab1000]/10",
                    )}
                  >
                    <span
                      className={cn(
                        "size-14 shrink-0 overflow-hidden rounded-sm border shadow-sm",
                        selected && "ring-2 ring-[#ab1000]",
                      )}
                    >
                      <MapThumbnail seed={map.id} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm leading-snug font-medium">
                        {map.title}
                      </span>
                      <span className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                        <span className="text-foreground tabular-nums">
                          {map.year}
                        </span>
                        <span aria-hidden>·</span>
                        <span className="truncate">{map.place}</span>
                      </span>
                      <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                        {map.author}
                      </span>
                      <span className="text-muted-foreground/80 mt-1 flex items-center gap-1.5 text-[11px]">
                        <span className="bg-muted truncate rounded px-1.5 py-0.5">
                          {map.scale}
                        </span>
                        <span className="truncate">{map.archive}</span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
