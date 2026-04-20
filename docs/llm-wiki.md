# LLM Wiki workflow

This repo supports a **two-layer knowledge base**:
- `raw/`: immutable source documents
- `wiki/`: an LLM-maintained markdown wiki that compounds over time

## Recommended loop

### 1) Ingest

1. Add a source under `raw/` (or another configured mount).
2. Use `get_document` to read the source.
3. Have your LLM produce a summary markdown page, then call `wiki_ingest_source` with:
   - `source_filename`
   - `summary_title`
   - `summary_markdown`

The server will write `wiki/sources/<slug>.md`, update `wiki/index.md`, and append to `wiki/log.md`.

### 2) Query (wiki-first)

Call `wiki_query` with:
- `query`
- optional `include_raw_fallback=true`

This returns top matching chunks from `wiki/*` first, and optionally `raw/*`.

### 3) File high-value answers

If an answer is worth keeping, call `wiki_file_answer` with:
- `title`
- `markdown`

The server writes `wiki/analyses/<slug>.md` and updates index/log.

### 4) Lint

Call `wiki_lint` to find:
- missing `wiki/index.md` / `wiki/log.md`
- orphan pages not referenced in the index
- pages with contradiction markers

## Archive reference

For prior art on how changes are finalized, see `openspec/changes/archive/` (for example `openspec/changes/archive/2026-04-19-implement-local-doc-ai-mcp/`).

