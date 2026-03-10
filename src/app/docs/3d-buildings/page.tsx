import {
  DocsLayout,
  DocsSection,
  DocsCode,
  DocsPropTable,
} from "../_components/docs";
import { ComponentPreview } from "../_components/component-preview";
import { FillExtrusionExample } from "../_components/examples/fill-extrusion-example";
import { getExampleSource } from "@/lib/get-example-source";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "3D Buildings",
};

export default function ThreeDBuildings() {
  const extrusionSource = getExampleSource("fill-extrusion-example.tsx");

  return (
    <DocsLayout
      title="3D Buildings"
      description="Extrude polygon features into 3D buildings and structures."
      prev={{ title: "Heatmap", href: "/docs/heatmap" }}
      next={{ title: "Raster Layer", href: "/docs/raster-layer" }}
      toc={[
        { title: "City Blocks", slug: "city-blocks" },
        { title: "Props", slug: "props" },
      ]}
    >
      <DocsSection>
        <p>
          Use <DocsCode>MapFillExtrusionLayer</DocsCode> to extrude polygons
          into 3D shapes. Combined with pitch and bearing on the map, this
          creates impressive 3D city visualizations.
        </p>
        <p>
          Import from <DocsCode>@/registry/map-layers</DocsCode>.
        </p>
      </DocsSection>

      <DocsSection title="City Blocks">
        <p>
          A generated city grid with buildings colored by type and height driven
          by data. Click any building to see its details. Use the map pitch and
          bearing to explore in 3D.
        </p>
        <ComponentPreview code={extrusionSource} className="h-[500px]">
          <FillExtrusionExample />
        </ComponentPreview>
      </DocsSection>

      <DocsSection title="Props">
        <DocsPropTable
          props={[
            {
              name: "data",
              type: "FeatureCollection<Polygon> | string",
              description: "GeoJSON polygon data or URL.",
            },
            {
              name: "height",
              type: "number | expression",
              default: "10",
              description:
                'Extrusion height in meters. Use ["get", "height"] to drive from feature properties.',
            },
            {
              name: "base",
              type: "number | expression",
              default: "0",
              description: "Base height of the extrusion in meters.",
            },
            {
              name: "color",
              type: "string | expression",
              default: '"#aaa"',
              description:
                "Fill color. Supports data-driven expressions like match or interpolate.",
            },
            {
              name: "opacity",
              type: "number",
              default: "0.6",
              description: "Opacity of the extruded shapes.",
            },
            {
              name: "onClick",
              type: "(features, lngLat) => void",
              description: "Callback when a feature is clicked.",
            },
          ]}
        />
      </DocsSection>
    </DocsLayout>
  );
}
