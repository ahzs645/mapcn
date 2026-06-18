"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CopyButton } from "./copy-button";

interface VariantItem {
  value: string;
  label: string;
  code: string;
  highlightedCode: string;
  modifierCode?: string;
  highlightedModifierCode?: string;
}

interface ComponentPreviewVariantsClientProps {
  items: VariantItem[];
  previews: React.ReactNode[];
  modifierPreviews: (React.ReactNode | null)[];
  modifierLabel?: string;
  className?: string;
}

export function ComponentPreviewVariantsClient({
  items,
  previews,
  modifierPreviews,
  modifierLabel,
  className,
}: ComponentPreviewVariantsClientProps) {
  const [active, setActive] = useState(0);
  const [modifier, setModifier] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const current = items[active];
  const hasModifier = Boolean(modifierLabel) && Boolean(current.modifierCode);
  const useModifier = modifier && hasModifier;

  const preview = useModifier ? modifierPreviews[active] : previews[active];
  const code = useModifier ? current.modifierCode! : current.code;
  const highlightedCode = useModifier
    ? current.highlightedModifierCode!
    : current.highlightedCode;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="bg-muted/40 flex w-fit items-center gap-1 rounded-lg border p-1">
          {items.map((item, index) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setActive(index)}
              className={cn(
                "rounded-md px-3 py-1 text-sm transition-colors",
                active === index
                  ? "bg-background font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {modifierLabel && (
          <button
            type="button"
            role="checkbox"
            aria-checked={useModifier}
            disabled={!hasModifier}
            onClick={() => setModifier((value) => !value)}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors",
              "hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            <span
              className={cn(
                "flex size-4 items-center justify-center rounded-[4px] border transition-colors",
                useModifier
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-input bg-background",
              )}
            >
              {useModifier && <Check className="size-3" strokeWidth={3} />}
            </span>
            {modifierLabel}
          </button>
        )}
      </div>

      <div
        className={cn(
          "h-[420px] w-full overflow-hidden rounded-lg border",
          className,
        )}
      >
        {preview}
      </div>

      <div className="relative w-full overflow-hidden rounded-lg border">
        <div className="absolute top-2 right-2 z-10">
          <CopyButton text={code} />
        </div>
        <div
          className={cn(
            "bg-muted/40 overflow-hidden p-4 text-sm transition-[max-height] [&_code]:bg-transparent! [&_pre]:bg-transparent!",
            expanded ? "max-h-[420px] overflow-auto" : "max-h-44",
          )}
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 flex w-full items-center justify-center",
            !expanded &&
              "from-background to-background/0 bg-linear-to-t pt-12 pb-6",
          )}
        >
          {!expanded && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpanded(true)}
              className="bg-background hover:bg-muted dark:bg-background dark:hover:bg-muted"
            >
              View Code
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
