# EvidenceLens MCP

EvidenceLens MCP is a TypeScript Model Context Protocol server for read-only evidence review. The single `review_evidence` tool accepts four distinct required course roles plus optional evidence, normalizes inline and explicitly configured filesystem sources, and returns schema-validated findings with typed provenance. Deterministic rules remain independently retained alongside an optional DeepSeek second opinion.

## Local Development

```bash
npm install
npm run dev
npm test
npm run test:deepseek-live # opt-in adapter-only Vision structure
npm run docker:review:real # opt-in complete Docker MCP stdio proof
npm run build
```

`npm run dev` starts the MCP server over stdio from `src/server.ts`. `npm test` runs the full credential-free, no-network contract, normalizer, fixture, safety, and MCP protocol suite; it excludes the live provider test and sets `EVIDENCELENS_DISABLE_PROVIDER=1` so ambient DeepSeek credentials cannot enable provider calls. `npm run build` type-checks and compiles the server.

## Docker deployment and offline validation

The canonical fresh-checkout Docker runbook is [docs/docker-deployment.md](docs/docker-deployment.md). It covers the hardened direct-stdio image, the whole-project read-only `/workspace` mount, the exact `course=/workspace` allowlist, the four fixed evidence fixtures, and the explicit credentialed DeepSeek path.

The routine commands are credential-free and no-network:

```bash
docker compose --profile smoke build
npm run docker:smoke
npm run test:e2e
```

The smoke path validates MCP `initialize`, `tools/list`, and `tools/call` over stdio. The E2E path injects an offline-compatible provider and checks schemas, findings, typed citations, hashes, and logical `filesystem://course/...` provenance without asserting model prose. It does not call DeepSeek.

## Optional DeepSeek provider

Runtime reads the ignored `.evidencelens.local.json` file (or explicitly supplied `DEEPSEEK_*` environment values) and registers only the built-in DeepSeek provider. Start from the redacted [.evidencelens.local.example.json](.evidencelens.local.example.json):

```json
{
  "apiKey": "REPLACE_WITH_DEEPSEEK_API_KEY",
  "baseUrl": "https://api.deepseek.com",
  "model": "deepseek-v4-pro",
  "timeoutMs": 30000,
  "maxRetries": 2,
  "maxTotalWaitMs": 10000,
  "temperature": 0.2,
  "maxTokens": 8000
}
```

The default model is `deepseek-v4-pro`; the allowlist is `deepseek-v4-pro`, `deepseek-v4-flash`, and `deepseek-v4-flash-vision-exp`. The default output cap is 8,000 tokens. Thinking mode is enabled with `reasoning_effort: high` for the V4 text models; the vision model uses the official base64 `image_url` Chat Completions format. Timeouts are bounded to 1–120 seconds, retries to 0–2, total retry wait to 1–60 seconds, and inference tokens to 1–20,000. Configuration is typed and fail-closed; arbitrary provider names or npm modules are never loaded. The certified Compose review/proof path fixes the output cap at 8,000 so a host environment cannot silently substitute an unreviewed lower or higher value; proof retries remain zero and the proof request budget remains one.

Provider-enabled local and Docker startup requires a valid `.evidencelens.local.json` file or valid `DEEPSEEK_*` environment configuration. Missing, malformed, conflicting, or unreadable configuration exits with the sanitized `PROVIDER_CONFIGURATION` classification; it never falls back to deterministic-only output. Set exactly `EVIDENCELENS_DISABLE_PROVIDER=1` for intentional offline operation, as used by routine no-network tests and smoke checks. Injected providers and typed `providerConfig` are embedding/test seams, not end-user configuration options.

Two real-provider commands are deliberately opt-in. `npm run test:deepseek-live` checks adapter-only Vision structure using either `DEEPSEEK_API_KEY` from the process environment or the ignored `.evidencelens.local.json` file; it skips only when neither usable credential source exists. `npm run docker:review:real` checks the complete credentialed Docker MCP stdio path and requires a process-level `DEEPSEEK_API_KEY` plus Docker. Both commands require network access and may incur API cost, and both are excluded from `npm test`. The live screenshot check uses `deepseek-v4-flash-vision-exp`; V4 text models use thinking mode, while the vision request uses the official base64 `image_url` format without thinking parameters. A `finish_reason` of `length` is accepted only when the returned content independently passes the same bounded single-root extraction, strict schema, and locally bound provenance validation as `stop`; incomplete or invalid content still fails closed. Byte-for-byte equality remains scoped to deterministic-only offline output; neither live command promises byte-for-byte equality of model prose, and assertions cover structure, safe attribution, provider finding namespacing, and locally validated citation/hash provenance. The model returns compact evidence references; local normalized evidence remains authoritative for citation binding and provenance. Credential-free fixtures remain the required regression gate. Injected-provider E2E remains a credential-free semantic test and is not credentialed proof.

## MCP Contract

See [docs/mcp-contract.md](docs/mcp-contract.md) for the exact four-role request contract, duplicate-ID and stable errors, deterministic finding fields and citation mapping, root configuration grammar, byte limits, `filesystem://` provenance, transient analysis boundary, and read-only/no-provider behavior. See [docs/docker-deployment.md](docs/docker-deployment.md) for container-specific mounts, profiles, and startup preflight behavior.

For identical inputs, deterministic-only offline results are byte-for-byte equal and retain the fixed request/timestamp mapping. Provider-backed finding content may vary between calls. Provider-backed responses guarantee only strict schema validation, safe attribution, provider finding namespacing, and locally validated citation/hash provenance.

Provider-backed responses add an optional `metadata.provider` child only when provider findings are returned. Only provider `name` and `model` are public attribution. Credentials/API keys, endpoint/base URL, prompt text/version, input fingerprint, provider request/result envelope, raw upstream response, and retry/transport internals are never public and never serialized. Existing deterministic analyzer metadata and deterministic-only response bytes remain unchanged.

Platform note: the default filesystem reader uses descriptor-relative component walking on Linux. On macOS, where this project has no supported Node `openat`/`openat2` binding, default anchored filesystem reads fail closed with sanitized `ACCESS_DENIED` and no bytes; there is no pathname fallback. Phase 2 inline evidence remains supported, and embedding tests may inject a reviewed safe filesystem adapter for portable filesystem-read coverage.

## Optional filesystem roots

Filesystem access is disabled when no roots are configured; the server never falls back to the current directory, home directory, repository, or another broad default. Configure explicit roots with repeated `id=absolute-path` entries separated by commas or semicolons:

```bash
EVIDENCELENS_ALLOWED_ROOTS='course=/absolute/path/course;examples=/absolute/path/examples' npm run dev
```

Root IDs match `[A-Za-z][A-Za-z0-9_-]{0,31}`. Empty entries, duplicate IDs, canonical path collisions, unreadable roots, non-directories, relative paths, and malformed entries fail with the stable message `Invalid filesystem root configuration`; paths are never echoed.
