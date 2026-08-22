# EvidenceLens MCP

EvidenceLens MCP is a TypeScript Model Context Protocol server for deterministic, read-only evidence review contracts. Phase 2 exposes a single `review_evidence` tool that normalizes explicitly supplied text, table, PDF, image, and screenshot content into provenance metadata while keeping findings empty and making no provider calls or filesystem reads.

## Local Development

```bash
npm install
npm run dev
npm test
npm run build
```

`npm run dev` starts the MCP server over stdio from `src/server.ts`. `npm test` runs the full contract, normalizer, fixture, safety, and MCP protocol test suite. `npm run build` type-checks and compiles the server.

## MCP Contract

See [docs/mcp-contract.md](docs/mcp-contract.md) for the exact Phase 2 content-bearing request contract, canonical base64 and byte limits, normalizedEvidence response shape, hashes/references/extraction metadata/warnings, and the read-only/no-provider/no-findings boundaries.
