"use client";

import { cn } from "@/lib/utils";

interface ExampleCardProps {
  label: string;
  className?: string;
  delay?: string;
  children: React.ReactNode;
}

export function ExampleCard({
  label,
  className,
  delay = "delay-500",
  children,
}: ExampleCardProps) {
  return (
    <div
      className={cn(
        "bg-card border-border/50 animate-scale-in relative overflow-hidden rounded-xl border shadow-sm",
        delay,
        className,
      )}
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
