import fs from "fs";
import path from "path";

const SRC_DIR = process.cwd();

export function getBlockFileSource(registryPath: string): string {
  const filePath = path.join(SRC_DIR, registryPath);
  const source = fs.readFileSync(filePath, "utf-8");

  return source
    .replace(/@\/registry\/map-ui/g, "@/components/ui/map-ui")
    .replace(/@\/registry\/map-layers/g, "@/components/ui/map-layers")
    .replace(/@\/registry\/map/g, "@/components/ui/map");
}
