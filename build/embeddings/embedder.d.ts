export interface Embedder {
    embedQuery(text: string): Promise<number[]>;
    embedDocuments(texts: string[]): Promise<number[][]>;
}
/** Deterministic bag-of-characters vectors for offline or tests (not true semantic). */
export declare function createHashEmbedder(dim?: number): Embedder;
export declare function createOpenAiEmbedder(options: {
    apiKey: string;
    model?: string;
}): Embedder;
export declare function createEmbedderFromEnv(): Embedder;
