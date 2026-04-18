import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/loadConfig.js";
import { createHashEmbedder } from "../src/embeddings/embedder.js";
import { buildCorpus } from "../src/ingestion/buildCorpus.js";
import { resolveDocumentPath } from "../src/paths/resolveDocument.js";
import { buildVectorIndex } from "../src/search/vectorIndex.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(here, "fixtures");

describe("integration", () => {
  it("resolves documents and rejects traversal", () => {
    const cfg = loadConfig(fixtureRoot);
    const a = resolveDocumentPath(cfg, "alpha.md");
    expect(a.relativePath).toMatch(/alpha\.md/);
    expect(() => resolveDocumentPath(cfg, "../outside.txt")).toThrow(/traversal/);
  });

  it("search returns ranked chunks with hash embedder", async () => {
    const cfg = loadConfig(fixtureRoot);
    const corpus = await buildCorpus(cfg);
    expect(corpus.length).toBeGreaterThan(0);
    const embedder = createHashEmbedder();
    const index = await buildVectorIndex(
      corpus.map((c) => ({
        id: c.id,
        relativePath: c.relativePath,
        chunkIndex: c.chunkIndex,
        text: c.text,
      })),
      embedder,
    );
    const q = await embedder.embedQuery("bananas yellow");
    const hits = index.search(q, cfg.retrieval.top_k);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].relativePath).toContain("alpha");
  });
});
