import { describe, expect, it } from "vitest";
import { matchesPathPrefix, normalizePathPrefix } from "../src/paths/pathPrefix.js";

describe("pathPrefix", () => {
  it("normalizes relative prefixes", () => {
    expect(normalizePathPrefix("docs/sub")).toBe("docs/sub");
    expect(normalizePathPrefix("  docs\\sub  ")).toBe("docs/sub");
    expect(normalizePathPrefix(undefined)).toBeUndefined();
    expect(normalizePathPrefix("")).toBeUndefined();
  });

  it("rejects traversal and absolute-like prefixes", () => {
    expect(() => normalizePathPrefix("../secret")).toThrow(/traversal/);
    expect(() => normalizePathPrefix("/abs")).toThrow();
  });

  it("matches relative paths", () => {
    expect(matchesPathPrefix("docs/a.md", "docs")).toBe(true);
    expect(matchesPathPrefix("other/a.md", "docs")).toBe(false);
    expect(matchesPathPrefix("docs/a.md", undefined)).toBe(true);
  });
});
