import { highlightCode } from "@/lib/highlight";
import { ComponentPreviewVariantsClient } from "./component-preview-variants-client";

export interface PreviewVariant {
  /** Stable id for the variant */
  value: string;
  /** Toggle label shown to the user */
  label: string;
  /** Source snippet displayed (and copied) for this variant */
  code: string;
  /** Rendered demo for this variant */
  preview: React.ReactNode;
  /** Source snippet when the modifier checkbox is on */
  modifierCode?: string;
  /** Rendered demo when the modifier checkbox is on */
  modifierPreview?: React.ReactNode;
}

interface ComponentPreviewVariantsProps {
  variants: PreviewVariant[];
  /** When set, renders a checkbox that switches to each variant's modifier */
  modifierLabel?: string;
  className?: string;
}

export async function ComponentPreviewVariants({
  variants,
  modifierLabel,
  className,
}: ComponentPreviewVariantsProps) {
  const items = await Promise.all(
    variants.map(async (variant) => ({
      value: variant.value,
      label: variant.label,
      code: variant.code,
      highlightedCode: await highlightCode(variant.code, "tsx"),
      modifierCode: variant.modifierCode,
      highlightedModifierCode: variant.modifierCode
        ? await highlightCode(variant.modifierCode, "tsx")
        : undefined,
    })),
  );

  return (
    <ComponentPreviewVariantsClient
      items={items}
      previews={variants.map((variant) => variant.preview)}
      modifierPreviews={variants.map((variant) => variant.modifierPreview ?? null)}
      modifierLabel={modifierLabel}
      className={className}
    />
  );
}
