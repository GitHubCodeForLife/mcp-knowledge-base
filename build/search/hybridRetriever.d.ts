import type { AppConfig } from "../config/loadConfig.js";
import type { Bm25Index } from "./bm25Index.js";
import type { ChunkRecord } from "./vectorIndex.js";
import type { VectorIndex } from "./vectorIndex.js";
export interface RankedHit extends ChunkRecord {
    denseScore: number;
    lexicalScore: number;
    fusionScore: number;
    retrievalMethod: "semantic" | "hybrid";
}
export declare function retrieveRanked(index: VectorIndex, bm25: Bm25Index | null, config: AppConfig, queryText: string, queryEmbedding: number[]): RankedHit[];
/** Full fused ranking after path filter (no top_k / MMR truncation). Used for multi-query merge. */
export declare function retrieveFusedRankedUnbounded(index: VectorIndex, bm25: Bm25Index | null, config: AppConfig, queryText: string, queryEmbedding: number[], options: {
    path_prefix?: string;
}): RankedHit[];
/** Same as retrieveRanked but applies an explicit path_prefix (tool argument overrides default none). */
export declare function retrieveRankedWithOptions(index: VectorIndex, bm25: Bm25Index | null, config: AppConfig, queryText: string, queryEmbedding: number[], options: {
    path_prefix?: string;
}): RankedHit[];
export declare function mergeMultiQueryScores(perQuery: RankedHit[][]): Map<string, RankedHit>;
export declare function rankHitsFromMap(hits: Map<string, RankedHit>, topK: number, candidatePool: number, mmrEnabled: boolean, mmrLambda: number): RankedHit[];
