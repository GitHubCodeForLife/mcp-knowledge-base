import type { AppConfig } from "../config/loadConfig.js";
export interface CorpusChunk {
    id: string;
    relativePath: string;
    chunkIndex: number;
    text: string;
}
export declare function buildCorpus(config: AppConfig): Promise<CorpusChunk[]>;
