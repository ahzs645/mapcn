"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";

/**
 * A deterministic, parchment-styled "old map" thumbnail rendered entirely in
 * SVG. There are no external assets, so each result card gets a distinct,
 * stable illustration derived from its id — a stand-in for the scanned map
 * thumbnails OldMapsOnline shows in its results list.
 */
function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function MapThumbnail({
  seed,
  className,
}: {
  seed: string;
  className?: string;
}) {
  const { coast, rivers, graticule, hue } = useMemo(() => {
    const rand = mulberry32(hashString(seed));
    const size = 64;

    // A wandering coastline that divides "land" from "sea".
    const points: string[] = [];
    let y = 14 + rand() * 14;
    for (let x = 0; x <= size; x += 8) {
      y += (rand() - 0.5) * 14;
      y = Math.max(8, Math.min(size - 8, y));
      points.push(`${x},${y.toFixed(1)}`);
    }
    const coast = `M0,${size} L0,${points[0].split(",")[1]} ${points
      .map((p) => `L${p}`)
      .join(" ")} L${size},${size} Z`;

    // A couple of meandering rivers.
    const rivers: string[] = [];
    const riverCount = 1 + Math.floor(rand() * 2);
    for (let r = 0; r < riverCount; r += 1) {
      let rx = 10 + rand() * (size - 20);
      let ry = size;
      let path = `M${rx.toFixed(1)},${ry}`;
      while (ry > 6) {
        ry -= 7 + rand() * 5;
        rx += (rand() - 0.5) * 16;
        rx = Math.max(4, Math.min(size - 4, rx));
        path += ` L${rx.toFixed(1)},${ry.toFixed(1)}`;
      }
      rivers.push(path);
    }

    const graticule = [16, 32, 48];
    const hue = 28 + Math.floor(rand() * 18); // warm sepia range
    return { coast, rivers, graticule, hue };
  }, [seed]);

  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("h-full w-full", className)}
      role="img"
      aria-hidden="true"
    >
      <rect width="64" height="64" fill={`hsl(${hue} 44% 86%)`} />
      <path d={coast} fill={`hsl(${hue} 34% 78%)`} />
      {graticule.map((g) => (
        <g key={g} stroke={`hsl(${hue} 30% 64%)`} strokeWidth="0.4" opacity="0.5">
          <line x1={g} y1="0" x2={g} y2="64" />
          <line x1="0" y1={g} x2="64" y2={g} />
        </g>
      ))}
      {rivers.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={`hsl(${hue} 36% 52%)`}
          strokeWidth="0.9"
          strokeLinecap="round"
          opacity="0.8"
        />
      ))}
      <circle
        cx="50"
        cy="14"
        r="5"
        fill="none"
        stroke={`hsl(${hue} 40% 40%)`}
        strokeWidth="0.7"
        opacity="0.7"
      />
      <path
        d="M50,9 L51.4,14 L50,19 L48.6,14 Z"
        fill={`hsl(${hue} 40% 40%)`}
        opacity="0.7"
      />
      <rect
        x="1"
        y="1"
        width="62"
        height="62"
        fill="none"
        stroke={`hsl(${hue} 38% 46%)`}
        strokeWidth="1.4"
        opacity="0.65"
      />
    </svg>
  );
}
