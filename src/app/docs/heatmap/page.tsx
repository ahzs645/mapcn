import {
  DocsLayout,
  DocsSection,
  DocsCode,
  DocsPropTable,
} from "../../(main)/docs/_components/docs";
import { ComponentPreview } from "../../(main)/docs/_components/component-preview";
import { HeatmapExample } from "../../(main)/docs/_components/examples/heatmap-example";
import { getExampleSource } from "../../(main)/docs/_components/get-example-source";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Heatmap",
};

export default function HeatmapPage() {
  const heatmapSource = getExampleSource("heatmap-example.tsx");

  return (
    <DocsLayout
      title="Heatmap"
      description="Visualize point density with a heatmap layer."
      prev={{ title: "GeoJSON Layer", href: "/docs/geojson-layer" }}
      next={{ title: "3D Buildings", href: "/docs/3d-buildings" }}
      toc={[
        { title: "Interactive Heatmap", slug: "interactive-heatmap" },
        { title: "Props", slug: "props" },
      ]}
    >
      <DocsSection>
        <p>
          Use <DocsCode>MapHeatmapLayer</DocsCode> to visualize the density of
          point data. Great for showing earthquake activity, population density,
          traffic hotspots, and more.
        </p>
        <p>
          Import from <DocsCode>@/registry/map-layers</DocsCode>.
        </p>
      </DocsSection>

      <DocsSection title="Interactive Heatmap">
        <p>
          Simulated earthquake data around the Pacific Ring of Fire. Adjust
          the radius and intensity controls to see how they affect the
          visualization. Point weight is driven by earthquake magnitude.
        </p>
        <ComponentPreview code={heatmapSource}>
          <HeatmapExample />
        </ComponentPreview>
      </DocsSection>

      <DocsSection title="Props">
        <DocsPropTable
          props={[
            {
              name: "data",
              type: "FeatureCollection<Point> | string",
              description: "GeoJSON point data or URL to fetch from.",
            },
            {
              name: "weight",
              type: "number | expression",
              default: "1",
              description:
                "Weight of each point. Use a data-driven expression to vary by feature property.",
            },
            {
              name: "intensity",
              type: "number",
              default: "1",
              description: "Global intensity multiplier for the heatmap.",
            },
            {
              name: "radius",
              type: "number",
              default: "20",
              description: "Radius of influence for each point in pixels.",
            },
            {
              name: "opacity",
              type: "number",
              default: "0.7",
              description: "Opacity of the heatmap layer.",
            },
            {
              name: "colorRamp",
              type: "expression",
              description:
                "Custom color ramp as a MapLibre interpolate expression over heatmap-density.",
            },
          ]}
        />
      </DocsSection>
    </DocsLayout>
  );
}
