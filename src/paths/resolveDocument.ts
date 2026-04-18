import fs from "node:fs";
import path from "node:path";
import type { AppConfig } from "../config/loadConfig.js";
import { discoverFiles } from "../ingestion/discover.js";

function normalizeInput(name: string): string {
  const t = name.trim();
  if (!t || t.includes("\0")) {
    throw new Error("Invalid filename");
  }
  const segments = t.split(/[/\\]/).filter(Boolean);
  if (segments.some((s) => s === "..")) {
    throw new Error("Path traversal is not allowed");
  }
  return segments.join(path.sep);
}

/**
 * Resolve a user-provided filename to a file under configured knowledge roots.
 * Accepts relative paths like `notes/a.md` or a basename if uniquely matching.
 */
export function resolveDocumentPath(
  config: AppConfig,
  filename: string,
): { absolutePath: string; relativePath: string } {
  const normalized = normalizeInput(filename);
  const all = discoverFiles(config);

  for (const root of config.resolvedSources) {
    const candidate = path.resolve(root.absolutePath, normalized);
    const rel = path.relative(root.absolutePath, candidate);
    if (rel.startsWith("..") || path.isAbsolute(rel)) continue;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      const relativePath = path
        .relative(root.absolutePath, candidate)
        .split(path.sep)
        .join("/");
      return { absolutePath: candidate, relativePath };
    }
  }

  const base = path.basename(normalized);
  const matches = all.filter((f) => path.basename(f.relativePath) === base);
  if (matches.length === 1) {
    return {
      absolutePath: matches[0].absolutePath,
      relativePath: matches[0].relativePath,
    };
  }
  if (matches.length > 1) {
    throw new Error(
      `Filename "${base}" is ambiguous; use a path relative to the docs folder (e.g. "${matches[0].relativePath}").`,
    );
  }

  throw new Error(`Document not found or not allowed: ${filename}`);
}
