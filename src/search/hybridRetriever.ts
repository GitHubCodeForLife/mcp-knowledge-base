import type { AppConfig } from "../config/loadConfig.js";
import { matchesPathPrefix, normalizePathPrefix } from "../paths/pathPrefix.js";
import type { Bm25Index } from "./bm25Index.js";
import type { ChunkRecord } from "./vectorIndex.js";
import type { VectorIndex } from "./vectorIndex.js";

export interface RankedHit extends ChunkRecord {
  denseScore: number;
  lexicalScore: number;
  fusionScore: number;
  retrievalMethod: "semantic" | "hybrid";
}

function minMaxMap(m: Map<string, number>): Map<string, number> {
  const out = new Map<string, number>();
  if (m.size === 0) return out;
  let min = Infinity;
  let max = -Infinity;
  for (const v of m.values()) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!Number.isFinite(min) || max === min) {
    for (const id of m.keys()) {
      out.set(id, max === 0 ? 0 : 1);
    }
    return out;
  }
  for (const [id, v] of m) {
    out.set(id, (v - min) / (max - min));
  }
  return out;
}

function defaultCandidatePool(topK: number, configured: number | undefined): number {
  if (configured !== undefined && configured > 0) return configured;
  return Math.max(topK * 4, topK);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/** MMR over chunk ids using embedding cosine as similarity. */
function maximalMarginalRelevance(
  candidates: RankedHit[],
  topK: number,
  lambda: number,
): RankedHit[] {
  if (candidates.length === 0 || topK <= 0) return [];
  const pool = [...candidates];
  pool.sort((a, b) => b.fusionScore - a.fusionScore);
  const selected: RankedHit[] = [];
  const remaining = new Set(pool);

  const first = pool[0];
  if (!first) return [];
  selected.push(first);
  remaining.delete(first);

  while (selected.length < topK && remaining.size > 0) {
    let best: RankedHit | undefined;
    let bestScore = -Infinity;
    for (const c of remaining) {
      const rel = c.fusionScore;
      let maxSim = 0;
      for (const s of selected) {
        const sim = cosine(c.embedding, s.embedding);
        if (sim > maxSim) maxSim = sim;
      }
      const mmr = lambda * rel - (1 - lambda) * maxSim;
      if (mmr > bestScore) {
        bestScore = mmr;
        best = c;
      }
    }
    if (best === undefined) break;
    selected.push(best);
    remaining.delete(best);
  }
  return selected;
}

function buildFusionMaps(
  denseList: Array<ChunkRecord & { score: number }>,
  bm25: Bm25Index | null,
  queryText: string,
  method: "semantic" | "hybrid",
  weights: { dense: number; lexical: number },
): Map<string, RankedHit> {
  const denseRaw = new Map<string, number>();
  const records = new Map<string, ChunkRecord>();
  for (const row of denseList) {
    denseRaw.set(row.id, row.score);
    records.set(row.id, row);
  }

  const lexRaw = new Map<string, number>();
  const useLexical =
    method === "hybrid" && bm25 !== null && bm25.docCount > 0;
  if (useLexical) {
    const scores = bm25!.scoreQuery(queryText);
    for (const [id, s] of scores) {
      lexRaw.set(id, s);
    }
  }

  const denseNorm = minMaxMap(denseRaw);
  const lexNorm = minMaxMap(lexRaw);

  const out = new Map<string, RankedHit>();
  const wd = useLexical ? weights.dense : 1;
  const wl = useLexical ? weights.lexical : 0;
  const label: "semantic" | "hybrid" = useLexical ? "hybrid" : "semantic";

  for (const id of records.keys()) {
    const rec = records.get(id)!;
    const dn = denseNorm.get(id) ?? 0;
    const ln = lexNorm.get(id) ?? 0;
    const fusion = useLexical ? wd * dn + wl * ln : dn;
    out.set(id, {
      ...rec,
      denseScore: denseRaw.get(id) ?? 0,
      lexicalScore: lexRaw.get(id) ?? 0,
      fusionScore: fusion,
      retrievalMethod: label,
    });
  }
  return out;
}

export function retrieveRanked(
  index: VectorIndex,
  bm25: Bm25Index | null,
  config: AppConfig,
  queryText: string,
  queryEmbedding: number[],
): RankedHit[] {
  return retrieveRankedWithOptions(
    index,
    bm25,
    config,
    queryText,
    queryEmbedding,
    {},
  );
}

/** Full fused ranking after path filter (no top_k / MMR truncation). Used for multi-query merge. */
export function retrieveFusedRankedUnbounded(
  index: VectorIndex,
  bm25: Bm25Index | null,
  config: AppConfig,
  queryText: string,
  queryEmbedding: number[],
  options: { path_prefix?: string },
): RankedHit[] {
  const method = config.retrieval.method;
  const weights = {
    dense: config.retrieval.hybrid?.dense_weight ?? 0.5,
    lexical: config.retrieval.hybrid?.lexical_weight ?? 0.5,
  };
  const pathPrefix = options.path_prefix
    ? normalizePathPrefix(options.path_prefix)
    : undefined;
  const denseList = index.allDenseScores(queryEmbedding);
  const fused = buildFusionMaps(
    denseList,
    bm25,
    queryText,
    method,
    weights,
  );
  const ranked = [...fused.values()].filter((h) =>
    matchesPathPrefix(h.relativePath, pathPrefix),
  );
  ranked.sort((a, b) => b.fusionScore - a.fusionScore);
  return ranked;
}

/** Same as retrieveRanked but applies an explicit path_prefix (tool argument overrides default none). */
export function retrieveRankedWithOptions(
  index: VectorIndex,
  bm25: Bm25Index | null,
  config: AppConfig,
  queryText: string,
  queryEmbedding: number[],
  options: { path_prefix?: string },
): RankedHit[] {
  const topK = config.retrieval.top_k;
  const ranked = retrieveFusedRankedUnbounded(
    index,
    bm25,
    config,
    queryText,
    queryEmbedding,
    options,
  );
  const poolSize = defaultCandidatePool(
    topK,
    config.retrieval.candidate_pool,
  );
  const pool = ranked.slice(0, Math.min(poolSize, ranked.length));
  const mmrOn = config.retrieval.mmr?.enabled ?? false;
  const lambda = config.retrieval.mmr?.lambda ?? 0.5;
  if (mmrOn && pool.length > 0) {
    return maximalMarginalRelevance(pool, topK, lambda);
  }
  return pool.slice(0, topK);
}

export function mergeMultiQueryScores(
  perQuery: RankedHit[][],
): Map<string, RankedHit> {
  const best = new Map<string, RankedHit>();
  for (const list of perQuery) {
    for (const h of list) {
      const prev = best.get(h.id);
      if (!prev || h.fusionScore > prev.fusionScore) {
        best.set(h.id, h);
      }
    }
  }
  return best;
}

export function rankHitsFromMap(
  hits: Map<string, RankedHit>,
  topK: number,
  candidatePool: number,
  mmrEnabled: boolean,
  mmrLambda: number,
): RankedHit[] {
  let ranked = [...hits.values()];
  ranked.sort((a, b) => b.fusionScore - a.fusionScore);
  const pool = ranked.slice(0, Math.min(candidatePool, ranked.length));
  if (mmrEnabled && pool.length > 0) {
    return maximalMarginalRelevance(pool, topK, mmrLambda);
  }
  return pool.slice(0, topK);
}
