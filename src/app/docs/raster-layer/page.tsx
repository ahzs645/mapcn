import {
  DocsLayout,
  DocsSection,
  DocsCode,
  DocsPropTable,
} from "../../(main)/docs/_components/docs";
import { ComponentPreview } from "../../(main)/docs/_components/component-preview";
import { RasterLayerExample } from "../../(main)/docs/_components/examples/raster-layer-example";
import { getExampleSource } from "../../(main)/docs/_components/get-example-source";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Raster Layer",
};

export default function RasterLayerPage() {
  const rasterSource = getExampleSource("raster-layer-example.tsx");

  return (
    <DocsLayout
      title="Raster Layer"
      description="Overlay raster tile layers like satellite imagery or custom tile servers."
      prev={{ title: "3D Buildings", href: "/docs/3d-buildings" }}
      next={{ title: "Image Layer", href: "/docs/image-layer" }}
      toc={[
        { title: "Tile Sources", slug: "tile-sources" },
        { title: "Props", slug: "props" },
      ]}
    >
      <DocsSection>
        <p>
          Use <DocsCode>MapRasterLayer</DocsCode> to add raster tile layers on
          top of your base map. This works with any XYZ tile server including
          OpenStreetMap, satellite imagery, and custom tile providers.
        </p>
        <p>
          Import from <DocsCode>@/registry/map-layers</DocsCode>.
        </p>
      </DocsSection>

      <DocsSection title="Tile Sources">
        <p>
          Switch between different tile sources and adjust the overlay opacity.
          The raster layer is rendered on top of the base map style.
        </p>
        <ComponentPreview code={rasterSource}>
          <RasterLayerExample />
        </ComponentPreview>
      </DocsSection>

      <DocsSection title="Props">
        <DocsPropTable
          props={[
            {
              name: "tiles",
              type: "string[]",
              description:
                'Array of tile URL templates with {z}, {x}, {y} placeholders.',
            },
            {
              name: "tileSize",
              type: "number",
              default: "256",
              description: "Tile size in pixels.",
            },
            {
              name: "attribution",
              type: "string",
              description: "Attribution HTML string for the tile source.",
            },
            {
              name: "opacity",
              type: "number",
              default: "1",
              description: "Opacity of the raster layer.",
            },
            {
              name: "minzoom",
              type: "number",
              default: "0",
              description: "Minimum zoom level for the tiles.",
            },
            {
              name: "maxzoom",
              type: "number",
              default: "22",
              description: "Maximum zoom level for the tiles.",
            },
          ]}
        />
      </DocsSection>
    </DocsLayout>
  );
}
