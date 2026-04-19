## 1. Configuration and types

- [x] 1.1 Extend configuration schema (`RawConfigSchema` / YAML) with retrieval strategy fields: hybrid vs semantic, fusion weights, candidate pool size, MMR/diversity toggles, and verbose metadata defaults; preserve backward-compatible defaults matching current semantic-only behavior.
- [x] 1.2 Document new keys in the packaged sample config and fail fast with clear errors on invalid combinations (for example hybrid enabled without successful lexical index build at runtime).

## 2. Lexical index and hybrid ranking

- [x] 2.1 Implement a lexical index builder over chunk records during corpus/index build (BM25 or TF‑IDF per design), stored alongside existing chunk metadata in memory or a documented artifact format.
- [x] 2.2 Extend `VectorIndex` (or add a sibling `HybridIndex`) with search APIs that return lexical scores and support fused ranking with dense similarity using configured weights.
- [x] 2.3 Implement candidate pool expansion and MMR or per-document diversity filtering before final `top_k` truncation.

## 3. MCP tools and responses

- [x] 3.1 Extend `search_docs` Zod `inputSchema` with optional fields (`include_metadata`, scope filters, optional `queries` or parallel sub-query list per spec—pick one consistent shape) while keeping `query` required.
- [x] 3.2 Add the multi-query MCP tool: register it in `registerLocalDocTools`, implement merge/dedupe/fusion across queries, and respect path safety for scope filters.
- [x] 3.3 Implement optional verbose metadata in tool responses (plain text default; structured block when requested) including scores and method identifiers per spec.

## 4. Wiring, tests, and verification

- [x] 4.1 Wire index build and server startup to load hybrid components only when enabled; ensure stderr logging for build/query diagnostics without polluting stdout on stdio transport.
- [x] 4.2 Add unit tests for fusion, MMR/diversity, multi-query merge, and scope filtering edge cases (invalid paths, empty corpora).
- [x] 4.3 Add integration or smoke tests that exercise `search_docs` legacy shape and the new multi-query tool against fixture documents.
