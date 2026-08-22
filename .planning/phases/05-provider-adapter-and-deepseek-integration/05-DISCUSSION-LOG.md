# Phase 5: Provider Adapter and DeepSeek Integration - Discussion Log

> **Audit trail only.** Decisions are captured in `05-CONTEXT.md`; this log preserves the alternatives considered.

**Date:** 2026-08-23
**Phase:** 5-provider-adapter-and-deepseek-integration
**Areas discussed:** Provider interface and input/output, configuration and credentials, provider failure handling, provider replacement and tests

## Provider interface and input/output

| Option | Description | Selected |
|--------|-------------|----------|
| Independent provider DTO | Structured normalized evidence package mapped to provider input | ✓ |
| Direct internal analysis input | Provider receives internal `ReviewAnalysisInput` | |
| Prompt and image arrays only | Simpler but weaker structure and provenance | |

**User's choice:** Independent provider DTO; structured JSON findings draft with local validation.
**Notes:** DeepSeek and deterministic-rules results remain separate independent opinions; there is no ground-truth output. Input consistency is the invariant, not output equality.

## Configuration and credentials

| Option | Description | Selected |
|--------|-------------|----------|
| Project-local config | Store API key and settings in a Git-ignored local project file | ✓ |
| Environment-only key | Store key only in environment variables | |
| MCP-request key | Pass key per request | |

**User's choice:** Project-local config; local file is ignored and only a redacted example is committed.
**Notes:** Default model is `deepseek-v4-flash-vision-exp`; allowed models are `deepseek-v4-flash-vision-exp`, `deepseek-v4-flash`, and `deepseek-v4-pro`. Configuration conflicts fail rather than silently override.

## Provider failure handling

| Option | Description | Selected |
|--------|-------------|----------|
| Bounded transient retry | Retry 429, 5xx, network and timeout failures only | ✓ |
| Retry all failures | Retry even permanent request/auth failures | |
| No retry | Return immediately | |

**User's choice:** At most two jittered exponential-backoff retries with timeout and total-wait bounds.
**Notes:** Stable local error codes and requestId are returned; malformed successful responses become `PROVIDER_INVALID_RESPONSE` and are never guessed or silently replaced.

## Provider replacement and tests

| Option | Description | Selected |
|--------|-------------|----------|
| Stable interface, DeepSeek runtime | Only DeepSeek registered now; interface remains replaceable | ✓ |
| Arbitrary dynamic modules | Load any configured npm provider | |
| Direct DeepSeek in handler | No adapter boundary | |

**User's choice:** Stable interface with real DeepSeek calls in the default test path.
**Notes:** Tests use fixed, non-sensitive repository fixtures and assert structure/provenance/categories rather than exact natural-language snapshots. This requires a local API key and network access.

## the agent's Discretion

- Exact interface and DTO names, config filename, prompt wording, serialization layout, retry delay values within bounds, and HTTP client implementation.

## Deferred Ideas

- Additional providers, multi-model consensus comparison, and persistent Files API caching are outside Phase 5.
