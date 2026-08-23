# EvidenceLens MCP

EvidenceLens MCP is a TypeScript Model Context Protocol server for read-only evidence review. The single `review_evidence` tool accepts four distinct required course roles plus optional evidence, normalizes inline and explicitly configured filesystem sources, and returns schema-validated findings with typed provenance. Deterministic rules remain independently retained alongside an optional DeepSeek second opinion.

## Local Development

```bash
npm install
npm run dev
npm test
npm run test:deepseek-live # opt-in real API test
npm run build
```

`npm run dev` starts the MCP server over stdio from `src/server.ts`. `npm test` runs the full credential-free, no-network contract, normalizer, fixture, safety, and MCP protocol suite; it excludes the live provider test. `npm run build` type-checks and compiles the server.

## Optional DeepSeek provider

Runtime reads the ignored `.evidencelens.local.json` file (or explicitly supplied `DEEPSEEK_*` environment values) and registers only the built-in DeepSeek provider. Start from the redacted [.evidencelens.local.example.json](.evidencelens.local.example.json):

```json
{
  "apiKey": "REPLACE_WITH_DEEPSEEK_API_KEY",
  "baseUrl": "https://api.deepseek.com",
  "model": "deepseek-v4-flash-vision-exp",
  "timeoutMs": 30000,
  "maxRetries": 2,
  "maxTotalWaitMs": 10000,
  "temperature": 0.2,
  "maxTokens": 4000
}
```

The default model is `deepseek-v4-flash-vision-exp`; the allowlist is `deepseek-v4-flash-vision-exp`, `deepseek-v4-flash`, and `deepseek-v4-pro`. Timeouts are bounded to 1–120 seconds, retries to 0–2, total retry wait to 1–60 seconds, and inference tokens to 1–20,000. Configuration is typed and fail-closed; arbitrary provider names or npm modules are never loaded.

The real API test is opt-in only: `npm run test:deepseek-live`. It requires `DEEPSEEK_API_KEY`, network access, and may incur API cost. It preflight-skips only when that key is absent under this named command; the default `npm test` command never invokes it. Live output is variable, so structural findings/provenance are asserted rather than exact wording. Local normalized evidence remains authoritative for citation binding and provenance.

## MCP Contract

See [docs/mcp-contract.md](docs/mcp-contract.md) for the exact four-role request contract, duplicate-ID and stable errors, deterministic finding fields and citation mapping, root configuration grammar, byte limits, `filesystem://` provenance, transient analysis boundary, and read-only/no-provider/no-Docker behavior.

Platform note: the default filesystem reader uses descriptor-relative component walking on Linux. On macOS, where this project has no supported Node `openat`/`openat2` binding, default anchored filesystem reads fail closed with sanitized `ACCESS_DENIED` and no bytes; there is no pathname fallback. Phase 2 inline evidence remains supported, and embedding tests may inject a reviewed safe filesystem adapter for portable filesystem-read coverage.

## Optional filesystem roots

Filesystem access is disabled when no roots are configured; the server never falls back to the current directory, home directory, repository, or another broad default. Configure explicit roots with repeated `id=absolute-path` entries separated by commas or semicolons:

```bash
EVIDENCELENS_ALLOWED_ROOTS='course=/absolute/path/course;examples=/absolute/path/examples' npm run dev
```

Root IDs match `[A-Za-z][A-Za-z0-9_-]{0,31}`. Empty entries, duplicate IDs, canonical path collisions, unreadable roots, non-directories, relative paths, and malformed entries fail with the stable message `Invalid filesystem root configuration`; paths are never echoed.
