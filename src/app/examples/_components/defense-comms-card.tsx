"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Map, useMap } from "@/registry/map";
import {
  MapPanel,
  MapPanelHeader,
  MapPanelTitle,
  MapPanelContent,
} from "@/registry/map-ui";
import { Building2, RadioTower, User, Eye, EyeOff } from "lucide-react";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ScatterplotLayer, LineLayer, TextLayer } from "@deck.gl/layers";
import type { Map as MapLibreMap, IControl } from "maplibre-gl";

type NodeType = "hq" | "relay" | "field";
type LinkStatus = "strong" | "degraded" | "weak" | "down";
type RGB = [number, number, number];

type CommNode = {
  id: string;
  type: NodeType;
  label: string;
  position: [number, number];
  range: number;
  color: RGB;
};

type CommLink = {
  id: string;
  source: string;
  target: string;
  status: LinkStatus;
  signalStrength: number;
};

type CommNodeTypeConfig = {
  type: NodeType;
  label: string;
  color: RGB;
};

type CommNetworkStats = {
  totalNodes: number;
  activeLinks: number;
  avgSignal: number;
  downLinks: number;
};

const NODE_TYPES: CommNodeTypeConfig[] = [
  { type: "hq", label: "HQ", color: [255, 200, 0] },
  { type: "relay", label: "Relay", color: [0, 200, 150] },
  { type: "field", label: "Field Unit", color: [80, 160, 255] },
];

const NODE_TYPE_ICONS: Record<NodeType, React.ComponentType<{ className?: string }>> = {
  hq: Building2,
  relay: RadioTower,
  field: User,
};

const INITIAL_NODES: CommNode[] = [
  { id: "TAC-HQ-1", type: "hq", label: "TAC-HQ-1", position: [93.4, 27.5], range: 30, color: [255, 200, 0] },
  { id: "TAC-HQ-2", type: "hq", label: "TAC-HQ-2", position: [93.65, 27.5], range: 30, color: [255, 200, 0] },
  { id: "RELAY-1", type: "relay", label: "RELAY-1", position: [93.45, 27.55], range: 20, color: [0, 200, 150] },
  { id: "RELAY-2", type: "relay", label: "RELAY-2", position: [93.52, 27.45], range: 20, color: [0, 200, 150] },
  { id: "RELAY-3", type: "relay", label: "RELAY-3", position: [93.58, 27.53], range: 20, color: [0, 200, 150] },
  { id: "RELAY-4", type: "relay", label: "RELAY-4", position: [93.5, 27.48], range: 20, color: [0, 200, 150] },
  { id: "FLD-1", type: "field", label: "FLD-1", position: [93.38, 27.54], range: 8, color: [80, 160, 255] },
  { id: "FLD-2", type: "field", label: "FLD-2", position: [93.42, 27.58], range: 8, color: [80, 160, 255] },
  { id: "FLD-3", type: "field", label: "FLD-3", position: [93.48, 27.42], range: 8, color: [80, 160, 255] },
  { id: "FLD-4", type: "field", label: "FLD-4", position: [93.55, 27.57], range: 8, color: [80, 160, 255] },
  { id: "FLD-5", type: "field", label: "FLD-5", position: [93.62, 27.46], range: 8, color: [80, 160, 255] },
  { id: "FLD-6", type: "field", label: "FLD-6", position: [93.68, 27.54], range: 8, color: [80, 160, 255] },
];

function haversineDistance(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const sinHalf =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(sinHalf), Math.sqrt(1 - sinHalf));
}

function statusFromSignal(signal: number): LinkStatus {
  if (signal >= 80) return "strong";
  if (signal >= 50) return "degraded";
  if (signal >= 20) return "weak";
  return "down";
}

function generateLinks(nodes: CommNode[]): CommLink[] {
  const links: CommLink[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]!;
      const b = nodes[j]!;
      const dist = haversineDistance(a.position, b.position);
      const maxRange = Math.min(a.range, b.range);
      if (dist <= maxRange) {
        const signal = Math.max(20, Math.round(100 - (dist / maxRange) * 80));
        links.push({
          id: `link-${a.id}-${b.id}`,
          source: a.id,
          target: b.id,
          status: statusFromSignal(signal),
          signalStrength: signal,
        });
      }
    }
  }
  return links;
}

type LinkWithCoords = {
  link: CommLink;
  sourcePos: [number, number];
  targetPos: [number, number];
};

function linkColor(status: LinkStatus): [number, number, number, number] {
  switch (status) {
    case "strong":
      return [0, 200, 100, 200];
    case "degraded":
      return [255, 200, 0, 180];
    case "weak":
      return [255, 130, 0, 160];
    case "down":
      return [255, 50, 50, 80];
  }
}

function linkWidth(status: LinkStatus): number {
  switch (status) {
    case "strong":
      return 3;
    case "degraded":
      return 2;
    case "weak":
      return 1.5;
    case "down":
      return 1;
  }
}

function CommsDeckOverlay({ nodes, links }: { nodes: CommNode[]; links: CommLink[] }) {
  const { map, isLoaded } = useMap();
  const overlayRef = useRef<MapboxOverlay | null>(null);

  useEffect(() => {
    if (!map || !isLoaded) return;
    let overlay: MapboxOverlay | null = null;
    const addOverlay = () => {
      overlay = new MapboxOverlay({ layers: [] });
      overlayRef.current = overlay;
      (map as MapLibreMap).addControl(overlay as unknown as IControl);
    };
    if (map.isStyleLoaded()) addOverlay();
    else map.once("load", addOverlay);
    return () => {
      map.off("load", addOverlay);
      if (overlay) {
        try {
          (map as MapLibreMap).removeControl(overlay as unknown as IControl);
        } catch {}
      }
      overlayRef.current = null;
    };
  }, [map, isLoaded]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const nodeMap: Record<string, [number, number]> = {};
    for (const n of nodes) nodeMap[n.id] = n.position;
    const linkData: LinkWithCoords[] = links
      .filter((l) => nodeMap[l.source] && nodeMap[l.target])
      .map((l) => ({ link: l, sourcePos: nodeMap[l.source]!, targetPos: nodeMap[l.target]! }));

    overlay.setProps({
      layers: [
        new ScatterplotLayer<CommNode>({
          id: "comms-coverage",
          data: nodes,
          getPosition: (d) => d.position,
          getRadius: (d) => d.range * 1000,
          getFillColor: (d) => [d.color[0], d.color[1], d.color[2], 30],
          getLineColor: (d) => [d.color[0], d.color[1], d.color[2], 80],
          lineWidthMinPixels: 1,
          stroked: true,
          filled: true,
          radiusUnits: "meters",
          pickable: false,
        }),
        new LineLayer<LinkWithCoords>({
          id: "comms-links",
          data: linkData,
          getSourcePosition: (d) => d.sourcePos,
          getTargetPosition: (d) => d.targetPos,
          getColor: (d) => linkColor(d.link.status),
          getWidth: (d) => linkWidth(d.link.status),
          widthUnits: "pixels",
          pickable: false,
          updateTriggers: { getColor: [links], getWidth: [links] },
        }),
        new ScatterplotLayer<CommNode>({
          id: "comms-dots",
          data: nodes,
          getPosition: (d) => d.position,
          getRadius: (d) => (d.type === "hq" ? 10 : d.type === "relay" ? 7 : 5),
          getFillColor: (d) => [d.color[0], d.color[1], d.color[2], 255],
          radiusUnits: "pixels",
          filled: true,
          stroked: true,
          getLineColor: [255, 255, 255, 200],
          lineWidthMinPixels: 1,
          pickable: false,
        }),
        new TextLayer<CommNode>({
          id: "comms-labels",
          data: nodes,
          getPosition: (d) => d.position,
          getText: (d) => d.label,
          getSize: 11,
          getColor: [30, 30, 30, 240],
          getTextAnchor: "middle",
          getAlignmentBaseline: "top",
          getPixelOffset: [0, 14],
          fontFamily: "monospace",
          fontWeight: "bold",
          outlineWidth: 2,
          outlineColor: [255, 255, 255, 220],
          pickable: false,
        }),
      ],
    });
  }, [nodes, links]);

  return null;
}

export function DefenseCommsCard() {
  const [nodes] = useState<CommNode[]>(INITIAL_NODES);
  const [links, setLinks] = useState<CommLink[]>(() => generateLinks(INITIAL_NODES));
  const [activeNodeTypes, setActiveNodeTypes] = useState<Set<NodeType>>(
    () => new Set(["hq", "relay", "field"]),
  );

  useEffect(() => {
    const tick = () => {
      setLinks((prev) => {
        const updated = [...prev];
        const count = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
          const idx = Math.floor(Math.random() * updated.length);
          const link = updated[idx];
          if (!link) continue;
          const delta = Math.floor(Math.random() * 40) - 15;
          const newSignal = Math.max(0, Math.min(100, link.signalStrength + delta));
          updated[idx] = { ...link, signalStrength: newSignal, status: statusFromSignal(newSignal) };
        }
        return updated;
      });
    };
    const id = setInterval(tick, 2000 + Math.random() * 1000);
    return () => clearInterval(id);
  }, []);

  const filteredNodes = useMemo(
    () => nodes.filter((n) => activeNodeTypes.has(n.type)),
    [nodes, activeNodeTypes],
  );

  const filteredLinks = useMemo(() => {
    const ids = new Set(filteredNodes.map((n) => n.id));
    return links.filter((l) => ids.has(l.source) && ids.has(l.target));
  }, [filteredNodes, links]);

  const stats = useMemo<CommNetworkStats>(() => {
    const fl = filteredLinks;
    const active = fl.filter((l) => l.status !== "down");
    const avg = fl.length > 0 ? Math.round(fl.reduce((s, l) => s + l.signalStrength, 0) / fl.length) : 0;
    return {
      totalNodes: filteredNodes.length,
      activeLinks: active.length,
      avgSignal: avg,
      downLinks: fl.length - active.length,
    };
  }, [filteredNodes, filteredLinks]);

  const linkHealth = useMemo(() => {
    if (filteredLinks.length === 0) return { strong: 0, degraded: 0, weak: 0, down: 0 };
    const total = filteredLinks.length;
    return {
      strong: Math.round((filteredLinks.filter((l) => l.status === "strong").length / total) * 100),
      degraded: Math.round((filteredLinks.filter((l) => l.status === "degraded").length / total) * 100),
      weak: Math.round((filteredLinks.filter((l) => l.status === "weak").length / total) * 100),
      down: Math.round((filteredLinks.filter((l) => l.status === "down").length / total) * 100),
    };
  }, [filteredLinks]);

  const toggleType = (type: NodeType) => {
    setActiveNodeTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  return (
    <div className="relative h-full w-full min-h-[300px]">
      <Map center={[93.5, 27.5]} zoom={10} theme="dark">
        <CommsDeckOverlay nodes={filteredNodes} links={filteredLinks} />
      </Map>

      <MapPanel className="absolute top-3 right-3 z-10 w-[280px]">
        <MapPanelHeader>
          <MapPanelTitle>Comms</MapPanelTitle>
        </MapPanelHeader>
        <MapPanelContent className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-3">
            <h3 className="mb-3 text-sm font-semibold">Node Types</h3>
            <div className="space-y-2">
              {NODE_TYPES.map((nt) => {
                const Icon = NODE_TYPE_ICONS[nt.type];
                const on = activeNodeTypes.has(nt.type);
                return (
                  <button
                    key={nt.type}
                    onClick={() => toggleType(nt.type)}
                    className={
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent " +
                      (on ? "" : "opacity-40")
                    }
                  >
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: `rgb(${nt.color.join(",")})` }}
                    />
                    <Icon className="size-4" />
                    <span className="flex-1 text-left">{nt.label}</span>
                    {on ? (
                      <Eye className="size-3.5 text-muted-foreground" />
                    ) : (
                      <EyeOff className="size-3.5 text-muted-foreground" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-3">
            <h3 className="mb-2 text-sm font-semibold">Network Stats</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded bg-muted/50 p-2 text-center">
                <div className="text-lg font-bold text-foreground">{stats.totalNodes}</div>
                <div className="text-muted-foreground">Nodes</div>
              </div>
              <div className="rounded bg-muted/50 p-2 text-center">
                <div className="text-lg font-bold text-emerald-500">{stats.activeLinks}</div>
                <div className="text-muted-foreground">Active Links</div>
              </div>
              <div className="rounded bg-muted/50 p-2 text-center">
                <div className="text-lg font-bold text-primary">{stats.avgSignal}%</div>
                <div className="text-muted-foreground">Avg Signal</div>
              </div>
              <div className="rounded bg-muted/50 p-2 text-center">
                <div className="text-lg font-bold text-destructive">{stats.downLinks}</div>
                <div className="text-muted-foreground">Down Links</div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-3">
            <h3 className="mb-2 text-sm font-semibold">Link Health</h3>
            <div className="flex h-3 w-full overflow-hidden rounded-full">
              <div className="bg-emerald-500 transition-all" style={{ width: `${linkHealth.strong}%` }} />
              <div className="bg-yellow-500 transition-all" style={{ width: `${linkHealth.degraded}%` }} />
              <div className="bg-orange-500 transition-all" style={{ width: `${linkHealth.weak}%` }} />
              <div className="bg-destructive transition-all" style={{ width: `${linkHealth.down}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500" /> Strong
              </span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-yellow-500" /> Degraded
              </span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-orange-500" /> Weak
              </span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-destructive" /> Down
              </span>
            </div>
          </div>
        </MapPanelContent>
      </MapPanel>
    </div>
  );
}
