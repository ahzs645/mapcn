"use client";

/**
 * Transitive engine scenario explorer (internal dev page).
 *
 * Thin wrapper around the shared scenario model in
 * `examples/_components/transitive/scenarios.tsx`, which runs crafted datasets
 * through the REAL bundling engine to show each ported gap before → after. The
 * same scenarios are surfaced in the published /examples/transitive sidebar.
 */

import { useMemo, useState } from "react";

import {
  ScenarioCanvas,
  SCENARIOS,
  computeScenarioView,
} from "@/app/examples/_components/transitive/scenarios";

export default function TransitiveEnginePage() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const [feature, setFeature] = useState(true);
  const [threshold, setThreshold] = useState(60);
  const scenario = SCENARIOS.find((s) => s.id === scenarioId)!;

  const view = useMemo(
    () => computeScenarioView(scenario, feature, threshold),
    [scenario, feature, threshold],
  );

  return (
    <div className="min-h-screen bg-background p-8 text-foreground">
      <h1 className="text-xl font-bold">Transitive engine — apply2DOffsets scenarios</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Each scenario runs crafted data through the real bundling engine. Toggle
        the feature to see the gap before → after.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {SCENARIOS.map((sc) => (
          <button
            key={sc.id}
            onClick={() => {
              setScenarioId(sc.id);
              setFeature(true);
            }}
            className={
              "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors " +
              (sc.id === scenarioId
                ? "border-foreground bg-foreground text-background"
                : "border-border hover:bg-muted")
            }
          >
            {sc.name}{" "}
            <span className="opacity-60">{sc.gaps.join(" ")}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[820px_1fr]">
        <div className="rounded-lg border bg-card">
          <ScenarioCanvas view={view} className="w-full" />
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-sm font-semibold">
              Gaps: {scenario.gaps.join(", ")}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{scenario.blurb}</p>
          </div>

          {scenario.id === "cluster" ? (
            <label className="block text-sm">
              <span className="font-medium">
                Cluster threshold (zoom out →): {threshold} m
              </span>
              <input
                type="range"
                min={0}
                max={250}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="mt-1 w-full"
              />
            </label>
          ) : (
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={feature}
                onChange={(e) => setFeature(e.target.checked)}
              />
              {scenario.toggleLabel}
            </label>
          )}

          <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
            edges rendered: <b>{view.edgeCount}</b>
            {scenario.id === "prune" && (
              <>
                {" "}
                (unpruned: {view.origEdges}) — pruning fused the pass-through
                chain into fewer edges.
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
