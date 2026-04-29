import {
  DocsLayout,
  DocsSection,
  DocsCode,
  DocsPropTable,
} from "../../(main)/docs/_components/docs";
import { ComponentPreview } from "../../(main)/docs/_components/component-preview";
import { GeoJsonLayerExample } from "../../(main)/docs/_components/examples/geojson-layer-example";
import { GeoJsonCircleExample } from "../../(main)/docs/_components/examples/geojson-circle-example";
import { getExampleSource } from "../../(main)/docs/_components/get-example-source";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "GeoJSON Layer",
};

export default function GeoJsonLayerPage() {
  const fillSource = getExampleSource("geojson-layer-example.tsx");
  const circleSource = getExampleSource("geojson-circle-example.tsx");

  return (
    <DocsLayout
      title="GeoJSON Layer"
      description="Render GeoJSON data as fills, lines, circles, or symbols on the map."
      prev={{ title: "Clusters", href: "/docs/clusters" }}
      next={{ title: "Heatmap", href: "/docs/heatmap" }}
      toc={[
        { title: "Fill Layer", slug: "fill-layer" },
        { title: "Circle Layer", slug: "circle-layer" },
        { title: "Props", slug: "props" },
      ]}
    >
      <DocsSection>
        <p>
          Use <DocsCode>MapGeoJsonLayer</DocsCode> to render GeoJSON data
          directly on the map. It supports fill, line, circle, and symbol layer
          types with full access to MapLibre paint and layout properties.
        </p>
        <p>
          Import from <DocsCode>@/registry/map-layers</DocsCode>.
        </p>
      </DocsSection>

      <DocsSection title="Fill Layer">
        <p>
          Render polygon features as filled areas. Click a park to see its info.
        </p>
        <ComponentPreview code={fillSource}>
          <GeoJsonLayerExample />
        </ComponentPreview>
      </DocsSection>

      <DocsSection title="Circle Layer">
        <p>
          Render point features as circles with data-driven styling. Circle size
          and color are driven by each feature&apos;s <DocsCode>rating</DocsCode>{" "}
          property using MapLibre expressions.
        </p>
        <ComponentPreview code={circleSource}>
          <GeoJsonCircleExample />
        </ComponentPreview>
      </DocsSection>

      <DocsSection title="Props">
        <DocsPropTable
          props={[
            {
              name: "data",
              type: "GeoJSON.GeoJSON | string",
              description:
                "GeoJSON data object or URL to a GeoJSON file.",
            },
            {
              name: "type",
              type: '"fill" | "line" | "circle" | "symbol"',
              default: '"fill"',
              description: "The MapLibre layer rendering type.",
            },
            {
              name: "paint",
              type: "Record<string, unknown>",
              description:
                "MapLibre paint properties for the layer type (e.g. fill-color, line-width).",
            },
            {
              name: "layout",
              type: "Record<string, unknown>",
              description: "MapLibre layout properties.",
            },
            {
              name: "filter",
              type: "unknown[]",
              description: "MapLibre filter expression to filter features.",
            },
            {
              name: "onClick",
              type: "(features, lngLat) => void",
              description: "Callback when a feature is clicked.",
            },
            {
              name: "interactive",
              type: "boolean",
              default: "true",
              description:
                "Whether the layer responds to click and hover events.",
            },
          ]}
        />
      </DocsSection>
    </DocsLayout>
  );
}
