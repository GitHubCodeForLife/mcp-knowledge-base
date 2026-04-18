## 1. Project setup

- [x] 1.1 Initialize Node.js TypeScript project at repo root with **`package.json`** (`"type": "module"` if using ESM SDK paths), **`tsconfig.json`** aligned with the [TypeScript MCP tutorial](https://modelcontextprotocol.io/docs/develop/build-server#typescript) (`outDir` such as `./build`, `module` / `moduleResolution` suitable for Node), and a **`build`** script.
- [x] 1.2 Add dependencies: `@modelcontextprotocol/sdk`, **`zod@3`**, YAML parser, PDF text extraction library, and embedding client or local embedding stack per `solution-analysis.md` decision.
- [x] 1.3 Add dev dependencies (`typescript`, `@types/node`, test runner) and `npm` scripts for **`build`**, **`start`** (run compiled `build/index.js` after build), and `test`.
- [x] 1.4 Verify **`npm run build`** produces runnable output before wiring MCP (per tutorial: build step is required for clients to connect).

## 2. Configuration loading

- [x] 2.1 Implement `src/config/loadConfig.ts` to read `openspec/config.yaml` and expose typed `AppConfig` (server, knowledge_base, retrieval, tools, models, logging).
- [x] 2.2 Resolve relative `knowledge_base.sources[].config.path` values against project root; fail fast with clear errors on missing directories when required.
- [x] 2.3 Optional: support `LOCAL_DOC_AI_CONFIG` or documented env override for config path.

## 3. Ingestion and chunking

- [x] 3.1 Implement file discovery under each `local_files` source filtered by `file_types`.
- [x] 3.2 Implement UTF-8 text extraction for `.txt` and `.md` using `knowledge_base.ingestion.encoding`.
- [x] 3.3 Implement PDF text extraction for `.pdf` with logged failures per spec.
- [x] 3.4 Implement `chunkText` with `chunk_size` and `chunk_overlap` from config.

## 4. Embeddings and semantic search

- [x] 4.1 Implement an `Embedder` abstraction and concrete provider (env-driven) for chunk and query vectors.
- [x] 4.2 Build an in-memory vector index mapping chunk embeddings to metadata (relative path, chunk text).
- [x] 4.3 Implement semantic search returning at most `retrieval.top_k` results when `retrieval.method` is `semantic`.

## 5. MCP server and tools

- [x] 5.1 Instantiate **`McpServer`** with `name` and `version` (from `openspec/config.yaml` `project` or package), following [@modelcontextprotocol/sdk](https://modelcontextprotocol.io/docs/develop/build-server#typescript).
- [x] 5.2 Register **`search_docs`** via **`server.registerTool`** with Zod `inputSchema` (`query` string) and handler returning `{ content: [{ type: "text", text }] }`; wire to semantic search.
- [x] 5.3 Register **`get_document`** the same way (`filename` string); resolve paths only inside configured roots; reject traversal.
- [x] 5.4 Connect **`StdioServerTransport`**: `await server.connect(new StdioServerTransport())`; use **stderr-only** logging for startup and errors (no `console.log` on stdio).
- [x] 5.5 Implement async **`main`** with **`main().catch`** fatal handler to stderr and `process.exit(1)` per the TypeScript tutorial.
- [x] 5.6 Document client launch using absolute path to **`node .../build/index.js`** (or project equivalent) for Cursor or Claude Desktop `mcpServers` config; defer HTTP on `server.port` unless an HTTP transport is implemented.

## 6. Testing and verification

- [x] 6.1 Add unit tests for chunking and config loading using small fixtures under `docs/` or `test/fixtures/`.
- [x] 6.2 Add integration tests for `get_document` path sandbox and for `search_docs` smoke path with a tiny corpus.
- [ ] 6.3 Manual check: connect from an MCP client and list tools; invoke both tools successfully. _(Steps documented in root **`README.md`** → Verification.)_

## 7. Documentation

- [x] 7.1 Add `README.md` with install steps, **`npm run build`**, required env vars for embeddings, and how to register the server in MCP client config using **`node`** and the **absolute path** to the built entry (per [TypeScript tab](https://modelcontextprotocol.io/docs/develop/build-server#typescript)); include privacy note for remote embedding APIs.
- [x] 7.2 Document sample `docs/` content and expected `search_docs` behavior for local verification.
