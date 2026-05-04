import fs from "fs";
import path from "path";

const REGISTRY_DIR = path.join(process.cwd(), "public", "r");
const IMPORT_REWRITES = [
  ["@/registry/map-ui", "@/components/ui/map-ui"],
  ["@/registry/map-layers", "@/components/ui/map-layers"],
  ["@/registry/map", "@/components/ui/map"],
] as const;

interface RegistryFile {
  path: string;
  content?: string;
  type?: string;
  target?: string;
}

interface RegistryItem {
  files?: RegistryFile[];
}

interface RegistryData {
  files?: RegistryFile[];
  items?: RegistryItem[];
}

function fixContent(content: string): string {
  return IMPORT_REWRITES.reduce((nextContent, [fromImport, toImport]) => {
    const escaped = fromImport.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return nextContent.replace(new RegExp(escaped, "g"), toImport);
  }, content);
}

function processFile(filePath: string): void {
  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw) as RegistryData;
  let changed = false;

  if (Array.isArray(data.files)) {
    for (const file of data.files) {
      if (file.content?.includes("@/registry/")) {
        file.content = fixContent(file.content);
        changed = true;
      }
    }
  }

  if (Array.isArray(data.items)) {
    for (const item of data.items) {
      if (Array.isArray(item.files)) {
        for (const file of item.files) {
          if (file.content?.includes("@/registry/")) {
            file.content = fixContent(file.content);
            changed = true;
          }
        }
      }
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
    console.log("Fixed imports in:", path.relative(process.cwd(), filePath));
  }
}

const files = fs.readdirSync(REGISTRY_DIR).filter((f) => f.endsWith(".json"));
for (const f of files) {
  processFile(path.join(REGISTRY_DIR, f));
}
