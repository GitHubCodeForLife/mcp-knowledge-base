import path from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppConfig } from "../config/loadConfig.js";
import type { Embedder } from "../embeddings/embedder.js";
import { extractText } from "../ingestion/extract.js";
import { normalizePathPrefix } from "../paths/pathPrefix.js";
import { resolveDocumentPath } from "../paths/resolveDocument.js";
import type { Bm25Index } from "../search/bm25Index.js";
import {
  mergeMultiQueryScores,
  rankHitsFromMap,
  type RankedHit,
  retrieveFusedRankedUnbounded,
  retrieveRankedWithOptions,
} from "../search/hybridRetriever.js";
import type { VectorIndex } from "../search/vectorIndex.js";

function toolDescription(config: AppConfig, name: string, fallback: string): string {
  const t = config.tools.find((x) => x.name === name);
  return t?.description ?? fallback;
}

function defaultCandidatePool(topK: number, configured: number | undefined): number {
  if (configured !== undefined && configured > 0) return configured;
  return Math.max(topK * 4, topK);
}

function formatHits(hits: RankedHit[], includeMetadata: boolean): string {
  if (hits.length === 0) {
    return "No matching chunks found in the indexed documents.";
  }
  const lines = hits.map(
    (h, i) =>
      `${i + 1}. [${h.relativePath} #${h.chunkIndex}] score=${h.fusionScore.toFixed(4)} method=${h.retrievalMethod}\n${h.text}`,
  );
  let text = lines.join("\n\n---\n\n");
  if (includeMetadata) {
    const payload = hits.map((h) => ({
      id: h.id,
      denseScore: h.denseScore,
      lexicalScore: h.lexicalScore,
      fusionScore: h.fusionScore,
      retrievalMethod: h.retrievalMethod,
    }));
    text += `\n\n---\n\n--- retrieval_metadata (JSON) ---\n${JSON.stringify({ hits: payload }, null, 2)}`;
  }
  return text;
}

const searchDocsInputSchema = {
  query: z.string().describe("Search query"),
  include_metadata: z
    .boolean()
    .optional()
    .describe("Include per-hit score breakdown as JSON after results"),
  path_prefix: z
    .string()
    .optional()
    .describe(
      "Optional relative path prefix to limit hits (e.g. docs/subfolder); must stay under configured knowledge roots",
    ),
};

export function registerLocalDocTools(
  server: McpServer,
  deps: {
    config: AppConfig;
    index: VectorIndex;
    bm25: Bm25Index | null;
    embedder: Embedder;
  },
): void {
  const { config, index, bm25, embedder } = deps;
  const topK = config.retrieval.top_k;

  server.registerTool(
    "search_docs",
    {
      description: toolDescription(
        config,
        "search_docs",
        "Search local documents for relevant information",
      ),
      inputSchema: searchDocsInputSchema,
    },
    async ({ query, include_metadata, path_prefix }) => {
      let prefix: string | undefined;
      try {
        prefix =
          path_prefix !== undefined && path_prefix.trim() !== ""
            ? normalizePathPrefix(path_prefix)
            : undefined;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return {
          content: [{ type: "text", text: `Error: ${msg}` }],
          isError: true,
        };
      }
      const qEmb = await embedder.embedQuery(query);
      const useMeta =
        include_metadata ??
        config.retrieval.verbose_hits_default ??
        false;
      const hits = retrieveRankedWithOptions(index, bm25, config, query, qEmb, {
        path_prefix: prefix,
      });
      return {
        content: [
          {
            type: "text",
            text: formatHits(hits, useMeta),
          },
        ],
      };
    },
  );

  const mq = config.retrieval.multi_query_tool;
  if (mq?.enabled) {
    const toolName = mq.name ?? "search_docs_multi";
    server.registerTool(
      toolName,
      {
        description: toolDescription(
          config,
          toolName,
          "Run multiple search queries and merge the best matching chunks (for complex questions)",
        ),
        inputSchema: {
          queries: z
            .array(z.string().min(1))
            .min(1)
            .max(24)
            .describe("One or more search queries to combine"),
          include_metadata: z.boolean().optional(),
          path_prefix: z.string().optional(),
        },
      },
      async ({ queries, include_metadata, path_prefix }) => {
        let prefix: string | undefined;
        try {
          prefix =
            path_prefix !== undefined && path_prefix.trim() !== ""
              ? normalizePathPrefix(path_prefix)
              : undefined;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return {
            content: [{ type: "text", text: `Error: ${msg}` }],
            isError: true,
          };
        }
        const useMeta =
          include_metadata ??
          config.retrieval.verbose_hits_default ??
          false;
        const perQuery: RankedHit[][] = [];
        for (const q of queries) {
          const emb = await embedder.embedQuery(q);
          const ranked = retrieveFusedRankedUnbounded(
            index,
            bm25,
            config,
            q,
            emb,
            { path_prefix: prefix },
          );
          perQuery.push(ranked);
        }
        const merged = mergeMultiQueryScores(perQuery);
        const poolSize = defaultCandidatePool(
          topK,
          config.retrieval.candidate_pool,
        );
        const hits = rankHitsFromMap(
          merged,
          topK,
          poolSize,
          config.retrieval.mmr?.enabled ?? false,
          config.retrieval.mmr?.lambda ?? 0.5,
        );
        return {
          content: [
            {
              type: "text",
              text: formatHits(hits, useMeta),
            },
          ],
        };
      },
    );
  }

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
