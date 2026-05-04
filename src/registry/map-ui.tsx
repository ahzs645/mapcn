"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

const overlayPositions = {
  "top-left": "top-3 left-3",
  "top-right": "top-3 right-3",
  "bottom-left": "bottom-3 left-3",
  "bottom-right": "right-3 bottom-3",
  "top-center": "top-3 left-1/2 -translate-x-1/2",
  "bottom-center": "bottom-3 left-1/2 -translate-x-1/2",
} as const;

type MapOverlayPosition = keyof typeof overlayPositions;

type MapOverlayProps = ComponentPropsWithoutRef<"div"> & {
  position?: MapOverlayPosition;
};

function MapOverlay({
  position = "top-left",
  className,
  children,
  ...props
}: MapOverlayProps) {
  return (
    <div
      className={cn(
        "bg-background/90 absolute z-10 rounded-md border shadow-sm backdrop-blur-sm",
        overlayPositions[position],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function MapOverlayHeader({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("mb-2", className)} {...props} />;
}

function MapOverlayTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">) {
  return (
    <p
      className={cn("text-foreground text-[10px] font-medium", className)}
      {...props}
    />
  );
}

function MapOverlayContent({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("space-y-1", className)} {...props} />;
}

type MapSwatchProps = ComponentPropsWithoutRef<"span"> & {
  color?: string;
  active?: boolean;
  shape?: "dot" | "square" | "line";
};

function MapSwatch({
  color,
  active = true,
  shape = "square",
  className,
  style,
  ...props
}: MapSwatchProps) {
  return (
    <span
      className={cn(
        "shrink-0 border",
        shape === "dot" && "size-2.5 rounded-full",
        shape === "square" && "size-2.5 rounded-sm",
        shape === "line" && "h-0.5 w-4 rounded-full border-0",
        className,
      )}
      style={{
        backgroundColor: active ? color : "transparent",
        borderColor: color,
        ...style,
      }}
      {...props}
    />
  );
}

type MapLegendProps = MapOverlayProps & {
  title?: ReactNode;
};

function MapLegend({ title, className, children, ...props }: MapLegendProps) {
  return (
    <MapOverlay className={cn("p-2", className)} {...props}>
      {title ? (
        <MapOverlayHeader>
          <MapOverlayTitle>{title}</MapOverlayTitle>
        </MapOverlayHeader>
      ) : null}
      <MapOverlayContent>{children}</MapOverlayContent>
    </MapOverlay>
  );
}

type MapLegendItemProps = ComponentPropsWithoutRef<"button"> & {
  color?: string;
  label: ReactNode;
  active?: boolean;
  swatchShape?: MapSwatchProps["shape"];
};

function MapLegendItem({
  color,
  label,
  active = true,
  swatchShape = "square",
  className,
  disabled,
  ...props
}: MapLegendItemProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "hover:bg-accent flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-[10px] transition-colors disabled:pointer-events-none",
        className,
      )}
      {...props}
    >
      <MapSwatch color={color} active={active} shape={swatchShape} />
      <span className={cn(!active && "text-muted-foreground line-through")}>
        {label}
      </span>
    </button>
  );
}

type MapLayerToggleProps = ComponentPropsWithoutRef<"label"> & {
  color?: string;
  label: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

function MapLayerToggle({
  color,
  label,
  checked,
  onCheckedChange,
  className,
  ...props
}: MapLayerToggleProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-1.5 text-[10px]",
        className,
      )}
      {...props}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className="accent-primary size-3"
      />
      <MapSwatch color={color} active={checked} />
      {label}
    </label>
  );
}

type MapMarkerDotProps = ComponentPropsWithoutRef<"div"> & {
  color?: string;
};

function MapMarkerDot({
  color,
  className,
  style,
  ...props
}: MapMarkerDotProps) {
  return (
    <div
      className={cn(
        "size-3.5 rounded-full border-2 border-white shadow-lg",
        className,
      )}
      style={{ backgroundColor: color, ...style }}
      {...props}
    />
  );
}

type MapNumberedMarkerProps = ComponentPropsWithoutRef<"div"> & {
  color?: string;
  label: ReactNode;
};

function MapNumberedMarker({
  color,
  label,
  className,
  style,
  ...props
}: MapNumberedMarkerProps) {
  return (
    <div
      className={cn(
        "flex size-4 items-center justify-center rounded-full border-2 border-white text-[9px] font-bold text-white shadow-lg",
        className,
      )}
      style={{ backgroundColor: color, ...style }}
      {...props}
    >
      {label}
    </div>
  );
}

export {
  MapOverlay,
  MapOverlayHeader,
  MapOverlayTitle,
  MapOverlayContent,
  MapSwatch,
  MapLegend,
  MapLegendItem,
  MapLayerToggle,
  MapMarkerDot,
  MapNumberedMarker,
};

export type { MapOverlayPosition };
