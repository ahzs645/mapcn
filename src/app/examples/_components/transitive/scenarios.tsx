"use client";

/**
 * Engine scenario explorer — shared by the published `/examples/transitive`
 * sidebar and the internal `/dev/transitive-engine` page.
 *
 * Each scenario runs a crafted dataset through the REAL bundling engine
 * (`./engine/bundle`) and renders the schematic frame as SVG (no map / no morph)
 * so each gap we ported from transitive.js is visible via a before→after toggle:
 *   - computeLaneOffsets  → G1 alignment bundling + G3 lane ordering
 *   - offsetPolyline      → G2 per-end taper + G5/G6 miter corners
 *   - pruneEdges          → G7 degree-2 chain fusion
 *   - clusterStops        → G8 nearby-stop clustering
 */

import { useMemo, useState } from "react";

import {
  clusterStops,
  computeLaneOffsets,
  offsetPolyline,
  pruneEdges,
  toMetric,
} from "./engine/bundle";
import type { LngLat, RenderedEdge } from "./types";

/** The default canvas: the live MapLibre DC network, not a crafted demo. */
export const LIVE_SCENARIO_ID = "live";

export type Gap = "G1" | "G2" | "G3" | "G5" | "G6" | "G7" | "G8";

type DemoStop = { id: string; pos: LngLat; name?: string };
type DemoRoute = {
  id: string;
  color: string;
  width: number;
  stops: string[];
  /** schematic coords; `anchors` maps each stop to its coord index */
  coords: LngLat[];
  anchors?: number[];
};

export type Scenario = {
  id: string;
  name: string;
  gaps: Gap[];
  blurb: string;
  toggleLabel: string;
  stops: DemoStop[];
  routes: DemoRoute[];
};

// helper to lay coords near DC so the metric frame (lat0≈38.9) is well-conditioned
const P = (x: number, y: number): LngLat => [-77.05 + x * 0.004, 38.89 + y * 0.004];

export const SCENARIOS: Scenario[] = [
  {
    id: "bundle",
    name: "Cross-corridor bundle",
    gaps: ["G1", "G2", "G3"],
    blurb:
      "Red arrives from a different corridor (down from Farragut) but is collinear with the Orange/Blue trunk into the hub. Alignment bundling makes it a true 3rd lane; the per-end taper keeps it connected to its own terminal.",
    toggleLabel: "Alignment bundling (vs corridor grouping)",
    stops: [
      { id: "ros", pos: P(0, 2), name: "Rosslyn" },
      { id: "far", pos: P(3, 5), name: "Farragut" },
      { id: "hub", pos: P(7, 2), name: "Metro Center" },
      { id: "uni", pos: P(11, 2), name: "Union" },
    ],
    routes: [
      { id: "BLUE", color: "#2f7fbd", width: 1, stops: ["ros", "hub"], coords: [P(0, 2), P(7, 2)] },
      { id: "ORANGE", color: "#f08d32", width: 1, stops: ["ros", "hub"], coords: [P(0, 2), P(7, 2)] },
      {
        id: "RED",
        color: "#df4638",
        width: 1,
        stops: ["far", "hub", "uni"],
        coords: [P(3, 5), P(5, 2), P(7, 2), P(11, 2)],
        anchors: [0, 2, 3],
      },
    ],
  },
  {
    id: "prune",
    name: "Pass-through chain",
    gaps: ["G7"],
    blurb:
      "A route with several pass-through stops on a shared trunk. Without pruning each stop-pair is its own edge (a chain); pruning fuses the degree-2 run into ONE edge so the whole trunk shares a single alignment and bundles as one lane.",
    toggleLabel: "Prune degree-2 chains",
    stops: [
      { id: "a", pos: P(0, 3), name: "A" },
      { id: "b", pos: P(2, 3), name: "B" },
      { id: "c", pos: P(4, 3), name: "C" },
      { id: "d", pos: P(6, 3), name: "D" },
      { id: "e", pos: P(8, 3), name: "E" },
      { id: "a2", pos: P(0, 1) },
      { id: "e2", pos: P(8, 1) },
    ],
    routes: [
      {
        id: "RED",
        color: "#df4638",
        width: 1,
        stops: ["a", "b", "c", "d", "e"],
        coords: [P(0, 3), P(2, 3), P(4, 3), P(6, 3), P(8, 3)],
      },
      { id: "BLUE", color: "#2f7fbd", width: 1, stops: ["a2", "e2"], coords: [P(0, 1), P(8, 1)] },
    ],
  },
  {
    id: "cluster",
    name: "Nearby stops (clustering)",
    gaps: ["G8"],
    blurb:
      "Several stops sit close together. Drag the threshold up (= zooming out) and PointClusterMap merges them into one marker; drop it (= zooming in) and they split apart again.",
    toggleLabel: "(use the threshold slider)",
    stops: [
      { id: "s1", pos: P(0, 2), name: "Start" },
      { id: "s2", pos: P(3, 2.2), name: "Foggy" },
      { id: "s3", pos: P(3.4, 1.9), name: "GWU" },
      { id: "s4", pos: P(3.7, 2.3), name: "K St" },
      { id: "s5", pos: P(7, 2), name: "Metro" },
    ],
    routes: [
      {
        id: "ORANGE",
        color: "#f08d32",
        width: 1,
        stops: ["s1", "s2", "s3", "s4", "s5"],
        coords: [P(0, 2), P(3, 2.2), P(3.4, 1.9), P(3.7, 2.3), P(7, 2)],
      },
    ],
  },
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

// build per-stop-pair RenderedEdges from a scenario's routes
function buildEdges(routes: DemoRoute[]): RenderedEdge[] {
  const edges: RenderedEdge[] = [];
  for (const r of routes) {
    const anchors = r.anchors ?? r.stops.map((_, i) => i);
    for (let i = 0; i < r.stops.length - 1; i++) {
      const seg = r.coords.slice(anchors[i], anchors[i + 1] + 1);
      edges.push({
        edge_id: `${r.id}__${i}`,
        pattern_id: r.id,
        route_id: r.id,
        from_stop_id: r.stops[i],
        to_stop_id: r.stops[i + 1],
        geo: seg,
        schematic: seg,
        anchors: [0, seg.length - 1],
        offset: 0,
        width: r.width,
        color: r.color,
        mode: "transit",
      });
    }
  }
  return edges;
}

// naive corridor grouping (the OLD behaviour) — bundles only same stop-pair
function corridorLaneOffsets(edges: RenderedEdge[]): void {
  const groups = new Map<string, RenderedEdge[]>();
  for (const e of edges) {
    const key = [e.from_stop_id, e.to_stop_id].sort().join("__");
    const arr = groups.get(key);
    if (arr) arr.push(e);
    else groups.set(key, [e]);
  }
  for (const arr of groups.values()) {
    const n = arr.length;
    arr
      .sort((a, b) => (a.route_id < b.route_id ? -1 : 1))
      .forEach((e, i) => {
        e.fromLane = i - (n - 1) / 2;
        e.toLane = i - (n - 1) / 2;
      });
  }
}

export type ScenarioMarker = {
  x: number;
  y: number;
  count: number;
  name?: string;
  extra: number;
};
export type ScenarioView = {
  lines: { edge: RenderedEdge; points: [number, number][] }[];
  markers: ScenarioMarker[];
  W: number;
  H: number;
  edgeCount: number;
  origEdges: number;
};

/** Run a scenario through the engine and project it into SVG space. Pure. */
export function computeScenarioView(
  scenario: Scenario,
  feature: boolean,
  threshold: number,
): ScenarioView {
  const edges0 = buildEdges(scenario.routes);
  const edges = scenario.id === "prune" && feature ? pruneEdges(edges0) : edges0;

  if (scenario.id === "bundle" && !feature) corridorLaneOffsets(edges);
  else computeLaneOffsets(edges);

  // fit metric bbox → svg
  const all = edges.flatMap((e) => e.schematic).map(toMetric);
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const W = 820, H = 380, pad = 60;
  const sx = (W - 2 * pad) / (maxX - minX || 1);
  const sy = (H - 2 * pad) / (maxY - minY || 1);
  const s = Math.min(sx, sy);
  const r2 = (n: number) => Math.round(n * 100) / 100; // deterministic for SSR
  const project = (p: LngLat): [number, number] => {
    const m = toMetric(p);
    return [r2(pad + (m[0] - minX) * s), r2(H - pad - (m[1] - minY) * s)]; // y up
  };
  const laneWidthM = 11 / s; // ~11px lanes regardless of scenario scale

  const lines = edges.map((e) => {
    const off = offsetPolyline(
      e.schematic,
      (e.fromLane ?? 0) * laneWidthM,
      (e.toLane ?? 0) * laneWidthM,
    );
    return { edge: e, points: off.map(project) };
  });

  // stops (+ optional clustering for the cluster scenario)
  let clusterRep = new Map<string, string>();
  if (scenario.id === "cluster") {
    clusterRep = clusterStops(
      scenario.stops.map((st) => ({ id: st.id, pos: st.pos })),
      threshold,
    );
  }
  const clusters = new Map<string, { ids: string[]; sum: [number, number] }>();
  for (const st of scenario.stops) {
    const rep = clusterRep.get(st.id) ?? st.id;
    const m = toMetric(st.pos);
    const c = clusters.get(rep);
    if (c) {
      c.ids.push(st.id);
      c.sum = [c.sum[0] + m[0], c.sum[1] + m[1]];
    } else clusters.set(rep, { ids: [st.id], sum: [m[0], m[1]] });
  }
  const markers: ScenarioMarker[] = [...clusters.values()].map((c) => {
    const cx = c.sum[0] / c.ids.length;
    const cy = c.sum[1] / c.ids.length;
    const px = r2(pad + (cx - minX) * s);
    const py = r2(H - pad - (cy - minY) * s);
    const names = c.ids
      .map((id) => scenario.stops.find((st) => st.id === id)?.name)
      .filter(Boolean) as string[];
    return { x: px, y: py, count: c.ids.length, name: names[0], extra: names.length - 1 };
  });

  return { lines, markers, W, H, edgeCount: edges.length, origEdges: edges0.length };
}

/** Presentational SVG for a computed scenario view. */
export function ScenarioCanvas({
  view,
  className,
}: {
  view: ScenarioView;
  className?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${view.W} ${view.H}`}
      className={className}
      style={{ background: "#fafafa" }}
    >
      {/* light grid */}
      {Array.from({ length: 9 }).map((_, i) => (
        <line
          key={`v${i}`}
          x1={(i * view.W) / 8}
          y1={0}
          x2={(i * view.W) / 8}
          y2={view.H}
          stroke="#eee"
        />
      ))}
      {view.lines.map((l) => (
        <polyline
          key={l.edge.edge_id}
          points={l.points.map((p) => p.join(",")).join(" ")}
          fill="none"
          stroke={l.edge.color}
          strokeWidth={9}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.95}
        />
      ))}
      {view.markers.map((m, i) => (
        <g key={i}>
          <circle
            cx={m.x}
            cy={m.y}
            r={m.count > 1 ? 9 : 6}
            fill="#fff"
            stroke={m.count > 1 ? "#0b1f4d" : "#333"}
            strokeWidth={m.count > 1 ? 3 : 2}
          />
          {m.name && (
            <text x={m.x + 11} y={m.y + 4} fontSize={12} fill="#333">
              {m.name}
              {m.extra > 0 ? ` +${m.extra}` : ""}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

/**
 * Self-contained scenario demo for the example map area: the SVG canvas plus a
 * floating before/after control (toggle or threshold slider) and an edge-count
 * readout. Mount with `key={scenarioId}` so the control state resets per scenario.
 */
export function ScenarioExplorer({ scenarioId }: { scenarioId: string }) {
  const scenario = getScenario(scenarioId);
  const [feature, setFeature] = useState(true);
  const [threshold, setThreshold] = useState(60);

  const view = useMemo(
    () => (scenario ? computeScenarioView(scenario, feature, threshold) : null),
    [scenario, feature, threshold],
  );

  if (!scenario || !view) return null;

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-[#fafafa] p-4">
      <ScenarioCanvas view={view} className="h-auto w-full max-w-[820px]" />

      {/* before/after control */}
      <div className="absolute left-4 top-4 z-10 max-w-[min(20rem,calc(100%-2rem))] rounded-lg border border-border/60 bg-background/90 p-3 shadow-sm backdrop-blur">
        <div className="text-xs font-semibold text-foreground">
          {scenario.name}{" "}
          <span className="font-normal text-muted-foreground">
            {scenario.gaps.join(" ")}
          </span>
        </div>
        {scenario.id === "cluster" ? (
          <label className="mt-2 block text-xs">
            <span className="font-medium text-foreground">
              Cluster threshold (zoom out →): {threshold} m
            </span>
            <input
              type="range"
              min={0}
              max={250}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="mt-1 w-full accent-primary"
            />
          </label>
        ) : (
          <label className="mt-2 flex items-center gap-2 text-xs font-medium text-foreground">
            <input
              type="checkbox"
              checked={feature}
              onChange={(e) => setFeature(e.target.checked)}
              className="size-3.5 accent-primary"
            />
            {scenario.toggleLabel}
          </label>
        )}
      </div>

      {/* edge-count readout */}
      <div className="absolute bottom-4 right-4 z-10 rounded-md bg-background/90 px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
        edges rendered: <b className="text-foreground">{view.edgeCount}</b>
        {scenario.id === "prune" && <> (unpruned: {view.origEdges})</>}
      </div>
    </div>
  );
}
