# mcp-server-and-tools Specification

## Purpose
TBD - created by archiving change implement-local-doc-ai-mcp. Update Purpose after archive.
## Requirements
### Requirement: MCP server runtime

The system SHALL run as a Node.js process (`server.runtime: node`) and SHALL expose an MCP server that registers tools consistent with the `tools` list in `openspec/config.yaml`.

#### Scenario: Tools registered

- **WHEN** the MCP server has finished startup
- **THEN** clients SHALL be able to invoke tools named `search_docs` and `get_document`

---

### Requirement: search_docs tool contract

The system SHALL expose a tool named `search_docs` whose input schema matches the configuration: an object with a required string property `query`.

#### Scenario: Valid query accepted

- **WHEN** the client calls `search_docs` with `{ "query": "any non-empty string" }`
- **THEN** the system SHALL run semantic search over the index and return a structured result

#### Scenario: Missing query rejected

- **WHEN** the client calls `search_docs` without a `query` property
- **THEN** the system SHALL return an error suitable for MCP without crashing the server

---

### Requirement: get_document tool contract

The system SHALL expose a tool named `get_document` whose input schema matches the configuration: an object with a required string property `filename`.

#### Scenario: Document retrieved within roots

- **WHEN** `filename` resolves to a file path inside a configured knowledge source root and the extension is allowed
- **THEN** the tool SHALL return the full text content of that file (or a documented binary-safe representation for PDF if full text is already extracted elsewhere)

#### Scenario: Path escapes rejected

- **WHEN** `filename` attempts directory traversal outside configured roots (for example using `..` segments or absolute paths outside allowed trees)
- **THEN** the tool SHALL not read arbitrary files and SHALL return an error

---

### Requirement: Logging level

The system SHALL emit logs at verbosity consistent with `logging.level` in `openspec/config.yaml` (for example `info`).

#### Scenario: Startup banner

- **WHEN** the server starts with `logging.level` set to `info`
- **THEN** at least one log line SHALL confirm successful config load or a clear failure reason

---

### Requirement: TypeScript SDK usage per official documentation

The system SHALL implement the MCP server using the TypeScript patterns from [Build an MCP server — TypeScript](https://modelcontextprotocol.io/docs/develop/build-server#typescript): construct **`McpServer`** from `@modelcontextprotocol/sdk/server/mcp.js`, connect with **`StdioServerTransport`** from `@modelcontextprotocol/sdk/server/stdio.js`, register tools with **`server.registerTool`** using **`zod@3`** fields in `inputSchema`, and return tool results in the SDK shape (for example **`content` arrays with `type: "text"`** entries).

#### Scenario: Stdio server connects

- **WHEN** the process starts successfully
- **THEN** the server SHALL create a `StdioServerTransport`, call `await server.connect(transport)`, and SHALL follow the tutorial’s async `main` entry pattern

#### Scenario: Tools use Zod input schemas

- **WHEN** tools are registered
- **THEN** each tool’s `inputSchema` SHALL be expressed with Zod schemas compatible with the SDK tutorial (for example `query: z.string().describe(...)`) for `search_docs` and `get_document`

---

### Requirement: Stdio-safe logging

When the MCP transport is stdio-based, the system SHALL NOT write routine diagnostic output to **stdout** (for example it SHALL NOT use `console.log` for informational messages), because stdout carries JSON-RPC traffic. The system SHALL use **stderr** (for example `console.error`) or a logger that writes only to stderr or to files.

#### Scenario: Stdio JSON-RPC not corrupted by logs

- **WHEN** the server runs with `StdioServerTransport`
- **THEN** informational and error diagnostics intended for operators SHALL not be written to stdout in a way that interleaves with MCP messages

---

### Requirement: Server port configuration acknowledged

The system SHALL read `server.port` from configuration. For the **default stdio** transport described in the TypeScript tutorial, that port is not used. If a future implementation adds an HTTP-based MCP transport that binds a TCP port, the process SHALL listen on `server.port` when that transport is enabled and so configured.

#### Scenario: Port binding when HTTP transport is used

- **WHEN** the implementation uses an HTTP-capable transport bound to `server.port`
- **THEN** the server SHALL accept connections on that port on localhost by default unless documented otherwise

