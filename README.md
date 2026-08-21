# EvidenceLens MCP

EvidenceLens MCP is a TypeScript Model Context Protocol server for deterministic, read-only evidence review contracts. Phase 1 exposes a single metadata-only `review_evidence` tool so MCP clients can validate discovery, request shape, response shape, and error semantics before later evidence access or provider integration exists.

## Local Development

```bash
npm install
npm run dev
npm test
npm run build
```

`npm run dev` starts the MCP server over stdio from `src/server.ts`. `npm test` runs the contract and smoke tests, including MCP protocol-level discovery and invocation checks.

## MCP Contract

See [docs/mcp-contract.md](docs/mcp-contract.md) for the `review_evidence` tool name, stdio transport, request fields, supported evidence roles and types, Phase 1 limits, response mapping, and stable error codes.
