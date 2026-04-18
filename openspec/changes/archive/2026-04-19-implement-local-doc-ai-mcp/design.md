## Context

Technical design for **implement-local-doc-ai-mcp** is split across two documents so reviewers can skim architecture first and drill into file-level detail second.

## Design documents

- **[solution-architecture.md](./solution-architecture.md)** — Goals, context, components, data flow, before vs after, risks summary, diagrams.
- **[solution-analysis.md](./solution-analysis.md)** — Planned modules, symbols, APIs, data shapes, embeddings strategy, testing, migration.

## Key decisions (summary)

- **Stack**: Node.js MCP server following the official guide [Build an MCP server — TypeScript](https://modelcontextprotocol.io/docs/develop/build-server#typescript): `McpServer`, `StdioServerTransport`, `registerTool` with Zod `inputSchema`, `server.connect(transport)`, and stderr-only logging for stdio transports.
- **Project config**: Operational behavior still driven by `openspec/config.yaml` (sources, retrieval, tool names, logging level).
- **Retrieval**: Semantic search over chunked documents with configurable `top_k`, backed by an embedding strategy chosen at implementation time (local vs remote API documented in analysis).
- **Safety**: Tool handlers resolve paths only under configured knowledge roots; reject traversal outside allowed trees.
