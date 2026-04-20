import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { AppConfig } from "../src/config/loadConfig.js";
import { loadConfig } from "../src/config/loadConfig.js";
import { createHashEmbedder } from "../src/embeddings/embedder.js";
import { buildCorpus } from "../src/ingestion/buildCorpus.js";
import { Bm25Index } from "../src/search/bm25Index.js";
import {
  mergeMultiQueryScores,
  rankHitsFromMap,
  retrieveFusedRankedUnbounded,
  retrieveRankedWithOptions,
} from "../src/search/hybridRetriever.js";
import { buildVectorIndex } from "../src/search/vectorIndex.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(here, "fixtures");

function hybridConfig(base: AppConfig): AppConfig {
  return {
    ...base,
    retrieval: {
      ...base.retrieval,
      method: "hybrid",
      hybrid: { dense_weight: 0.5, lexical_weight: 0.5 },
      candidate_pool: 10,
      mmr: { enabled: false, lambda: 0.5 },
    },
  };
}

describe("BM25 and hybrid retrieval", () => {
  it("scores query terms", async () => {
    const cfg = loadConfig(fixtureRoot);
    const corpus = await buildCorpus(cfg);
    const bm25 = Bm25Index.fromChunks(
      corpus.map((c) => ({ id: c.id, text: c.text })),
    );
    const s = bm25.scoreQuery("bananas yellow");
    expect(s.size).toBeGreaterThan(0);
  });

  it("fuses dense and lexical in hybrid mode", async () => {
    const cfg = hybridConfig(loadConfig(fixtureRoot));
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
    const bm25 = Bm25Index.fromChunks(
      corpus.map((c) => ({ id: c.id, text: c.text })),
    );
    const q = "bananas yellow";
    const emb = await embedder.embedQuery(q);
    const hits = retrieveRankedWithOptions(index, bm25, cfg, q, emb, {});
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.length).toBeLessThanOrEqual(cfg.retrieval.top_k);
    expect(hits[0].retrievalMethod).toBe("hybrid");
  });

  it("filters by path_prefix", async () => {
    const cfg = hybridConfig(loadConfig(fixtureRoot));
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
    const bm25 = Bm25Index.fromChunks(
      corpus.map((c) => ({ id: c.id, text: c.text })),
    );
    const q = "test";
    const emb = await embedder.embedQuery(q);
    const hits = retrieveRankedWithOptions(index, bm25, cfg, q, emb, {
      path_prefix: "nonexistent-folder",
    });
    expect(hits.length).toBe(0);
  });

  it("mergeMultiQueryScores keeps best fusion per chunk", async () => {
    const cfg = hybridConfig(loadConfig(fixtureRoot));
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
    const bm25 = Bm25Index.fromChunks(
      corpus.map((c) => ({ id: c.id, text: c.text })),
    );
    const q1 = "bananas";
    const q2 = "yellow";
    const e1 = await embedder.embedQuery(q1);
    const e2 = await embedder.embedQuery(q2);
    const a = retrieveFusedRankedUnbounded(index, bm25, cfg, q1, e1, {});
    const b = retrieveFusedRankedUnbounded(index, bm25, cfg, q2, e2, {});
    const merged = mergeMultiQueryScores([a, b]);
    const pool = cfg.retrieval.candidate_pool ?? 10;
    const ranked = rankHitsFromMap(
      merged,
      cfg.retrieval.top_k,
      pool,
      false,
      0.5,
    );
    expect(ranked.length).toBeLessThanOrEqual(cfg.retrieval.top_k);
  });

  it("prefers wiki hits when wiki_first is enabled and wiki mount exists", async () => {
    const base = loadConfig(fixtureRoot);
    const cfg: AppConfig = {
      ...base,
      knowledge_base: {
        ...base.knowledge_base,
        layers: { wiki_source: "wiki", raw_source: "raw" },
      },
      retrieval: {
        ...base.retrieval,
        wiki_first: true,
      },
    };
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
    const q = "bananas";
    const emb = await embedder.embedQuery(q);
    const hits = retrieveFusedRankedUnbounded(index, null, cfg, q, emb, {});
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].relativePath.startsWith("wiki/")).toBe(true);
  });
});
