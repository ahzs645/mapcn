import { DocsLayout, DocsSection, DocsCode } from "../_components/docs";
import { ComponentPreview } from "../_components/component-preview";
import {
  ComponentPreviewVariants,
  type PreviewVariant,
} from "../_components/component-preview-variants";
import { MapControlsExample } from "../_components/examples/map-controls-example";
import { MapScaleVariantExample } from "../_components/examples/map-scale-example";
import { getExampleSource } from "../_components/get-example-source";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Controls",
};

function scaleCode(props: string) {
  return `import { Map } from "@/components/ui/map";
import { MapScale } from "@/components/ui/map-scale";

export function MapScaleExample() {
  return (
    <Map center={[2.3522, 48.8566]} zoom={9}>
      <MapScale${props} />
    </Map>
  );
}`;
}

type ScaleVariant = "line" | "ruler" | "bar" | "hollow-bar";

const variantLabels: { value: ScaleVariant; label: string }[] = [
  { value: "line", label: "Line" },
  { value: "ruler", label: "Ruler" },
  { value: "bar", label: "Bar" },
  { value: "hollow-bar", label: "Hollow bar" },
];

const scaleVariants: PreviewVariant[] = variantLabels.map(({ value, label }) => {
  const variantProp = value === "line" ? "" : ` variant="${value}"`;
  return {
    value,
    label,
    code: scaleCode(variantProp),
    preview: <MapScaleVariantExample variant={value} />,
    modifierCode: scaleCode(`${variantProp} dual`),
    modifierPreview: <MapScaleVariantExample variant={value} dual />,
  };
});

export default function ControlsPage() {
  const controlsSource = getExampleSource("map-controls-example.tsx");

  return (
    <DocsLayout
      title="Controls"
      description="Add interactive controls to your map for zoom, compass, location, and fullscreen."
      prev={{ title: "Map", href: "/docs/basic-map" }}
      next={{ title: "Markers", href: "/docs/markers" }}
    >
      <DocsSection>
        <p>
          The <DocsCode>MapControls</DocsCode> component provides a set of
          interactive controls that can be positioned on any corner of the map.
        </p>
        <ComponentPreview code={controlsSource}>
          <MapControlsExample />
        </ComponentPreview>
      </DocsSection>

      <DocsSection title="Scale">
        <p>
          The <DocsCode>MapScale</DocsCode> component shows the real-world
          distance covered by the map. Pick a <DocsCode>variant</DocsCode> for
          different cartographic styles, add <DocsCode>dual</DocsCode> for
          metric + imperial, and tune <DocsCode>steps</DocsCode> and{" "}
          <DocsCode>labels</DocsCode> to taste. Toggle the styles below, or
          check <DocsCode>Dual</DocsCode> to add the other measurement — the
          code updates to match.
        </p>
        <ComponentPreviewVariants
          variants={scaleVariants}
          modifierLabel="Dual"
        />
      </DocsSection>
    </DocsLayout>
  );
}
