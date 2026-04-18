import path from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppConfig } from "../config/loadConfig.js";
import type { Embedder } from "../embeddings/embedder.js";
import { extractText } from "../ingestion/extract.js";
import { resolveDocumentPath } from "../paths/resolveDocument.js";
import type { VectorIndex } from "../search/vectorIndex.js";

function toolDescription(config: AppConfig, name: string, fallback: string): string {
  const t = config.tools.find((x) => x.name === name);
  return t?.description ?? fallback;
}

export function registerLocalDocTools(
  server: McpServer,
  deps: {
    config: AppConfig;
    index: VectorIndex;
    embedder: Embedder;
  },
): void {
  const { config, index, embedder } = deps;
  const topK = config.retrieval.top_k;

  server.registerTool(
    "search_docs",
    {
      description: toolDescription(
        config,
        "search_docs",
        "Search local documents for relevant information",
      ),
      inputSchema: {
        query: z.string().describe("Search query"),
      },
    },
    async ({ query }) => {
      const q = await embedder.embedQuery(query);
      const hits = index.search(q, topK);
      if (hits.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No matching chunks found in the indexed documents.",
            },
          ],
        };
      }
      const lines = hits.map(
        (h, i) =>
          `${i + 1}. [${h.relativePath} #${h.chunkIndex}] score=${h.score.toFixed(4)}\n${h.text}`,
      );
      return {
        content: [
          {
            type: "text",
            text: lines.join("\n\n---\n\n"),
          },
        ],
      };
    },
  );

  server.registerTool(
    "get_document",
    {
      description: toolDescription(
        config,
        "get_document",
        "Get full document content by file name",
      ),
      inputSchema: {
        filename: z
          .string()
          .describe("File name or path relative to the configured docs folder"),
      },
    },
    async ({ filename }) => {
      try {
        const resolved = resolveDocumentPath(config, filename);
        const ext = path.extname(resolved.absolutePath).toLowerCase();
        const body = await extractText(
          resolved.absolutePath,
          ext,
          config.knowledge_base.ingestion.encoding,
        );
        return {
          content: [
            {
              type: "text",
              text: `File: ${resolved.relativePath}\n\n${body}`,
            },
          ],
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${msg}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
