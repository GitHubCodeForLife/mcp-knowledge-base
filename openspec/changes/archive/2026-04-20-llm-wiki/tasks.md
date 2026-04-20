## 1. Wiki and KB layout conventions

- [x] 1.1 Add default `raw/` and `wiki/` folders (with minimal README placeholders) and document their intent
- [x] 1.2 Add minimal required wiki entry points: create `wiki/index.md` and `wiki/log.md` initialization helpers (or initial files)
- [x] 1.3 Ensure wiki paths are treated as writable while raw paths remain immutable (enforce in code paths that write files)

## 2. Configuration and multi-root document resolution

- [x] 2.1 Extend `openspec/config.yaml` schema (and `src/config/loadConfig.ts`) to support explicit wiki root and wiki-first preference
- [x] 2.2 Update path normalization and confinement (`src/paths/pathPrefix.ts`) so prefixes can safely target `wiki/` without traversal
- [x] 2.3 Update document resolution (`src/paths/resolveDocument.ts`) to resolve across multiple configured roots and keep relative paths stable (including `raw/` vs `wiki/` in returned paths)

## 3. Indexing and retrieval behavior updates

- [x] 3.1 Update discovery/index build (`src/ingestion/discover.ts` and related ingestion pipeline) to index both raw and wiki sources from configuration
- [x] 3.2 Update retrieval ranking (`src/search/hybridRetriever.ts`) to support an optional wiki-first preference (filter/boost) while preserving existing retrieval modes
- [x] 3.3 Add tests that validate multi-root indexing and wiki-first ranking behavior does not regress current semantics

## 4. MCP tools: wiki operations

- [x] 4.1 Define input/output shapes for wiki operations (ingest/query/file/lint) and validate with `zod` in `src/mcp/registerTools.ts`
- [x] 4.2 Implement `wiki_ingest_source` tool: read raw source, write/update `wiki/sources/...`, update `wiki/index.md`, append `wiki/log.md`, return changed-file list
- [x] 4.3 Implement `wiki_query` tool: read `wiki/index.md`, select relevant pages, return answer with citations; allow raw fallback via existing retrieval
- [x] 4.4 Implement `wiki_file_answer` tool: create a new wiki page from a provided answer, update index/log, return created path
- [x] 4.5 Implement `wiki_lint` tool: detect missing `index.md`/`log.md`, orphan pages (not in index), and surface contradiction markers; return actionable issues

## 5. Archive folder references and documentation

- [x] 5.1 Update docs/README to explain how this change will be archived under `openspec/changes/archive/` and how to consult archived changes for examples
- [x] 5.2 Add a short “how to use” walkthrough in `docs/` for the LLM-wiki workflow (ingest → query → file → lint), referencing `openspec/changes/archive/2026-04-19-implement-local-doc-ai-mcp/` as prior-art where helpful

## 6. Validation and regression checks

- [x] 6.1 Run unit tests (`npm test`) and add/adjust tests for new wiki tools and path confinement
- [x] 6.2 Run `openspec validate` to confirm change artifacts are consistent and ready for apply
