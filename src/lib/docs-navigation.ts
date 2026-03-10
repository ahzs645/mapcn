import {
  Map,
  BookOpen,
  Code,
  Braces,
  MapPin,
  MessageSquare,
  Route,
  Wrench,
  Settings,
  Layers,
  LucideIcon,
  Shapes,
  Flame,
  Building2,
  Image,
  Grid3x3,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const docsNavigation: NavGroup[] = [
  {
    title: "Basics",
    items: [
      { title: "Getting Started", href: "/docs", icon: BookOpen },
      { title: "Installation", href: "/docs/installation", icon: Code },
      { title: "API Reference", href: "/docs/api-reference", icon: Braces },
    ],
  },
  {
    title: "Components",
    items: [
      { title: "Map", href: "/docs/basic-map", icon: Map },
      { title: "Controls", href: "/docs/controls", icon: Settings },
      { title: "Markers", href: "/docs/markers", icon: MapPin },
      { title: "Popups", href: "/docs/popups", icon: MessageSquare },
      { title: "Routes", href: "/docs/routes", icon: Route },
      { title: "Clusters", href: "/docs/clusters", icon: Layers },
    ],
  },
  {
    title: "Layers",
    items: [
      { title: "GeoJSON", href: "/docs/geojson-layer", icon: Shapes },
      { title: "Heatmap", href: "/docs/heatmap", icon: Flame },
      { title: "3D Buildings", href: "/docs/3d-buildings", icon: Building2 },
      { title: "Raster", href: "/docs/raster-layer", icon: Grid3x3 },
      { title: "Image", href: "/docs/image-layer", icon: Image },
      { title: "Advanced", href: "/docs/advanced-usage", icon: Wrench },
    ],
  },
];
