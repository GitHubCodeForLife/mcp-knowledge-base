import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config/loadConfig.js";
import { createEmbedderFromEnv } from "./embeddings/embedder.js";
import { buildCorpus } from "./ingestion/buildCorpus.js";
import { registerLocalDocTools } from "./mcp/registerTools.js";
import { buildVectorIndex } from "./search/vectorIndex.js";

function logInfo(message: string): void {
  console.error(`[local-doc-ai] ${message}`);
}

/** Project root (parent of build/), stable when MCP cwd is not the repo. */
function getPackageRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

async function main(): Promise<void> {
  const config = loadConfig(getPackageRoot());
  if (config.logging.level === "info" || config.logging.level === "debug") {
    logInfo(`Loaded config from ${config.configPath}`);
  }

  if (!process.env.OPENAI_API_KEY) {
    logInfo(
      "OPENAI_API_KEY is not set; using deterministic hash embeddings (not true semantic). Set OPENAI_API_KEY for OpenAI embeddings.",
    );
  }

  const corpus = await buildCorpus(config);
  logInfo(`Indexed ${corpus.length} chunks from local sources.`);

  const embedder = createEmbedderFromEnv();
  const index = await buildVectorIndex(
    corpus.map((c) => ({
      id: c.id,
      relativePath: c.relativePath,
      chunkIndex: c.chunkIndex,
      text: c.text,
    })),
    embedder,
  );

  const server = new McpServer({
    name: config.project.name,
    version: "1.0.0",
  });

  registerLocalDocTools(server, { config, index, embedder });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logInfo("MCP server connected on stdio.");
}

main().catch((err) => {
  console.error("Fatal error in main():", err);
  process.exit(1);
});
