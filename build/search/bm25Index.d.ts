/**
 * In-memory BM25 over chunk records (Okapi BM25).
 */
export declare class Bm25Index {
    private readonly docIds;
    private readonly docLens;
    private readonly avgDl;
    /** term -> chunk id -> term frequency */
    private readonly postings;
    private readonly N;
    private readonly idf;
    private constructor();
    get docCount(): number;
    static fromChunks(chunks: Array<{
        id: string;
        text: string;
    }>): Bm25Index;
    /** Raw BM25 scores per chunk id for this query (sparse: only docs with query terms). */
    scoreQuery(query: string): Map<string, number>;
}
