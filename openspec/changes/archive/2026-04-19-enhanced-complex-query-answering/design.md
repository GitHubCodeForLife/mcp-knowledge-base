## Context

Technical design for **enhanced-complex-query-answering** is split across two companion documents so reviewers can skim architecture first and drill into file-level detail second.

### Design documents

- **[solution-architecture.md](./solution-architecture.md)** — Goals, context, components, data flow, before vs after, requirements mapping, risks summary, diagrams.
- **[solution-analysis.md](./solution-analysis.md)** — Planned modules, symbols, configuration keys, data shapes, algorithms reference, testing matrix.

---

The project ships a stdio MCP server with `search_docs` (single dense embedding + cosine top‑K over in-memory `VectorIndex`) and `get_document` (full file read after safe path resolution). The host LLM composes answers; the server does not call an LLM. Complicated questions—multi-hop reasoning, comparisons, rare keywords plus paraphrase, or avoiding redundant chunks—need richer retrieval than one query vector and a single ranked list.

Constraints: Node.js/TypeScript, existing `openspec` config and Zod validation, stderr-only logging on stdio, path safety unchanged.

## Goals / Non-Goals

**Goals:**

- Improve evidence quality for hard questions via configurable retrieval (hybrid signals, larger candidate pools with diversity or reranking, optional multi-query fusion).
- Expose MCP tools and/or optional parameters so the host can request multi-step or structured retrieval without ad-hoc string parsing.
- Keep backward compatibility: default behavior stays close to current semantic top‑K unless config or optional arguments opt in.
- Document tuning knobs (weights, pool sizes, feature flags) for operators.

**Non-Goals:**

- Running a summarization or answer-generation model inside this MCP (the host remains responsible for final prose).
- Replacing the existing embedding provider abstraction with a fixed vendor.
- Guaranteed “correctness” on all complex questions—only better retrieval affordances and transparency.

## Decisions

1. **Hybrid retrieval v1**  
   **Choice**: Add a lightweight lexical component (for example in-process BM25 or TF‑IDF over chunk text) built at index time alongside dense vectors, then fuse lexical and dense scores with configurable weights when `retrieval.method` (or a new field such as `retrieval.strategy`) selects hybrid mode.  
   **Rationale**: Pure embedding search misses exact tokens (IDs, error codes); hybrid is a standard fix without a second embedding model.  
   **Alternatives**: Query expansion only (still misses exact match); cross-encoder reranking only (heavier latency/dependency).

2. **Diversity / MMR**  
   **Choice**: After scoring (dense or fused), optionally apply Maximal Marginal Relevance (or a simpler dedupe by document) on a candidate pool larger than `top_k`, controlled by `retrieval.candidate_pool` (or similar).  
   **Rationale**: Complex questions often need multiple distinct passages; raw top‑K can repeat one document.  
   **Alternatives**: Only increase `top_k` (does not fix redundancy); clustering (more complex).

3. **Multi-hop affordance without server-side LLM**  
   **Choice**: Add an MCP tool (for example `search_docs_batch` or extend `search_docs` with an optional `queries: string[]`) that runs several embeddings and merges/deduplicates/fuses results in one round trip, plus optional `path_prefix` / `filename_glob` filters to narrow scope on follow-up.  
   **Rationale**: Reduces client orchestration errors and latency; host can decompose the user question into sub-questions explicitly.  
   **Alternatives**: Rely on host-only multiple `search_docs` calls (status quo); full autonomous agent loop in the server (out of scope).

4. **Response shape**  
   **Choice**: Preserve existing text payloads for compatibility; add optional structured lines or a trailing JSON block for scores and method tags when `retrieval.verbose_results` or tool flag `include_metadata: true` is set—exact format fixed in implementation and spec.  
   **Rationale**: Older clients keep plain text; new clients can parse metadata when opted in.

5. **Configuration**  
   **Choice**: Extend YAML under `retrieval` (and possibly `knowledge_base.ingestion` for lexical index build) with defaults matching current semantic-only behavior. Invalid combinations fail at config load with a clear error.

## Risks / Trade-offs

- [Lexical index size / build time] → Mitigation: optional feature flag; cap vocabulary or use streaming build; document memory use.
- [Score fusion tuning] → Mitigation: sane defaults; document examples; optional per-environment overrides.
- [Dependency footprint] → Mitigation: prefer minimal libraries or a small internal BM25; make hybrid an optional install path if needed.
- [Tool surface creep] → Mitigation: prefer one extended tool with optional fields if it keeps schemas simpler; otherwise one well-named additional tool.

## Migration Plan

1. Ship config defaults identical to current behavior (`semantic`-only, no hybrid, no MMR).
2. Rebuild corpus/index after enabling hybrid so lexical structures exist.
3. Rollback: disable hybrid/MMR in config and rebuild or use prior index artifact if versioned.

## Open Questions

- Exact library for BM25/TF‑IDF vs minimal custom implementation (trade maintainability vs deps).
- Whether to version index files on disk when lexical data is added (for mixed-version deployments).
- Preferred stable format for optional metadata in tool responses (JSON suffix vs separate MCP resource—leaning JSON-in-text for simplicity).
