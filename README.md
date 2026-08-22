# EvidenceLens MCP

EvidenceLens MCP is a TypeScript Model Context Protocol server for deterministic, read-only evidence review. The single `review_evidence` tool accepts four distinct required course roles plus optional evidence, normalizes inline and explicitly configured filesystem sources, and returns schema-validated findings with typed provenance. It remains provider-independent and makes no network or provider calls.

## Local Development

```bash
npm install
npm run dev
npm test
npm run build
```

`npm run dev` starts the MCP server over stdio from `src/server.ts`. `npm test` runs the full contract, normalizer, fixture, safety, and MCP protocol test suite. `npm run build` type-checks and compiles the server.

## MCP Contract

See [docs/mcp-contract.md](docs/mcp-contract.md) for the exact four-role request contract, duplicate-ID and stable errors, deterministic finding fields and citation mapping, root configuration grammar, byte limits, `filesystem://` provenance, transient analysis boundary, and read-only/no-provider/no-Docker behavior.

Platform note: the default filesystem reader uses descriptor-relative component walking on Linux. On macOS, where this project has no supported Node `openat`/`openat2` binding, default anchored filesystem reads fail closed with sanitized `ACCESS_DENIED` and no bytes; there is no pathname fallback. Phase 2 inline evidence remains supported, and embedding tests may inject a reviewed safe filesystem adapter for portable filesystem-read coverage.

## Optional filesystem roots

Filesystem access is disabled when no roots are configured; the server never falls back to the current directory, home directory, repository, or another broad default. Configure explicit roots with repeated `id=absolute-path` entries separated by commas or semicolons:

```bash
EVIDENCELENS_ALLOWED_ROOTS='course=/absolute/path/course;examples=/absolute/path/examples' npm run dev
```

Root IDs match `[A-Za-z][A-Za-z0-9_-]{0,31}`. Empty entries, duplicate IDs, canonical path collisions, unreadable roots, non-directories, relative paths, and malformed entries fail with the stable message `Invalid filesystem root configuration`; paths are never echoed.
