"use client";

import { useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

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
  position?: MapOverlayPosition | "none";
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
        "bg-background/90 z-10 rounded-md border shadow-sm backdrop-blur-sm",
        position !== "none" && "absolute",
        position === "none" && "static",
        position !== "none" && overlayPositions[position],
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

function MapPanel({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "bg-background/95 max-h-[calc(100%-5rem)] overflow-auto rounded-xl shadow-lg backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  );
}

function MapPanelHeader({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("border-border border-b p-3", className)} {...props} />
  );
}

function MapPanelTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<"h2">) {
  return <h2 className={cn("text-sm font-semibold", className)} {...props} />;
}

function MapPanelDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">) {
  return (
    <p
      className={cn("text-muted-foreground mt-1 text-xs", className)}
      {...props}
    />
  );
}

function MapPanelContent({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("p-3", className)} {...props} />;
}

function MapPanelFooter({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("px-3 pb-3", className)} {...props} />;
}

type MapFloatingButtonProps = ComponentPropsWithoutRef<"button"> & {
  active?: boolean;
  position?: MapOverlayPosition;
};

function MapFloatingButton({
  active = false,
  position = "top-left",
  className,
  type = "button",
  ...props
}: MapFloatingButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "absolute z-10 flex size-9 cursor-pointer items-center justify-center rounded-lg shadow-lg backdrop-blur-sm transition-colors",
        overlayPositions[position],
        active
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "bg-background/95 hover:bg-accent",
        className,
      )}
      {...props}
    />
  );
}

type MapToolbarButtonProps = ComponentPropsWithoutRef<"button"> & {
  active?: boolean;
  shape?: "circle" | "square";
};

function MapToolbarButton({
  active = false,
  shape = "square",
  className,
  type = "button",
  ...props
}: MapToolbarButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "border-border flex size-9 cursor-pointer items-center justify-center border transition-colors",
        shape === "circle" ? "rounded-full" : "rounded-md",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "hover:bg-muted",
        className,
      )}
      {...props}
    />
  );
}

type MapStatProps = ComponentPropsWithoutRef<"div"> & {
  icon?: ReactNode;
  label?: ReactNode;
  value: ReactNode;
  inline?: boolean;
};

function MapStat({
  icon,
  label,
  value,
  inline = false,
  className,
  ...props
}: MapStatProps) {
  return (
    <div
      className={cn(
        "text-muted-foreground flex items-center gap-1.5 text-xs",
        className,
      )}
      {...props}
    >
      {icon}
      <div className={cn(inline && "contents")}>
        <div
          className={cn(
            "font-medium",
            inline ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {value}
        </div>
        {label ? <div className="text-[10px]">{label}</div> : null}
      </div>
    </div>
  );
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
  collapsible?: boolean;
  defaultCollapsed?: boolean;
};

function MapLegend({
  title,
  collapsible = false,
  defaultCollapsed = false,
  className,
  children,
  ...props
}: MapLegendProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <MapOverlay className={cn("p-2", className)} {...props}>
      {title ? (
        <MapOverlayHeader className={cn(!collapsed && "mb-2")}>
          {collapsible ? (
            <button
              type="button"
              aria-expanded={!collapsed}
              onClick={() => setCollapsed((value) => !value)}
              className="hover:text-foreground flex w-full items-center justify-between gap-3 text-left"
            >
              <MapOverlayTitle>{title}</MapOverlayTitle>
              <ChevronDown
                className={cn(
                  "text-muted-foreground size-3.5 shrink-0 transition-transform",
                  collapsed && "-rotate-90",
                )}
              />
            </button>
          ) : (
            <MapOverlayTitle>{title}</MapOverlayTitle>
          )}
        </MapOverlayHeader>
      ) : null}
      {!collapsed ? <MapOverlayContent>{children}</MapOverlayContent> : null}
    </MapOverlay>
  );
}

type MapLegendItemProps = ComponentPropsWithoutRef<"button"> & {
  color?: string;
  label: ReactNode;
  active?: boolean;
  count?: ReactNode;
  swatchShape?: MapSwatchProps["shape"];
};

function MapLegendItem({
  color,
  label,
  active = true,
  count,
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
      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          !active && "text-muted-foreground line-through",
        )}
      >
        {label}
      </span>
      {count ? (
        <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[9px] leading-none">
          {count}
        </span>
      ) : null}
    </button>
  );
}

type MapGradientLegendItemProps = ComponentPropsWithoutRef<"div"> & {
  colors: string[];
  minLabel: ReactNode;
  maxLabel: ReactNode;
  labels?: ReactNode[];
};

function MapGradientLegendItem({
  colors,
  minLabel,
  maxLabel,
  labels,
  className,
  style,
  ...props
}: MapGradientLegendItemProps) {
  const legendLabels = labels ?? [minLabel, maxLabel];

  return (
    <div className={cn("min-w-24 space-y-1", className)} {...props}>
      <div
        className="h-2 rounded-sm border"
        style={{
          background: `linear-gradient(to right, ${colors.join(", ")})`,
          ...style,
        }}
      />
      <div className="text-muted-foreground flex items-center justify-between gap-3 text-[9px]">
        {legendLabels.map((label, index) => (
          <span key={index}>{label}</span>
        ))}
      </div>
    </div>
  );
}

type MapSizeLegendItemProps = ComponentPropsWithoutRef<"div"> & {
  label: ReactNode;
  size: number;
  color?: string;
};

function MapSizeLegendItem({
  label,
  size,
  color = "var(--primary)",
  className,
  style,
  ...props
}: MapSizeLegendItemProps) {
  const circleSize = Math.min(size, 20);

  return (
    <div
      className={cn("flex items-center gap-2 px-1 py-0.5 text-[10px]", className)}
      {...props}
    >
      <span className="flex size-6 shrink-0 items-center justify-center">
        <span
          className="rounded-full border"
          style={{
            width: circleSize,
            height: circleSize,
            backgroundColor: color,
            ...style,
          }}
        />
      </span>
      <span className="text-muted-foreground min-w-0 flex-1 truncate">
        {label}
      </span>
    </div>
  );
}

type MapTableLegendItemProps = ComponentPropsWithoutRef<"div"> & {
  color?: string;
  label: ReactNode;
  value: ReactNode;
};

function MapTableLegendItem({
  color,
  label,
  value,
  className,
  ...props
}: MapTableLegendItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded px-1 py-0.5 text-[10px]",
        className,
      )}
      {...props}
    >
      <MapSwatch color={color} />
      <span className="text-muted-foreground min-w-0 flex-1 truncate">
        {label}
      </span>
      <span className="text-foreground font-medium tabular-nums">{value}</span>
    </div>
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
  MapPanel,
  MapPanelHeader,
  MapPanelTitle,
  MapPanelDescription,
  MapPanelContent,
  MapPanelFooter,
  MapFloatingButton,
  MapToolbarButton,
  MapStat,
  MapSwatch,
  MapLegend,
  MapLegendItem,
  MapGradientLegendItem,
  MapSizeLegendItem,
  MapTableLegendItem,
  MapLayerToggle,
  MapMarkerDot,
  MapNumberedMarker,
};

export type { MapOverlayPosition };
