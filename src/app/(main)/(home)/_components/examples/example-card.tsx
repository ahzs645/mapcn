"use client";

import { CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface ExampleCardProps {
  label?: string;
  className?: string;
  stagger?: number;
  children: React.ReactNode;
}

export function ExampleCard({
  label,
  className,
  stagger = 5,
  children,
}: ExampleCardProps) {
  return (
    <div
      className={cn(
        "bg-card border-border/50 animate-scale-in animate-stagger relative overflow-hidden rounded-xl border shadow-sm",
        className,
      )}
      style={
        {
          "--stagger": stagger,
        } as CSSProperties
      }
    >
      {label && (
        <div className="text-muted-foreground bg-background/90 absolute top-2 left-2 z-10 rounded px-2 py-1 text-[10px] tracking-wider uppercase backdrop-blur-sm">
          {label}
        </div>
      )}
      {children}
    </div>
  );
}
