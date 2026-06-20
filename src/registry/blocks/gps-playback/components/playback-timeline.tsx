"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { formatClock, formatDay, sampleTime, type GpsTrack } from "../data";

type Bounds = { start: number; end: number };

type PlaybackTimelineProps = {
  tracks: GpsTrack[];
  /** Full extent of the data (epoch ms). */
  bounds: Bounds;
  /** Current cursor position (epoch ms). */
  currentTime: number;
  /** Seek the cursor to an absolute time. */
  onSeek: (time: number) => void;
  /** Called when the user grabs the cursor (used to pause during a scrub). */
  onScrubStart?: () => void;
  /** Called when the user releases the cursor. */
  onScrubEnd?: () => void;
  className?: string;
};

// Geometry of the timeline graph, in px.
const GRAPH_HEIGHT = 104;
const AXIS_Y = 64;
const ROW_TOP = 9;
const ROW_HEIGHT = 22;
const ROW_GAP = 4;

// Candidate axis steps (ms), from 1s up to 1 day — the timeline snaps grid
// lines to the smallest of these that keeps labels from crowding.
const TICK_STEPS = [
  1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 10800, 21600,
  43200, 86400,
].map((s) => s * 1000);

type WindowConfig = {
  outerMin: number;
  outerMax: number;
  minSpan: number;
  maxSpan: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

function clampWindow(cfg: WindowConfig, start: number, end: number): Bounds {
  const span = clamp(end - start, cfg.minSpan, cfg.maxSpan);
  let nextStart = start;
  let nextEnd = start + span;
  if (nextStart < cfg.outerMin) {
    nextStart = cfg.outerMin;
    nextEnd = nextStart + span;
  }
  if (nextEnd > cfg.outerMax) {
    nextEnd = cfg.outerMax;
    nextStart = Math.max(cfg.outerMin, nextEnd - span);
  }
  return { start: nextStart, end: nextEnd };
}

function chooseStep(span: number, width: number): number {
  const targetTicks = Math.max(2, width / 90);
  const raw = span / targetTicks;
  return TICK_STEPS.find((step) => step >= raw) ?? TICK_STEPS[TICK_STEPS.length - 1];
}

function withAlpha(hex: string, alpha: number): string {
  const value = parseInt(hex.replace("#", ""), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type DragState =
  | { mode: "idle" }
  | {
      mode: "pan";
      startX: number;
      winStart: number;
      winEnd: number;
      moved: boolean;
    }
  | { mode: "cursor" };

export function PlaybackTimeline({
  tracks,
  bounds,
  currentTime,
  onSeek,
  onScrubStart,
  onScrubEnd,
  className,
}: PlaybackTimelineProps) {
  const graphRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  const cfg = useMemo<WindowConfig>(() => {
    const dataSpan = bounds.end - bounds.start;
    const pad = dataSpan * 0.06;
    return {
      outerMin: bounds.start - pad * 2,
      outerMax: bounds.end + pad * 2,
      minSpan: Math.min(60_000, dataSpan),
      maxSpan: dataSpan + pad * 4,
    };
  }, [bounds]);

  const [win, setWin] = useState<Bounds>(() => {
    const pad = (bounds.end - bounds.start) * 0.06;
    return { start: bounds.start - pad, end: bounds.end + pad };
  });

  // Refs so the native (non-passive) wheel handler always sees fresh values.
  const winRef = useRef(win);
  const cfgRef = useRef(cfg);
  const dragRef = useRef<DragState>({ mode: "idle" });

  useEffect(() => {
    winRef.current = win;
    cfgRef.current = cfg;
  });

  const span = win.end - win.start;
  const timeToX = (t: number) => (width ? ((t - win.start) / span) * width : 0);

  // Measure the graph width.
  useEffect(() => {
    const el = graphRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  // Wheel-to-zoom, anchored on the time under the pointer. Registered natively
  // so preventDefault works (React's onWheel is passive).
  useEffect(() => {
    const el = graphRef.current;
    if (!el) return;
    const handler = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return;
      const current = winRef.current;
      const config = cfgRef.current;
      const currentSpan = current.end - current.start;
      const ratio = (event.clientX - rect.left) / rect.width;
      const pivot = current.start + ratio * currentSpan;
      const factor = event.deltaY > 0 ? 1.18 : 1 / 1.18;
      const nextSpan = clamp(
        currentSpan * factor,
        config.minSpan,
        config.maxSpan,
      );
      setWin(
        clampWindow(config, pivot - ratio * nextSpan, pivot + (1 - ratio) * nextSpan),
      );
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  function handleBackgroundPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (width <= 0) return;
    graphRef.current?.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode: "pan",
      startX: event.clientX,
      winStart: win.start,
      winEnd: win.end,
      moved: false,
    };
  }

  function handleBackgroundPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (drag.mode !== "pan") return;
    const rect = graphRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = event.clientX - drag.startX;
    if (Math.abs(dx) > 3) drag.moved = true;
    const dragSpan = drag.winEnd - drag.winStart;
    const dt = (dx / rect.width) * dragSpan;
    setWin(clampWindow(cfg, drag.winStart - dt, drag.winEnd - dt));
  }

  function handleBackgroundPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const rect = graphRef.current?.getBoundingClientRect();
    if (drag.mode === "pan" && !drag.moved && rect) {
      const x = event.clientX - rect.left;
      onSeek(clamp(win.start + (x / rect.width) * span, bounds.start, bounds.end));
    }
    dragRef.current = { mode: "idle" };
    try {
      graphRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  }

  function handleCursorPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { mode: "cursor" };
    onScrubStart?.();
  }

  function handleCursorPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current.mode !== "cursor") return;
    event.stopPropagation();
    const rect = graphRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = event.clientX - rect.left;
    onSeek(clamp(win.start + (x / rect.width) * span, bounds.start, bounds.end));
  }

  function handleCursorPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current.mode === "cursor") {
      event.stopPropagation();
      onScrubEnd?.();
    }
    dragRef.current = { mode: "idle" };
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  }

  const step = chooseStep(span, width || 1);
  const withSeconds = step < 60_000;
  const ticks: number[] = [];
  if (width > 0) {
    const first = Math.ceil(win.start / step) * step;
    for (let t = first; t <= win.end; t += step) ticks.push(t);
  }

  const cursorX = timeToX(currentTime);
  const cursorVisible = cursorX >= -8 && cursorX <= width + 8;

  return (
    <div className={cn("select-none", className)}>
      <div
        ref={graphRef}
        className="relative w-full cursor-grab touch-none overflow-hidden active:cursor-grabbing"
        style={{ height: GRAPH_HEIGHT }}
        onPointerDown={handleBackgroundPointerDown}
        onPointerMove={handleBackgroundPointerMove}
        onPointerUp={handleBackgroundPointerUp}
        onPointerCancel={handleBackgroundPointerUp}
      >
        {/* Vertical grid lines */}
        {ticks.map((t) => (
          <div
            key={`grid-${t}`}
            className="bg-border/60 absolute top-0 w-px"
            style={{ left: timeToX(t), height: AXIS_Y }}
          />
        ))}

        {/* Track range bars */}
        {tracks.map((track, index) => {
          const left = timeToX(sampleTime(track.samples[0]));
          const right = timeToX(
            sampleTime(track.samples[track.samples.length - 1]),
          );
          return (
            <div
              key={track.id}
              className="absolute flex items-center gap-1.5 overflow-hidden rounded-md border px-2 text-xs font-medium shadow-sm"
              style={{
                left,
                width: Math.max(0, right - left),
                top: ROW_TOP + index * (ROW_HEIGHT + ROW_GAP),
                height: ROW_HEIGHT,
                backgroundColor: withAlpha(track.color, 0.16),
                borderColor: withAlpha(track.color, 0.5),
              }}
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: track.color }}
              />
              <span className="text-foreground/90 truncate">{track.label}</span>
            </div>
          );
        })}

        {/* Axis baseline */}
        <div
          className="bg-border absolute right-0 left-0 h-px"
          style={{ top: AXIS_Y }}
        />

        {/* Minor tick marks + labels */}
        {ticks.map((t) => (
          <div key={`label-${t}`}>
            <div
              className="bg-border absolute w-px"
              style={{ left: timeToX(t), top: AXIS_Y, height: 5 }}
            />
            <div
              className="text-muted-foreground absolute -translate-x-1/2 text-[11px] tabular-nums"
              style={{ left: timeToX(t), top: AXIS_Y + 8 }}
            >
              {formatClock(t, withSeconds)}
            </div>
          </div>
        ))}

        {/* Major (day) label */}
        <div
          className="text-foreground/80 absolute left-0 text-xs font-medium"
          style={{ top: AXIS_Y + 24 }}
        >
          {formatDay(win.start)}
        </div>

        {/* Draggable cursor (custom time) */}
        {cursorVisible && (
          <div
            className="absolute top-0 z-10 flex w-4 cursor-ew-resize justify-center"
            style={{ left: cursorX - 8, height: AXIS_Y }}
            title={`${formatDay(currentTime)} · ${formatClock(currentTime, true)}`}
            onPointerDown={handleCursorPointerDown}
            onPointerMove={handleCursorPointerMove}
            onPointerUp={handleCursorPointerUp}
            onPointerCancel={handleCursorPointerUp}
          >
            <div className="h-full w-0.5 bg-sky-500" />
            <div className="absolute top-0.5 size-2.5 rounded-full border-2 border-white bg-sky-500 shadow dark:border-neutral-900" />
          </div>
        )}
      </div>
    </div>
  );
}
