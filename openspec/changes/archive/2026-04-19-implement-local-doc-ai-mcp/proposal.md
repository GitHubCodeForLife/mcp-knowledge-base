## Why

Teams need an MCP server that answers from **local documents only** (no external data leakage), with a single configuration file (`openspec/config.yaml`) describing sources, chunking, retrieval, and tool contracts. Today this repository defines that intent in config but has **no runnable implementation**, so the behavior cannot be used from Cursor or other MCP clients.

## What Changes

- Implement the MCP surface using the **official TypeScript patterns** from [Build an MCP server (TypeScript)](https://modelcontextprotocol.io/docs/develop/build-server#typescript): `McpServer` (`@modelcontextprotocol/sdk/server/mcp.js`), **`StdioServerTransport`** (`@modelcontextprotocol/sdk/server/stdio.js`), **`server.registerTool`** with **Zod** `inputSchema` fields, `await server.connect(transport)`, and **stdio-safe logging** (no `console.log` to stdout; use `console.error` or stderr-only logging).
- Add a **Node.js MCP server** that reads project config, loads allowed local file types from configured paths, and exposes MCP tools aligned with `tools` in config.
- Implement **ingestion**: chunking with configurable size and overlap, UTF-8 text extraction for `.txt` / `.md`, and PDF text extraction for `.pdf`.
- Implement **semantic retrieval** (configurable `top_k`, method `semantic`) over embedded chunks, backing `search_docs`.
- Implement **`get_document`** to return full document content by filename (within configured roots and allowed types).
- Add **logging** and **model** settings wired from config (default model and temperature for any LLM-assisted steps if introduced; core path may be retrieval-only first).
- **BREAKING**: N/A (greenfield implementation; no prior public API in this repo).

## Capabilities

### New Capabilities

- `document-index-and-retrieval`: Local knowledge sources, ingestion (chunk size, overlap, encoding), embedding-backed semantic search, and `top_k` retrieval as specified in `openspec/config.yaml`.
- `mcp-server-and-tools`: MCP server lifecycle (Node; **stdio transport as default** per TypeScript tutorial, with optional HTTP or other transports later), registration of `search_docs` and `get_document` with tool schemas matching config (implemented via Zod per SDK guide), and safe path resolution within configured document roots.

### Modified Capabilities

- _(none — no existing specs under `openspec/specs/`.)_

## Impact

- **New code**: Node/TypeScript package under `src/` (exact layout in design), **`@modelcontextprotocol/sdk`**, **`zod@3`**, YAML parser, file system and PDF parsing dependencies, embedding provider client or local embedding option per design.
- **Configuration**: Runtime loads `openspec/config.yaml` (or documented override path) for `knowledge_base`, `retrieval`, `tools`, `models`, `logging`, `server`.
- **Deployment**: Local `environment: local`; **`server.port` applies when an HTTP-capable transport is used** (stdio tutorial does not use the port). Document client launch via **`node` and absolute path to `build/index.js`** (per TypeScript tab) or the equivalent for this repo after `npm run build`.
- **Security / privacy**: Documents never leave the machine except via chosen embedding/LLM APIs if those are used; design will call out offline vs API trade-offs.
