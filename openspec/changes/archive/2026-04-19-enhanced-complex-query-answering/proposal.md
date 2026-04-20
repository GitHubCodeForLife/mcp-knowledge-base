## Why

The local Doc AI MCP already supports semantic `search_docs` and full-document `get_document`, which is enough when the host model can answer from a single retrieval pass. Multi-part questions, comparisons across documents, disambiguation, and tasks that need several evidence passes often fail or degrade because retrieval is single-shot and similarity-only. We should extend retrieval and tool contracts so the host (or a small orchestration layer in the server) can gather richer, more targeted evidence for complicated questions.

## What Changes

- Add retrieval and ranking options beyond one embedding and top‑K cosine similarity (for example hybrid lexical + dense signals, diversity / MMR-style selection, optional reranking, or multi-query fusion), controlled by configuration with safe defaults.
- Add MCP-facing capabilities for **multi-step investigation**: ways to run related searches, narrow by document or section, or combine results without forcing the user to manually chain many fragile calls.
- Extend configuration and observability (metrics or structured fields in tool responses) so operators can tune behavior for harder queries without breaking existing clients.
- **BREAKING**: Only if we change required `search_docs` input fields or remove tools; the design should prefer additive schemas (optional fields, new tools) to avoid breaking existing integrations.

## Capabilities

### New Capabilities

- `advanced-retrieval`: Hybrid and advanced ranking over the existing chunk index (lexical where applicable, fusion, diversity/rerank hooks, configurable limits and flags) while preserving traceability to source paths and chunk boundaries.
- `multi-hop-query-support`: Tool-level and/or workflow-level support for complicated questions—structured multi-query search, follow-up retrieval from prior hits, and clearer citation-oriented payloads so the host model can synthesize answers with less guesswork.

### Modified Capabilities

- `mcp-server-and-tools`: New or extended tool contracts (optional parameters, additional tools) for advanced retrieval and multi-hop flows; response shapes may include structured metadata (scores, retrieval method, sub-query labels) where specified.
- `document-index-and-retrieval`: Indexing and retrieval requirements extended for hybrid or auxiliary indices (for example term statistics or secondary stores) and for semantic retrieval to compose with those signals per configuration.

## Impact

- **Code**: `src/search/`, `src/embeddings/`, `src/mcp/registerTools.ts`, `src/config/loadConfig.ts`, ingestion/index build paths, and tests.
- **Configuration**: `openspec/config.yaml` (and schema) gains retrieval-related options for hybrid/advanced behavior and limits.
- **Dependencies**: Possible additions for tokenization, BM25/hybrid search, or lightweight reranking libraries—exact choices belong in `design.md`.
- **Clients**: Host agents benefit from better evidence for hard questions; existing callers remain valid if we keep additive changes.
