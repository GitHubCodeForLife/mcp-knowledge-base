## Why

Today the project primarily supports “ask questions over raw documents” (RAG-style retrieval). This works, but it forces the LLM to rediscover structure and synthesis on every query and does not accumulate knowledge over time.

We want a persistent, compounding “LLM-maintained wiki” layer that is incrementally updated as new sources arrive, so answers and synthesis become cheaper, more consistent, and more reusable.

## What Changes

- Introduce a **two-layer knowledge base** convention: immutable **raw sources** plus an LLM-generated **wiki** layer (markdown pages).
- Add workflows for:
  - ingesting a new raw source and updating multiple wiki pages deterministically (index, log, entity/concept pages)
  - querying the wiki (and optionally falling back to raw sources) with citations
  - linting/health-checking the wiki (contradictions, staleness, orphans, missing pages, weak cross-links)
- Extend the MCP server with tools and data structures to support the above, so an agent can operate the wiki programmatically (not just via manual file edits).
- Provide a minimal default wiki structure (`index.md`, `log.md`, page conventions) that scales to hundreds of pages without requiring embeddings infrastructure.

## Capabilities

### New Capabilities
- `wiki-layout-and-conventions`: Define and enforce the on-disk structure for `raw/` and `wiki/`, plus page conventions (links, metadata/frontmatter, index/log formats).
- `wiki-ingest-and-maintain`: Ingest a new raw source and apply deterministic wiki updates (create/update summary + touch related pages + update index/log).
- `wiki-query-and-file-answers`: Answer questions by navigating wiki pages first (index-driven), with citations, and optionally file high-value answers back into the wiki.
- `wiki-lint-and-health-check`: Analyze the wiki for structural and semantic issues (orphans, contradictions, stale claims, missing entities/concepts) and propose fixes/tasks.

### Modified Capabilities
- `document-index-and-retrieval`: Add first-class support for searching across both `raw/` and `wiki/`, and for preferentially targeting the wiki layer for Q&A.

## Impact

- **Code**: MCP tool surface area grows (new tools for ingest/query/lint + filesystem operations); retrieval/index code must understand multi-root collections (`raw/`, `wiki/`).
- **Docs/specs**: New conventions and workflows must be specified and validated.
- **Dependencies**: Prefer no new mandatory infra; optional integration points (e.g. external markdown search) may be described but not required.
- **Users**: Introduces a new operating model (LLM as wiki maintainer). Existing raw-document Q&A remains supported.
