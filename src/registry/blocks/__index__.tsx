import React from "react";
import { RegistryBlockItem } from "@/lib/blocks";

export const blockComponents: Record<
  RegistryBlockItem["name"],
  React.LazyExoticComponent<React.ComponentType<object>>
> = {
  "analytics-map": React.lazy(() => import("./analytics-map/page")),
  heatmap: React.lazy(() => import("./heatmap/page")),
  "delivery-tracker": React.lazy(() => import("./delivery-tracker/page")),
  "logistics-network": React.lazy(() => import("./logistics-network/page")),
  "old-maps-timeline": React.lazy(() => import("./old-maps-timeline/page")),
  "air-quality": React.lazy(() => import("./air-quality/page")),
  "wind-map": React.lazy(() => import("./wind-map/page")),
};
