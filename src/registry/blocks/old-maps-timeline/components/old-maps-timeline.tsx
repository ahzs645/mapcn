"use client";

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

function clampYear(year: number) {
  return Math.min(timelineBounds.max, Math.max(timelineBounds.min, year));
}

const YEAR_WIDTH = 10;
const TIMELINE_YEARS = timelineBounds.max - timelineBounds.min + 1;
const STRIP_WIDTH = TIMELINE_YEARS * YEAR_WIDTH;

function yearToOffset(year: number) {
  return (year - timelineBounds.min) * YEAR_WIDTH;
}

function mapCountNearYear(maps: HistoricalMapRecord[], year: number) {
  return maps.filter((map) => Math.abs(map.year - year) <= 18).length;
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
  const selectedMap = maps.find((map) => map.id === selectedMapId);
  const currentOffset = yearToOffset(year);
  const years = Array.from(
    { length: TIMELINE_YEARS },
    (_, index) => timelineBounds.min + index,
  );
  const decadeLabels = years.filter((sliceYear) => sliceYear % 50 === 0);

  function updateYearFromPointer(clientX: number, element: HTMLDivElement) {
    const rect = element.getBoundingClientRect();
    const yearOffset = (clientX - rect.left - rect.width / 2) / YEAR_WIDTH;
    onYearChange(clampYear(Math.round(year + yearOffset)));
  }

  return (
    <div
      className={cn(
        "absolute right-0 bottom-0 left-0 z-20 h-[176px] md:bottom-[30px] md:h-[136px]",
        className,
      )}
    >
      <div className="from-background via-background/60 pointer-events-none absolute inset-0 bg-gradient-to-t to-transparent" />

      <div className="group bg-primary absolute top-3 left-1/2 z-20 flex -translate-x-1/2 items-center rounded-lg shadow-[0_2px_5px_rgba(0,0,0,0.15)] md:top-0">
        <button
          type="button"
          aria-label="Previous year"
          onClick={() => onYearChange(clampYear(year - 1))}
          className="text-primary-foreground/80 hover:text-primary-foreground grid h-[36px] w-[28px] place-items-center opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
        >
          <ChevronUp className="size-4" />
        </button>
        <input
          aria-label="Selected year"
          type="number"
          min={timelineBounds.min}
          max={timelineBounds.max}
          inputMode="numeric"
          value={year}
          onChange={(event) => {
            const nextYear = Number(event.target.value);
            if (Number.isFinite(nextYear)) onYearChange(clampYear(nextYear));
          }}
          className="bg-background text-foreground h-9 w-[66px] [appearance:textfield] rounded-lg text-center text-lg font-medium outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          aria-label="Next year"
          onClick={() => onYearChange(clampYear(year + 1))}
          className="text-primary-foreground/80 hover:text-primary-foreground grid h-[36px] w-[28px] place-items-center opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
        >
          <ChevronDown className="size-4" />
        </button>
      </div>

      <div className="pointer-events-none absolute right-0 bottom-0 left-0 z-10 h-[112px] md:h-[104px]">
        <div
          className="absolute top-[18px] flex -translate-x-1/2 items-center md:top-[17px]"
          style={{
            left: `calc(50% + ${yearToOffset(selectedMap?.year ?? year) - currentOffset}px)`,
          }}
        >
          <button
            type="button"
            aria-label="Previous map"
            onClick={() => onYearChange(clampYear(year - 1))}
            className="bg-primary text-primary-foreground pointer-events-auto grid size-8 place-items-center rounded-full opacity-0 shadow-sm transition-opacity hover:opacity-100 focus:opacity-100"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next map"
            onClick={() => onYearChange(clampYear(year + 1))}
            className="bg-primary text-primary-foreground pointer-events-auto grid size-8 place-items-center rounded-full opacity-0 shadow-sm transition-opacity hover:opacity-100 focus:opacity-100"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div
        className="absolute right-0 bottom-0 left-0 z-[2] h-[112px] cursor-grab overflow-hidden px-[50%] select-none [mask:linear-gradient(90deg,rgba(0,0,0,0)_0%,#000_7.5%,#000_92.5%,rgba(0,0,0,0)_100%)] active:cursor-grabbing md:h-[104px]"
        onPointerDown={(event) => {
          updateYearFromPointer(event.clientX, event.currentTarget);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (event.buttons !== 1) return;
          updateYearFromPointer(event.clientX, event.currentTarget);
        }}
      >
        <div
          className="relative h-full transition-transform duration-300 ease-out"
          style={{
            width: STRIP_WIDTH,
            transform: `translateX(${-currentOffset}px)`,
          }}
        >
          {years.map((sliceYear) => {
            const count = mapCountNearYear(maps, sliceYear);
            const major = sliceYear % 50 === 0;
            const bold = sliceYear % 100 === 0;

            return (
              <div
                key={sliceYear}
                className="absolute bottom-[52px] h-[30px] md:bottom-12"
                style={{ left: yearToOffset(sliceYear), width: YEAR_WIDTH }}
              >
                <div
                  className={cn(
                    "bg-muted-foreground/40 absolute bottom-0 left-0 w-px",
                    major && "bg-muted-foreground/70 h-5",
                    bold && "bg-foreground h-6",
                    !major && !bold && "h-[7px]",
                  )}
                />
                {count ? (
                  <div
                    className={cn(
                      "bg-primary absolute bottom-0 left-0 w-[6px] origin-bottom rounded-t-sm opacity-40 transition-transform duration-500",
                      Math.abs(sliceYear - year) <= 10 && "opacity-90",
                    )}
                    style={{
                      height: 30,
                      transform: `scale3d(1, ${Math.min(1, count / 4)}, 1)`,
                    }}
                  />
                ) : null}
              </div>
            );
          })}

          {decadeLabels.map((tick) => (
            <button
              key={tick}
              type="button"
              onClick={() => onYearChange(tick)}
              className="text-muted-foreground hover:text-foreground absolute bottom-0 w-[42px] -translate-x-[21px] text-sm tabular-nums transition-colors"
              style={{ left: yearToOffset(tick) }}
            >
              {tick}
            </button>
          ))}

          {maps.map((map) => {
            const isSelected = map.id === selectedMapId;
            const isHovered = !isSelected && map.id === hoveredMapId;
            return (
              <button
                key={map.id}
                type="button"
                aria-label={`${map.title}, ${map.year}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectMap(map.id);
                }}
                onPointerDown={(event) => event.stopPropagation()}
                onPointerEnter={() => onHoverMap?.(map.id)}
                onPointerLeave={() => onHoverMap?.(null)}
                className={cn(
                  "border-background absolute bottom-[39px] -translate-x-1/2 rounded-full border-2 transition-transform hover:scale-110",
                  isSelected
                    ? "bg-background ring-primary z-10 size-[34px] cursor-grab shadow-md ring-[10px] active:cursor-grabbing"
                    : isHovered
                      ? "bg-primary/70 z-[5] size-4 shadow-md"
                      : "bg-muted-foreground size-3 shadow-sm",
                )}
                style={{ left: yearToOffset(map.year) }}
              />
            );
          })}
        </div>
      </div>

      <input
        aria-label="Timeline year"
        type="range"
        min={timelineBounds.min}
        max={timelineBounds.max}
        step={timelineBounds.step}
        value={year}
        onChange={(event) => onYearChange(Number(event.target.value))}
        className="pointer-events-none absolute right-0 bottom-0 left-0 z-[1] h-[112px] opacity-0 md:h-[104px]"
      />

      {selectedMap ? (
        <div className="bg-background/95 ring-border pointer-events-none absolute bottom-[154px] left-1/2 hidden max-w-[260px] -translate-x-1/2 truncate rounded-md px-3 py-1.5 text-xs shadow-sm ring-1 backdrop-blur sm:block md:bottom-[118px]">
          <span className="font-medium">{selectedMap.title}</span>
        </div>
      ) : null}
    </div>
  );
}
