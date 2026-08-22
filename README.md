# EvidenceLens MCP

EvidenceLens MCP is a TypeScript Model Context Protocol server for deterministic, read-only evidence review contracts. The single `review_evidence` tool accepts Phase 2 inline content and, when explicitly configured, Phase 3 filesystem sources. It normalizes text, tables, PDFs, images, and screenshots into provenance metadata while keeping findings empty and making no provider calls.

## Local Development

```bash
npm install
npm run dev
npm test
npm run build
```

`npm run dev` starts the MCP server over stdio from `src/server.ts`. `npm test` runs the full contract, normalizer, fixture, safety, and MCP protocol test suite. `npm run build` type-checks and compiles the server.

## MCP Contract

See [docs/mcp-contract.md](docs/mcp-contract.md) for the exact inline/filesystem request contract, root configuration grammar, byte limits, `filesystem://` provenance, normalized evidence metadata, stable errors, and the read-only/no-provider/no-findings boundaries.

## Optional filesystem roots

Filesystem access is disabled when no roots are configured; the server never falls back to the current directory, home directory, repository, or another broad default. Configure explicit roots with repeated `id=absolute-path` entries separated by commas or semicolons:

```bash
EVIDENCELENS_ALLOWED_ROOTS='course=/absolute/path/course;examples=/absolute/path/examples' npm run dev
```

Root IDs match `[A-Za-z][A-Za-z0-9_-]{0,31}`. Empty entries, duplicate IDs, canonical path collisions, unreadable roots, non-directories, relative paths, and malformed entries fail with the stable message `Invalid filesystem root configuration`; paths are never echoed.
