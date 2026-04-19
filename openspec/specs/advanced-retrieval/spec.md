# advanced-retrieval Specification

## Purpose

Configurable hybrid and advanced ranking over local document chunks: dense semantic search, optional lexical (BM25-style) fusion, candidate pools, diversity (MMR), and optional retrieval metadata for MCP tool responses.

## Requirements

### Requirement: Configurable retrieval strategy

The system SHALL support a retrieval strategy selected via configuration that includes at least dense semantic search and MAY include hybrid fusion with a lexical score when enabled.

#### Scenario: Semantic-only default

- **WHEN** configuration selects semantic-only retrieval (or equivalent default)
- **THEN** the system SHALL rank candidates using dense embedding similarity consistent with the existing semantic retrieval behavior unless otherwise specified by configuration

#### Scenario: Hybrid mode combines signals

- **WHEN** configuration enables hybrid retrieval and the lexical index is available for the corpus
- **THEN** the system SHALL combine dense and lexical relevance into a single ranking per documented fusion rules and weights

---

### Requirement: Candidate pool and diversity

The system SHALL support retrieving a candidate pool larger than the final `top_k` when configured, and SHALL apply a documented diversity or de-duplication step (for example MMR or per-document caps) before returning final results.

#### Scenario: Diversity reduces redundant chunks

- **WHEN** diversity or MMR is enabled and multiple top-scoring chunks come from the same document
- **THEN** the final result set SHALL favor diverse sources according to the configured diversity parameters without exceeding `top_k` results

---

### Requirement: Retrieval transparency

When verbose retrieval metadata is requested via configuration or tool input, the system SHALL include per-hit information sufficient to explain ranking (for example dense score, lexical score, fusion score, and retrieval method identifiers) in a documented machine-readable format alongside the existing human-readable chunk text.

#### Scenario: Metadata is optional

- **WHEN** verbose metadata is not requested
- **THEN** the tool SHALL return results in the default text-oriented format without requiring clients to parse structured metadata
