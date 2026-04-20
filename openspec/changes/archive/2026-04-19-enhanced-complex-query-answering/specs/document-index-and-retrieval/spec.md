## ADDED Requirements

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
