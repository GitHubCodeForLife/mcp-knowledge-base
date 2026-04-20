import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppConfig } from "../config/loadConfig.js";
import type { Embedder } from "../embeddings/embedder.js";
import type { Bm25Index } from "../search/bm25Index.js";
import type { VectorIndex } from "../search/vectorIndex.js";
export declare function registerLocalDocTools(server: McpServer, deps: {
    config: AppConfig;
    index: VectorIndex;
    bm25: Bm25Index | null;
    embedder: Embedder;
}): void;
