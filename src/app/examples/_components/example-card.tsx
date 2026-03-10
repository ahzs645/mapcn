"use client";

import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ExampleCardProps {
  title: string;
  description: string;
  className?: string;
  children: React.ReactNode;
}

export function ExampleCard({
  title,
  description,
  className,
  children,
}: ExampleCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
      },
      { rootMargin: "50px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "group rounded-xl overflow-hidden border border-border/50 bg-card shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {visible ? (
          children
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
            <div className="flex gap-1">
              <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-pulse" />
              <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:150ms]" />
              <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </div>
      <div className="px-4 py-3 border-t border-border/30">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {description}
        </p>
      </div>
    </div>
  );
}
