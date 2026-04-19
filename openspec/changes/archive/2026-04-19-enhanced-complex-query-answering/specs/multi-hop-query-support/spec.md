## ADDED Requirements

### Requirement: Multi-query retrieval tool

The system SHALL expose an MCP tool that accepts multiple query strings in one invocation and returns a merged ranked result set suitable for complicated questions that need several evidence passes.

#### Scenario: Multiple queries accepted

- **WHEN** the client invokes the multi-query tool with a non-empty array of query strings within documented limits
- **THEN** the system SHALL execute retrieval for each query and merge or fuse results according to documented rules without crashing the server

#### Scenario: Single-query compatibility path

- **WHEN** the client supplies exactly one query in the multi-query tool
- **THEN** the behavior SHALL be equivalent to semantic retrieval for that query subject to the same configuration limits

---

### Requirement: Optional scope filters for follow-up retrieval

The system SHALL allow narrowing search scope via optional tool parameters (for example path prefix or filename filter) that restrict matches to documents under configured knowledge roots.

#### Scenario: Path prefix limits hits

- **WHEN** the client provides a valid path prefix filter that resolves under an allowed knowledge root
- **THEN** the tool SHALL return only hits whose source document path matches the filter

#### Scenario: Invalid scope rejected safely

- **WHEN** the client provides a scope filter that escapes configured roots or is otherwise invalid
- **THEN** the tool SHALL return an error suitable for MCP and SHALL not read files outside allowed trees
