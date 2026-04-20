import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/loadConfig.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(here, "fixtures");

describe("loadConfig", () => {
  it("loads fixture config and resolves source paths", () => {
    const cfg = loadConfig(fixtureRoot);
    expect(cfg.project.name).toBe("fixture-local-doc-ai");
    expect(cfg.resolvedSources[0].absolutePath).toContain("docs");
    expect(cfg.knowledge_base.ingestion.chunk_size).toBe(200);
  });

  it("respects LOCAL_DOC_AI_CONFIG override", () => {
    const customPath = path.join(fixtureRoot, "alt", "config.yaml");
    process.env.LOCAL_DOC_AI_CONFIG = customPath;
    const cfg = loadConfig(fixtureRoot);
    expect(cfg.configPath).toBe(customPath);
    delete process.env.LOCAL_DOC_AI_CONFIG;
  });

  it("rejects candidate_pool smaller than top_k", () => {
    const badPath = path.join(fixtureRoot, "invalid-retrieval.yaml");
    process.env.LOCAL_DOC_AI_CONFIG = badPath;
    expect(() => loadConfig(fixtureRoot)).toThrow(/candidate_pool/);
    delete process.env.LOCAL_DOC_AI_CONFIG;
  });
});
