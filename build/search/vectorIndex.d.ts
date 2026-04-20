import type { Embedder } from "../embeddings/embedder.js";
export interface ChunkRecord {
    id: string;
    relativePath: string;
    chunkIndex: number;
    text: string;
    embedding: number[];
}
export declare class VectorIndex {
    private readonly chunks;
    add(record: Omit<ChunkRecord, "embedding"> & {
        embedding: number[];
    }): void;
    search(queryEmbedding: number[], topK: number): Array<ChunkRecord & {
        score: number;
    }>;
    /** Dense cosine score for every chunk (for hybrid / MMR candidate pools). */
    allDenseScores(queryEmbedding: number[]): Array<ChunkRecord & {
        score: number;
    }>;
    getChunkById(id: string): ChunkRecord | undefined;
    get chunkCount(): number;
}
export declare function buildVectorIndex(items: Array<{
    id: string;
    relativePath: string;
    chunkIndex: number;
    text: string;
}>, embedder: Embedder): Promise<VectorIndex>;
