## ADDED Requirements

### Requirement: search_docs optional advanced parameters

The system SHALL extend the `search_docs` tool input schema with optional fields documented in configuration (for example `include_metadata`, scope filters, or additional query variants) while preserving a required string `query` property for backward compatibility.

#### Scenario: Legacy clients unchanged

- **WHEN** the client calls `search_docs` with only `{ "query": "text" }`
- **THEN** the system SHALL accept the request and SHALL behave according to default retrieval settings

#### Scenario: Optional metadata honored when requested

- **WHEN** the client sets optional fields requesting retrieval metadata and the server supports those fields
- **THEN** the response SHALL include the requested metadata in the documented format without dropping required chunk text for each hit

---

### Requirement: Multi-query MCP tool registration

The system SHALL register the multi-query retrieval tool described in the multi-hop query support capability with a stable tool name and Zod `inputSchema` consistent with the TypeScript MCP SDK patterns used by existing tools.

#### Scenario: Tool discoverable at startup

- **WHEN** the MCP server has finished startup and the capability is enabled in configuration
- **THEN** clients SHALL be able to invoke the multi-query tool by its configured name

#### Scenario: Disabled capability hides tool

- **WHEN** the multi-query tool is disabled by configuration
- **THEN** the server SHALL NOT register that tool or SHALL document a no-op error response consistent with the implementation
