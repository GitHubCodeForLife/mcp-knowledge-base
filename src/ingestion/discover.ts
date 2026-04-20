import fs from "node:fs";
import path from "node:path";
import type { AppConfig } from "../config/loadConfig.js";

export interface DiscoveredFile {
  /** Path relative to the knowledge source root */
  relativePath: string;
  absolutePath: string;
  extension: string;
}

export function discoverFiles(config: AppConfig): DiscoveredFile[] {
  const out: DiscoveredFile[] = [];
  for (const source of config.resolvedSources) {
    walk(
      source.absolutePath,
      source.absolutePath,
      source.fileTypes,
      out,
      source.name,
    );
  }
  return out;
}

function walk(
  rootDir: string,
  currentDir: string,
  allowedExt: Set<string>,
  acc: DiscoveredFile[],
  mountName: string,
): void {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const ent of entries) {
    const abs = path.join(currentDir, ent.name);
    if (ent.isDirectory()) {
      walk(rootDir, abs, allowedExt, acc, mountName);
    } else if (ent.isFile()) {
      const ext = path.extname(ent.name).toLowerCase();
      if (!allowedExt.has(ext)) continue;
      const inner = path.relative(rootDir, abs).split(path.sep).join("/");
      const relativePath = `${mountName}/${inner}`;
      acc.push({ relativePath, absolutePath: abs, extension: ext });
    }
  }
}
