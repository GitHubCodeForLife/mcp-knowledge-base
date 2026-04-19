/**
 * Validate and normalize a path prefix for filtering search hits (relative POSIX paths under knowledge roots).
 */
export function normalizePathPrefix(prefix: string | undefined): string | undefined {
  if (prefix === undefined || prefix === null) return undefined;
  const t = prefix.trim();
  if (!t) return undefined;
  if (t.includes("\0")) {
    throw new Error("Invalid path_prefix");
  }
  const normalized = t.replace(/\\/g, "/");
  if (normalized.startsWith("/") || normalized.includes(":")) {
    throw new Error("path_prefix must be a relative path");
  }
  const segments = normalized.split("/").filter(Boolean);
  if (segments.some((s) => s === "..")) {
    throw new Error("Path traversal is not allowed in path_prefix");
  }
  return segments.join("/");
}

export function matchesPathPrefix(relativePath: string, prefix: string | undefined): boolean {
  if (!prefix) return true;
  const rel = relativePath.replace(/\\/g, "/");
  const p = prefix.replace(/\\/g, "/");
  return rel === p || rel.startsWith(`${p}/`);
}
