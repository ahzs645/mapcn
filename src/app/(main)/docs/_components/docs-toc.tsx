"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function useActiveItem(itemIds: string[]) {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "0% 0% -80% 0%" },
    );

    for (const id of itemIds ?? []) {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    }

    return () => {
      for (const id of itemIds ?? []) {
        const element = document.getElementById(id);
        if (element) {
          observer.unobserve(element);
        }
      }
    };
  }, [itemIds]);

  return activeId;
}

interface TocItem {
  title: string;
  slug: string;
}

interface DocsTocProps {
  items: TocItem[];
  className?: string;
}

export function DocsToc({ items, className }: DocsTocProps) {
  const itemIds = React.useMemo(() => items.map((item) => item.slug), [items]);
  const activeHeading = useActiveItem(itemIds);

  if (!items?.length) {
    return null;
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium">
        On This Page
      </p>
      <div className="relative">
        <div className="bg-border absolute top-1 bottom-1 left-0 w-px" />
        <div className="flex flex-col gap-1">
          {items.map((item) => {
            const isActive = item.slug === activeHeading;
            return (
              <a
                key={item.slug}
                href={`#${item.slug}`}
                className={cn(
                  "relative py-1 pl-3 text-[0.8rem] no-underline transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {isActive && (
                  <div className="bg-foreground absolute top-1 bottom-1 left-0 w-px rounded-full" />
                )}
                {item.title}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
