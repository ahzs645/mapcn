import {
  DocsLayout,
  DocsSection,
  DocsCode,
  DocsPropTable,
} from "../_components/docs";
import { ComponentPreview } from "../_components/component-preview";
import { ImageLayerExample } from "../_components/examples/image-layer-example";
import { getExampleSource } from "@/lib/get-example-source";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Image Layer",
};

export default function ImageLayerPage() {
  const imageSource = getExampleSource("image-layer-example.tsx");

  return (
    <DocsLayout
      title="Image Layer"
      description="Overlay georeferenced images on the map."
      prev={{ title: "Raster Layer", href: "/docs/raster-layer" }}
      next={{ title: "Advanced", href: "/docs/advanced-usage" }}
      toc={[
        { title: "Image Overlay", slug: "image-overlay" },
        { title: "Props", slug: "props" },
      ]}
    >
      <DocsSection>
        <p>
          Use <DocsCode>MapImageLayer</DocsCode> to overlay a single image on
          the map, positioned by four corner coordinates. Great for historical
          maps, floor plans, aerial photos, or any georeferenced imagery.
        </p>
        <p>
          Import from <DocsCode>@/registry/map-layers</DocsCode>.
        </p>
      </DocsSection>

      <DocsSection title="Image Overlay">
        <p>
          An image of Central Park overlaid on the map. Adjust the opacity to
          blend between the image and the base map.
        </p>
        <ComponentPreview code={imageSource}>
          <ImageLayerExample />
        </ComponentPreview>
      </DocsSection>

      <DocsSection title="Props">
        <DocsPropTable
          props={[
            {
              name: "url",
              type: "string",
              description: "URL of the image to overlay.",
            },
            {
              name: "coordinates",
              type: "[[lng, lat], [lng, lat], [lng, lat], [lng, lat]]",
              description:
                "Four corner coordinates: top-left, top-right, bottom-right, bottom-left.",
            },
            {
              name: "opacity",
              type: "number",
              default: "1",
              description: "Opacity of the image overlay.",
            },
          ]}
        />
      </DocsSection>
    </DocsLayout>
  );
}
