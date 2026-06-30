"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { timelineBounds, type HistoricalMapRecord } from "../data";

type OldMapsTimelineProps = {
  year: number;
  maps: HistoricalMapRecord[];
  selectedMapId: string;
  hoveredMapId?: string | null;
  className?: string;
  onYearChange: (year: number) => void;
  onSelectMap: (mapId: string) => void;
  onHoverMap?: (mapId: string | null) => void;
};

// OldMapsOnline palette — kept as literals so the timeline owns its look.
// The red stays constant; the sepia ink lightens on dark basemaps so the
// ruler keeps reading without a glowing parchment panel.
const RED = "#ab1000";
const INK_LIGHT = "#675c44";
const INK_DARK = "#c9bfa9";

const YEAR_WIDTH = 10;
const MIN = timelineBounds.min;
const MAX = timelineBounds.max;
const SPAN = MAX - MIN;
const STRIP_WIDTH = SPAN * YEAR_WIDTH;

// Vertical anchors, measured from the bottom of the timeline (px).
const BASELINE = 26;
const LABEL_LEVELS = [46, 70, 94];

function clampYear(year: number) {
  return Math.min(MAX, Math.max(MIN, year));
}

function yearToOffset(year: number) {
  return (year - MIN) * YEAR_WIDTH;
}

/** Tracks the active theme via the `.dark` class toggled by the host app. */
function useIsDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const check = () =>
      setDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);
  return dark;
}

/** A tiny Mexican tricolour standing in for OldMapsOnline's country flags. */
function MiniFlag() {
  return (
    <span className="flex h-[9px] w-[13px] overflow-hidden rounded-[1px] border border-black/20 shadow-sm">
      <span className="flex-1 bg-[#006847]" />
      <span className="flex-1 bg-white" />
      <span className="flex-1 bg-[#ce1126]" />
    </span>
  );
}

export function OldMapsTimeline({
  year,
  maps,
  selectedMapId,
  hoveredMapId,
  className,
  onYearChange,
  onSelectMap,
  onHoverMap,
}: OldMapsTimelineProps) {
  const dragRef = useRef<{ x: number; year: number } | null>(null);
  const isDark = useIsDark();
  const INK = isDark ? INK_DARK : INK_LIGHT;

  const currentOffset = yearToOffset(year);

  const years = useMemo(
    () => Array.from({ length: SPAN + 1 }, (_, index) => MIN + index),
    [],
  );

  // Stable label rows: sort by year, then stagger across three heights.
  const labelled = useMemo(() => {
    return [...maps]
      .sort((a, b) => a.year - b.year)
      .map((map, index) => ({
        map,
        level: LABEL_LEVELS[index % LABEL_LEVELS.length],
      }));
  }, [maps]);

  const sortedByYear = useMemo(
    () => [...maps].sort((a, b) => a.year - b.year),
    [maps],
  );
  const prevMap = [...sortedByYear].reverse().find((map) => map.year < year);
  const nextMap = sortedByYear.find((map) => map.year > year);

  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    dragRef.current = { x: event.clientX, year };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const dx = event.clientX - dragRef.current.x;
    onYearChange(clampYear(Math.round(dragRef.current.year - dx / YEAR_WIDTH)));
  }
  function endDrag() {
    dragRef.current = null;
  }

  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 z-20 h-[156px] select-none",
        className,
      )}
    >
      {/* Parchment fade in light mode, a matching warm-dark fade in dark mode,
          so the ruler stays readable without a glowing light panel. */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(0deg,#fdfaf2_0%,#fdfaf2_38%,rgba(253,250,242,0.85)_62%,rgba(253,250,242,0)_100%)] dark:bg-[linear-gradient(0deg,#1a1714_0%,#1a1714_38%,rgba(26,23,20,0.85)_62%,rgba(26,23,20,0)_100%)]" />

      {/* Centre guide connecting the year flag to the handle. */}
      <div
        className="pointer-events-none absolute left-1/2 w-px -translate-x-1/2"
        style={{ bottom: BASELINE, height: 78, backgroundColor: `${RED}33` }}
      />

      {/* Draggable ruler with ticks, year labels and map flags. */}
      <div
        className="absolute inset-x-0 bottom-0 h-[120px] cursor-grab touch-none overflow-hidden px-[50%] [mask:linear-gradient(90deg,rgba(0,0,0,0)_0%,#000_6%,#000_94%,rgba(0,0,0,0)_100%)] active:cursor-grabbing"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <div
          className="relative h-full transition-transform duration-200 ease-out"
          style={{
            width: STRIP_WIDTH,
            transform: `translateX(${-currentOffset}px)`,
          }}
        >
          <div
            className="absolute left-0"
            style={{
              bottom: BASELINE,
              width: STRIP_WIDTH,
              height: 1,
              backgroundColor: `${INK}66`,
            }}
          />

          {years.map((tickYear) => {
            const major = tickYear % 50 === 0;
            const medium = tickYear % 10 === 0;
            return (
              <div
                key={tickYear}
                className="absolute"
                style={{ left: yearToOffset(tickYear), bottom: BASELINE }}
              >
                <div
                  style={{
                    width: 1,
                    height: major ? 16 : medium ? 9 : 5,
                    backgroundColor: major ? INK : `${INK}99`,
                  }}
                />
                {major ? (
                  <span
                    className="absolute top-[18px] -translate-x-1/2 text-xs tabular-nums"
                    style={{ color: INK }}
                  >
                    {tickYear}
                  </span>
                ) : null}
              </div>
            );
          })}

          {labelled.map(({ map, level }) => {
            const selected = map.id === selectedMapId;
            const hovered = map.id === hoveredMapId;
            const distance = Math.abs(map.year - year);
            const opacity = selected
              ? 1
              : Math.max(0.4, 1 - distance / 70);
            return (
              <button
                key={map.id}
                type="button"
                aria-label={`${map.title}, ${map.year}`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectMap(map.id);
                }}
                onPointerEnter={() => onHoverMap?.(map.id)}
                onPointerLeave={() => onHoverMap?.(null)}
                className="absolute flex -translate-x-1/2 flex-col items-center gap-0.5"
                style={{ left: yearToOffset(map.year), bottom: level, opacity }}
              >
                <span
                  className="absolute top-full left-1/2 w-px -translate-x-1/2"
                  style={{
                    height: level - BASELINE,
                    backgroundColor: selected ? RED : `${INK}59`,
                  }}
                />
                <MiniFlag />
                <span
                  className={cn(
                    "max-w-[92px] truncate text-[10px] leading-tight font-medium",
                    (selected || hovered) && "font-semibold",
                  )}
                  style={{ color: selected ? RED : INK }}
                >
                  {map.place}
                </span>
                <span
                  className="text-[10px] leading-none tabular-nums"
                  style={{ color: selected ? RED : `${INK}cc` }}
                >
                  {map.year}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Position handle with previous / next map arrows (fixed at centre). */}
      <div
        className="absolute left-1/2 z-20 flex -translate-x-1/2 items-center gap-2"
        style={{ bottom: BASELINE - 14 }}
      >
        <button
          type="button"
          aria-label="Previous map"
          disabled={!prevMap}
          onClick={() => prevMap && onSelectMap(prevMap.id)}
          className="grid size-7 place-items-center rounded-full text-white shadow-sm transition disabled:opacity-30"
          style={{ backgroundColor: RED }}
        >
          <ChevronLeft className="size-4" />
        </button>
        <span
          className="size-7 rounded-full border-[3px] bg-white shadow-md"
          style={{ borderColor: RED }}
        />
        <button
          type="button"
          aria-label="Next map"
          disabled={!nextMap}
          onClick={() => nextMap && onSelectMap(nextMap.id)}
          className="grid size-7 place-items-center rounded-full text-white shadow-sm transition disabled:opacity-30"
          style={{ backgroundColor: RED }}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Centred year flag with step arrows and a downward pointer. */}
      <div className="absolute top-0 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center">
        <div
          className="flex flex-col items-center rounded-md px-3 py-1 shadow-[0_3px_8px_rgba(0,0,0,0.25)]"
          style={{ backgroundColor: RED }}
        >
          <button
            type="button"
            aria-label="Increase year"
            onClick={() => onYearChange(clampYear(year + 1))}
            className="-mb-1 text-white/70 transition-colors hover:text-white"
          >
            <ChevronUp className="size-4" />
          </button>
          <input
            aria-label="Selected year"
            type="number"
            min={MIN}
            max={MAX}
            inputMode="numeric"
            value={year}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isFinite(next)) onYearChange(clampYear(next));
            }}
            className="w-[60px] [appearance:textfield] bg-transparent text-center text-lg font-semibold text-white outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            type="button"
            aria-label="Decrease year"
            onClick={() => onYearChange(clampYear(year - 1))}
            className="-mt-1 text-white/70 transition-colors hover:text-white"
          >
            <ChevronDown className="size-4" />
          </button>
        </div>
        <div
          className="size-0 border-x-[7px] border-t-[8px] border-x-transparent"
          style={{ borderTopColor: RED }}
        />
      </div>

      <input
        aria-label="Timeline year"
        type="range"
        min={MIN}
        max={MAX}
        step={timelineBounds.step}
        value={year}
        onChange={(event) => onYearChange(Number(event.target.value))}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[120px] opacity-0"
      />
    </div>
  );
}
