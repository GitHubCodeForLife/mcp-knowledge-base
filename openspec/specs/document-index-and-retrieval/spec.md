# document-index-and-retrieval Specification

## Purpose
TBD - created by archiving change implement-local-doc-ai-mcp. Update Purpose after archive.
## Requirements
### Requirement: Configuration-driven knowledge sources

The system SHALL load `openspec/config.yaml` from the project root (or an explicit override path documented at implementation time) and SHALL use `knowledge_base.sources` to determine which local directories are indexed.

#### Scenario: Valid local source loads

- **WHEN** the configuration contains a `local_files` source with `path` pointing to an existing directory
- **THEN** the indexer SHALL scan that directory for files whose extension is listed in `file_types`

#### Scenario: Unsupported file type ignored

- **WHEN** a file extension is not listed in `file_types` for that source
- **THEN** the file SHALL be skipped without failing the overall index build

---

### Requirement: Text extraction and encoding

The system SHALL read `.txt` and `.md` files as UTF-8 text per `knowledge_base.ingestion.encoding`. The system SHALL extract text from `.pdf` files using a PDF text extraction approach suitable for server-side Node.js.

#### Scenario: Markdown file ingested

- **WHEN** a `.md` file is under a configured source path
- **THEN** its full text SHALL be available for chunking

#### Scenario: PDF file ingested

- **WHEN** a `.pdf` file is under a configured source path
- **THEN** extracted text SHALL be available for chunking or the file SHALL be reported as failed with a clear error in logs

---

### Requirement: Chunking parameters

The system SHALL split ingested text into chunks using `knowledge_base.ingestion.chunk_size` and `knowledge_base.ingestion.chunk_overlap` from configuration.

#### Scenario: Chunk overlap applied

- **WHEN** `chunk_overlap` is greater than zero and less than `chunk_size`
- **THEN** adjacent chunks SHALL overlap by that many characters (or the documented equivalent behavior)

---

### Requirement: Semantic retrieval

When `retrieval.method` is `semantic`, the system SHALL embed the user query and SHALL return up to `retrieval.top_k` chunk results ranked by semantic similarity to the query.

#### Scenario: Top K limit respected

- **WHEN** the index contains more than `top_k` matching chunks
- **THEN** the response SHALL include at most `top_k` results

---

### Requirement: Result payload for search

Each search result returned to MCP tool callers SHALL identify the source document (for example by relative file path or configured display name) and SHALL include the chunk text or snippet needed to answer the query.

#### Scenario: Search returns traceable hits

- **WHEN** `search_docs` completes successfully with at least one hit
- **THEN** each hit SHALL include enough information for a user to locate the originating file within configured roots

---

### Requirement: Lexical index for hybrid retrieval

When hybrid retrieval is enabled in configuration, the system SHALL build and persist or retain in memory a lexical retrieval structure over chunked text alongside dense embeddings, using a documented algorithm (for example BM25 or TF‑IDF).

#### Scenario: Hybrid disabled skips lexical build

- **WHEN** hybrid retrieval is disabled
- **THEN** the system MAY omit building the lexical structure and SHALL continue to support dense semantic retrieval

#### Scenario: Index build failure is visible

- **WHEN** hybrid is enabled and lexical index construction fails for a recoverable reason
- **THEN** the process SHALL log a clear error and SHALL either fail the build explicitly or fall back to a documented safe mode

---

### Requirement: Retrieval method configuration

The system SHALL extend `retrieval.method` or an equivalent configuration field to allow selecting hybrid retrieval in addition to semantic-only retrieval.

#### Scenario: Semantic method preserved

- **WHEN** configuration sets retrieval to semantic-only
- **THEN** ranking SHALL not require a lexical score

#### Scenario: Hybrid method requires lexical data

- **WHEN** configuration sets retrieval to hybrid and the corpus is indexed successfully
- **THEN** both lexical and dense signals SHALL be available to the retrieval pipeline at query time

