"use client";

import { useEffect, useState } from "react";

import { useMap } from "@/registry/map";
import { cn } from "@/lib/utils";

// ─── MapScale ────────────────────────────────────────────────────────────────
//
// A scale-bar control that reports the real-world distance covered by a fixed
// pixel width. It computes the scale itself (rather than wrapping MapLibre's
// native ScaleControl) so it can render several cartographic styles — a plain
// line, a subdivided ruler, and alternating black/white bars — with optional
// dual metric + imperial measurements.
//
// The "nice number" rounding mirrors MapLibre's ScaleControl, and the
// alternating/ruler subdivision approach is adapted from OpenLayers' ScaleLine
// (BSD-2-Clause).

type Unit = "metric" | "imperial" | "nautical";

type Position = "top-left" | "top-right" | "bottom-left" | "bottom-right";

/**
 * Visual style of the scale bar:
 * - `line`        — simple bracketed line (MapLibre/Leaflet default)
 * - `ruler`       — baseline with graduated tick marks
 * - `bar`         — row of alternating black/white blocks
 * - `hollow-bar`  — outlined blocks with no fill
 *
 * Combine any style with `dual` to stack a second bar in the other unit.
 */
type Variant = "line" | "ruler" | "bar" | "hollow-bar";

/**
 * How the bar is labelled:
 * - `total`      — one label with the full distance (e.g. "500 m")
 * - `endpoints`  — labels at the start (0) and end (e.g. "500 m")
 * - `graduated`  — a label under each subdivision, thinned automatically so
 *                  they never overlap (always keeps the endpoints)
 */
type Labels = "total" | "endpoints" | "graduated";

type ScaleBar = {
  /** Rounded numeric distance, e.g. 500 */
  value: number;
  /** Unit suffix, e.g. "m" or "km" */
  unit: string;
  /** Width of the bar in pixels */
  width: number;
};

type MapScaleProps = {
  /** Position on the map (default: "bottom-left") */
  position?: Position;
  /** Max width of the scale bar in pixels (default: 100) */
  maxWidth?: number;
  /** Unit for the primary bar (default: "metric") */
  unit?: Unit;
  /**
   * Stack a second bar with the complementary unit (metric ⇄ imperial). Ignored
   * for the "nautical" unit. (default: false)
   */
  dual?: boolean;
  /** Visual style of the bar (default: "line") */
  variant?: Variant;
  /** Number of subdivisions for ruler/bar variants (default: 4) */
  steps?: number;
  /** How the bar is labelled (default: "total" for line, "graduated" otherwise) */
  labels?: Labels;
  /** Additional CSS classes for the container */
  className?: string;
};

const positionClasses: Record<Position, string> = {
  "top-left": "top-2 left-2",
  "top-right": "top-2 right-2",
  "bottom-left": "bottom-2 left-2",
  "bottom-right": "bottom-2 right-2",
};

// Approx. width budget for one subdivision label, used to thin graduated labels.
const MIN_LABEL_PX = 30;

// Round to a "nice" number (1, 2, 3, 5 × 10ⁿ) — mirrors MapLibre's ScaleControl
// so the rendered scale matches the native control pixel-for-pixel.
function getDecimalRoundNum(d: number): number {
  const multiplier = Math.pow(10, Math.ceil(-Math.log(d) / Math.LN10));
  return Math.round(d * multiplier) / multiplier;
}

function getRoundNum(num: number): number {
  const pow10 = Math.pow(10, `${Math.floor(num)}`.length - 1);
  let d = num / pow10;
  d =
    d >= 10 ? 10 : d >= 5 ? 5 : d >= 3 ? 3 : d >= 2 ? 2 : d >= 1 ? 1 : getDecimalRoundNum(d);
  return pow10 * d;
}

function buildBar(maxDistance: number, maxWidth: number, unit: string): ScaleBar {
  const value = getRoundNum(maxDistance);
  const ratio = value / maxDistance;
  return { value, unit, width: maxWidth * ratio };
}

function barFor(unit: Unit, maxMeters: number, maxWidth: number): ScaleBar {
  if (unit === "imperial") {
    const maxFeet = 3.2808 * maxMeters;
    return maxFeet > 5280
      ? buildBar(maxFeet / 5280, maxWidth, "mi")
      : buildBar(maxFeet, maxWidth, "ft");
  }
  if (unit === "nautical") {
    return buildBar(maxMeters / 1852, maxWidth, "nm");
  }
  return maxMeters >= 1000
    ? buildBar(maxMeters / 1000, maxWidth, "km")
    : buildBar(maxMeters, maxWidth, "m");
}

// Trim floating-point noise from subdivision labels (e.g. 124.99999 → 125).
function fmt(n: number): string {
  return `${Math.round(n * 1000) / 1000}`;
}

// Which subdivision boundaries should get a label so they don't overlap. Keeps
// the endpoints and picks the densest evenly-dividing stride that still fits.
function visibleLabelIndices(steps: number, width: number): number[] {
  const maxLabels = Math.max(2, Math.floor(width / MIN_LABEL_PX) + 1);
  if (steps + 1 <= maxLabels) {
    return Array.from({ length: steps + 1 }, (_, i) => i);
  }
  for (let stride = 2; stride <= steps; stride++) {
    if (steps % stride === 0 && steps / stride + 1 <= maxLabels) {
      const indices: number[] = [];
      for (let i = 0; i <= steps; i += stride) indices.push(i);
      return indices;
    }
  }
  return [0, steps];
}

const LABEL_CLASS =
  "text-foreground bg-background/70 absolute top-0 -translate-x-1/2 rounded-[2px] px-0.5 text-[9px] leading-none font-medium tabular-nums whitespace-nowrap";

function BarLabels({
  bar,
  labels,
  steps,
}: {
  bar: ScaleBar;
  labels: Labels;
  steps: number;
}) {
  if (labels === "total") {
    return (
      <span className={cn(LABEL_CLASS, "left-1/2")}>
        {fmt(bar.value)} {bar.unit}
      </span>
    );
  }

  if (labels === "endpoints") {
    return (
      <>
        <span className={cn(LABEL_CLASS, "left-0")}>0</span>
        <span className={cn(LABEL_CLASS, "left-full")}>
          {fmt(bar.value)} {bar.unit}
        </span>
      </>
    );
  }

  return (
    <>
      {visibleLabelIndices(steps, bar.width).map((i) => (
        <span
          key={i}
          className={LABEL_CLASS}
          style={{ left: `${(i / steps) * 100}%` }}
        >
          {i === steps ? `${fmt(bar.value)} ${bar.unit}` : fmt((bar.value * i) / steps)}
        </span>
      ))}
    </>
  );
}

// Tick marks spanning a subdivided width; anchored to the baseline and pointing
// away from it (up for the primary scale, down for the secondary).
function Ticks({ steps, side }: { steps: number; side: "up" | "down" }) {
  return Array.from({ length: steps + 1 }, (_, i) => (
    <span
      key={i}
      className={cn(
        "bg-foreground/80 absolute h-1.5 w-px -translate-x-1/2",
        side === "up" ? "bottom-0" : "top-0",
      )}
      style={{ left: `${(i / steps) * 100}%` }}
    />
  ));
}

// The alternating / hollow blocks for a bar variant.
function BarRow({
  variant,
  steps,
  flip,
}: {
  variant: "bar" | "hollow-bar";
  steps: number;
  flip?: boolean;
}) {
  if (variant === "bar") {
    return (
      <>
        {Array.from({ length: steps }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-full flex-1",
              (i + (flip ? 1 : 0)) % 2 === 0 ? "bg-foreground/85" : "bg-background",
            )}
          />
        ))}
      </>
    );
  }
  return (
    <>
      {Array.from({ length: steps }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-full flex-1",
            i < steps - 1 && "border-foreground/50 border-r",
          )}
        />
      ))}
    </>
  );
}

function StyledBar({
  bar,
  variant,
  steps,
  labels,
}: {
  bar: ScaleBar;
  variant: Exclude<Variant, "line">;
  steps: number;
  labels: Labels;
}) {
  return (
    <div className="relative pt-3.5" style={{ width: `${bar.width}px` }}>
      <BarLabels bar={bar} labels={labels} steps={steps} />

      {variant === "ruler" && (
        <div className="relative h-2 w-full">
          <div className="bg-foreground/80 absolute bottom-0 h-px w-full" />
          <div className="absolute bottom-0 h-2 w-full">
            <Ticks steps={steps} side="up" />
          </div>
        </div>
      )}

      {variant !== "ruler" && (
        <div className="border-foreground/80 flex h-1.5 w-full overflow-hidden rounded-[1px] border">
          <BarRow variant={variant} steps={steps} />
        </div>
      )}
    </div>
  );
}

// A combined dual scale: one shared baseline with the primary unit marked above
// and the complementary unit marked below — the classic cartographic dual bar.
function CombinedBar({
  primary,
  secondary,
  variant,
  steps,
  labels,
}: {
  primary: ScaleBar;
  secondary: ScaleBar;
  variant: Exclude<Variant, "line">;
  steps: number;
  labels: Labels;
}) {
  const width = Math.max(primary.width, secondary.width);

  if (variant === "ruler") {
    return (
      <div className="relative" style={{ width: `${width}px` }}>
        <div className="relative h-3" style={{ width: `${primary.width}px` }}>
          <BarLabels bar={primary} labels={labels} steps={steps} />
        </div>
        <div className="relative h-1.5" style={{ width: `${primary.width}px` }}>
          <Ticks steps={steps} side="up" />
        </div>
        <div className="bg-foreground/80 h-px" style={{ width: `${width}px` }} />
        <div className="relative h-1.5" style={{ width: `${secondary.width}px` }}>
          <Ticks steps={steps} side="down" />
        </div>
        <div className="relative h-3" style={{ width: `${secondary.width}px` }}>
          <BarLabels bar={secondary} labels={labels} steps={steps} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative" style={{ width: `${width}px` }}>
      <div className="relative h-3" style={{ width: `${primary.width}px` }}>
        <BarLabels bar={primary} labels={labels} steps={steps} />
      </div>
      <div
        className="border-foreground/80 flex h-1.5 overflow-hidden border"
        style={{ width: `${primary.width}px` }}
      >
        <BarRow variant={variant} steps={steps} />
      </div>
      <div
        className="border-foreground/80 -mt-px flex h-1.5 overflow-hidden border"
        style={{ width: `${secondary.width}px` }}
      >
        <BarRow variant={variant} steps={steps} flip />
      </div>
      <div className="relative h-3" style={{ width: `${secondary.width}px` }}>
        <BarLabels bar={secondary} labels={labels} steps={steps} />
      </div>
    </div>
  );
}

function MapScale({
  position = "bottom-left",
  maxWidth = 100,
  unit = "metric",
  dual = false,
  variant = "line",
  steps = 4,
  labels,
  className,
}: MapScaleProps) {
  const { map, isLoaded } = useMap();
  const [bars, setBars] = useState<ScaleBar[]>([]);

  useEffect(() => {
    if (!isLoaded || !map) return;

    const update = () => {
      // Distance covered by `maxWidth` pixels at the vertical center of the map.
      const y = map.getContainer().clientHeight / 2;
      const maxMeters = map
        .unproject([0, y])
        .distanceTo(map.unproject([maxWidth, y]));

      const primary = barFor(unit, maxMeters, maxWidth);

      if (!dual || unit === "nautical") {
        setBars([primary]);
        return;
      }

      const secondaryUnit: Unit = unit === "metric" ? "imperial" : "metric";
      setBars([primary, barFor(secondaryUnit, maxMeters, maxWidth)]);
    };

    update();
    map.on("move", update);

    return () => {
      map.off("move", update);
    };
  }, [isLoaded, map, maxWidth, unit, dual]);

  if (bars.length === 0) return null;

  const stepCount = Math.max(1, Math.round(steps));
  const labelMode: Labels = labels ?? (variant === "line" ? "total" : "graduated");

  // The original bracketed line keeps its mirrored dual layout.
  if (variant === "line") {
    return (
      <div
        className={cn(
          "pointer-events-none absolute z-10 flex flex-col",
          positionClasses[position],
          className,
        )}
      >
        {bars.map((bar, index) => (
          <div
            key={index}
            style={{ width: `${bar.width}px` }}
            className={cn(
              "border-foreground/60 bg-background/60 text-foreground box-border",
              "border-2 px-1 text-[10px] leading-4 font-medium whitespace-nowrap tabular-nums backdrop-blur-[1px]",
              index === 0 ? "border-t-0" : "-mt-0.5 border-b-0",
            )}
          >
            {fmt(bar.value)} {bar.unit}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-10 flex flex-col gap-2",
        positionClasses[position],
        className,
      )}
    >
      {bars.length === 2 ? (
        <CombinedBar
          primary={bars[0]}
          secondary={bars[1]}
          variant={variant}
          steps={stepCount}
          labels={labelMode}
        />
      ) : (
        <StyledBar
          bar={bars[0]}
          variant={variant}
          steps={stepCount}
          labels={labelMode}
        />
      )}
    </div>
  );
}

export { MapScale };
export type { MapScaleProps };
