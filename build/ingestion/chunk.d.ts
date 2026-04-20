export interface TextChunk {
    text: string;
    start: number;
    end: number;
}
/**
 * Non-overlapping windows with optional overlap between consecutive chunks.
 */
export declare function chunkText(fullText: string, chunkSize: number, chunkOverlap: number): TextChunk[];
