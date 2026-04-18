# local-doc-ai MCP server

Node.js MCP server that indexes local files under `./docs` (and paths from `build/config.yaml`), exposes **`search_docs`** and **`get_document`**, and follows the official TypeScript patterns from [Build an MCP server — TypeScript](https://modelcontextprotocol.io/docs/develop/build-server#typescript) (`McpServer`, `StdioServerTransport`, Zod `inputSchema`, stderr-only logging).

## Prerequisites

- Node.js 18+
- Optional: **`OPENAI_API_KEY`** — when set, embeddings use OpenAI `text-embedding-3-small` (override model with `OPENAI_EMBEDDING_MODEL`). Without it, a deterministic hash embedding is used (good for smoke tests, not true semantic search).

## Install and build

```bash
npm install
npm run build
```

The compiled entry is **`build/index.js`**. Clients should launch that file with **`node`** using an **absolute path** (see [TypeScript MCP tutorial](https://modelcontextprotocol.io/docs/develop/build-server#typescript)).

## Run (stdio)

```bash
npm start
```

Operational messages go to **stderr** so stdout stays clean for MCP JSON-RPC.

## Cursor / Claude Desktop

Add a server entry (paths are examples — use your real absolute paths):

```json
{
  "mcpServers": {
    "local-doc-ai": {
      "command": "node",
      "args": ["C:\\ABSOLUTE\\PATH\\TO\\mcp-knowlegde-base\\build\\index.js"],
      "cwd": "C:\\ABSOLUTE\\PATH\\TO\\mcp-knowlegde-base"
    }
  }
}
```

On Windows you can use forward slashes in JSON. Restart the client after editing config.

## Configuration

- Default: `build/config.yaml` next to the compiled `build/index.js` (relative to project root).
- Override: set **`LOCAL_DOC_AI_CONFIG`** to a YAML file path (absolute or relative to the project root passed to `loadConfig`, typically the repo root).

## Knowledge layout

- Indexed roots and extensions come from `knowledge_base.sources` (this repo defaults to `./docs` with `.txt`, `.md`, `.pdf`).
- Sample content: `docs/sample.md` (mentions **bananas** for quick search checks).

### Expected `search_docs` behavior

- With **`OPENAI_API_KEY`**, queries use semantic similarity over chunked text.
- Without it, ranking uses a hash-based fallback; overlap with query terms still surfaces relevant chunks.

## Privacy

- **Document files stay on disk** unless you call OpenAI embeddings; then **chunk text is sent to OpenAI** for embedding. Do not set `OPENAI_API_KEY` if that is unacceptable.

## Verification (manual)

1. `npm run build && npm start` (stdio server; stderr should show config loaded and chunk count).
2. In your MCP client, confirm tools **`search_docs`** and **`get_document`** appear.
3. Call **`get_document`** with `sample.md` or `docs/sample.md` (depending on path resolution).
4. Call **`search_docs`** with query `bananas`.

## Tests

```bash
npm test
```
