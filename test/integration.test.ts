import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/loadConfig.js";
import { createHashEmbedder } from "../src/embeddings/embedder.js";
import { buildCorpus } from "../src/ingestion/buildCorpus.js";
import { resolveDocumentPath } from "../src/paths/resolveDocument.js";
import { retrieveRankedWithOptions } from "../src/search/hybridRetriever.js";
import { buildVectorIndex } from "../src/search/vectorIndex.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(here, "fixtures");

describe("integration", () => {
  it("resolves documents and rejects traversal", () => {
    const cfg = loadConfig(fixtureRoot);
    const a = resolveDocumentPath(cfg, "alpha.md");
    expect(a.relativePath).toBe("docs/alpha.md");
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
    expect(hits[0].relativePath).toContain("docs/alpha");
  });

  it("retrieveRankedWithOptions matches legacy semantic ranking when method is semantic", async () => {
    const cfg = loadConfig(fixtureRoot);
    const corpus = await buildCorpus(cfg);
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
    const qText = "bananas yellow";
    const q = await embedder.embedQuery(qText);
    const newHits = retrieveRankedWithOptions(
      index,
      null,
      cfg,
      qText,
      q,
      {},
    );
    const oldHits = index.search(q, cfg.retrieval.top_k);
    expect(newHits.map((h) => h.id)).toEqual(oldHits.map((h) => h.id));
  });
});
