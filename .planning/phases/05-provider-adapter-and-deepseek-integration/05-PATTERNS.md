# Phase 5: Provider Adapter and DeepSeek Integration - Pattern Map

**Mapped:** 2026-08-23  
**Files analyzed:** 15 likely new/modified files  
**Analogs found:** 12 / 15 (three provider-specific files have no direct analog)

No `RESEARCH.md` exists for this phase. File names below are the most likely targets inferred from `05-CONTEXT.md` and the current structure; the planner may choose equivalent names, but should preserve the same boundaries.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/providers/types.ts` (or `src/review/provider.ts`) | provider interface / DTO | request-response transform | `src/review/analysis.ts` | role-match; new provider boundary |
| `src/providers/deepseek.ts` | provider adapter / service | request-response, streaming-capable HTTP client | `src/review/engine.ts` | role-match; no HTTP analog |
| `src/providers/config.ts` | config / validation utility | transform | `src/server.ts`, `src/filesystem/policy.ts` | role-match |
| `src/providers/errors.ts` (or `src/errors.ts`) | error mapping utility | request-response | `src/errors.ts` | exact error-contract analog |
| `src/providers/provenance.ts` (or `src/review/analysis.ts`) | validation utility | transform / request-response | `src/review/analysis.ts`, `src/contracts/review.ts` | exact provenance analog |
| `src/contracts/review.ts` | DTO/response contract | request-response | same file | exact |
| `src/tools/review.ts` | controller/orchestrator | request-response | same file | exact |
| `src/server.ts` | provider registry/config wiring | request-response | same file | exact |
| `package.json` / `package-lock.json` | config/dependency | build/runtime | same files | exact project convention |
| `.gitignore` | config/security | file I/O policy | same file | exact, currently incomplete for local secrets |
| `.evidencelens.local.example.json` | redacted config fixture/docs | transform | `README.md` configuration examples | role-match |
| `tests/providers/config.test.ts` | test | transform | `tests/smoke/project-config.test.ts` | role-match |
| `tests/providers/deepseek.test.ts` | integration test | request-response HTTP | `tests/review/engine.test.ts` | role-match; live HTTP is new |
| `tests/contract/review-provider.test.ts` | contract/integration test | request-response | `tests/contract/review-tool.test.ts` | exact test style |
| `README.md` / `docs/mcp-contract.md` | documentation | request-response/configuration | same docs | exact |

## Pattern Assignments

### `src/providers/types.ts` (provider interface / DTO, request-response transform)

**Analog:** `src/review/analysis.ts` (lines 13-53).

Keep the provider boundary independent from `ReviewAnalysisInput`. Use a dedicated DTO containing normalized role-labeled evidence, bounded text/table claims, bounded visual payloads, objective, prompt version, model/inference settings, and input fingerprint. Do not pass `clear` or a filesystem adapter to a provider.

**Existing transient-boundary pattern** (`src/review/analysis.ts:13-27`):

```typescript
export interface TransientEvidenceAnalysis {
  evidenceId: string;
  role: EvidenceRole;
  type: EvidenceType;
  reference: string;
  contentHash: string;
  references: NormalizedEvidenceReference[];
  byteLength: number;
  format?: "csv" | "tsv";
  text?: string;
  tableCells?: AnalysisTableCell[];
  bytes?: Uint8Array;
}
```

**Existing aggregate and resolver boundary** (`src/review/analysis.ts:46-53`):

```typescript
export interface ReviewAnalysisInput {
  normalizedEvidence: NormalizedEvidence[];
  payloads: TransientEvidenceAnalysis[];
  requirements: Claim[];
  solutionClaims: Claim[];
  resolveCitation: (evidenceId: string, location: NormalizedEvidenceReference, visual?: boolean) => ReviewCitation;
  clear: () => void;
}
```

The new DTO should copy the bounded data shape, but should serialize only provider-safe values. It must not expose local paths, read adapters, raw request objects, or secrets. Define `ReviewProvider` with a single async method (exact name is discretionary), returning a provider result envelope that keeps model findings separate from `deterministic-rules` findings.

### `src/providers/deepseek.ts` (provider adapter, request-response HTTP)

**Analog:** `src/review/engine.ts` (lines 5-9 and 57-83) for replaceable implementation shape; no existing HTTP/provider implementation exists.

```typescript
export interface ReviewAnalyzer {
  readonly name: "deterministic-rules";
  readonly version: "1.0.0";
  analyze(input: ReviewAnalysisInput): ReviewFinding[];
}
```

Copy the stable identity plus one operation pattern, but make the DeepSeek adapter implement the new provider interface and use `fetch`/the selected HTTP client. Build OpenAI-compatible Chat Completions messages with text plus `image_url` data URLs from bounded bytes; never send filesystem paths or upload to the persistent Files API. Use JSON Output, parse the returned content, then pass the draft through local schema/provenance validation before returning it.

**Deterministic result construction to preserve** (`src/review/engine.ts:39-53`):

```typescript
const sortedClaims = [...claims].sort((a, b) => a.evidenceId.localeCompare(b.evidenceId) || JSON.stringify(a.location).localeCompare(JSON.stringify(b.location)));
const citations = sortedClaims.map((claim) => input.resolveCitation(claim.evidenceId, claim.location, visualClaim(input, claim)));
const evidenceIds = uniqueCitations.map((citation) => citation.evidenceId).sort();
return { id, type, severity, confidence, title, summary, observation, interpretation,
  uncertainty, followUpChecks, evidenceIds, citations: uniqueCitations };
```

The adapter must not synthesize missing citations or let model text become an MCP finding without local validation. Map malformed JSON, invalid findings, and failed citation bindings to `PROVIDER_INVALID_RESPONSE`; do not partially return or fall back to deterministic findings.

### `src/providers/config.ts` (configuration utility, transform)

**Analog:** `src/server.ts:19-20` and `src/filesystem/policy.ts` parsing conventions. The current server reads environment configuration only at startup and passes a typed value into construction:

```typescript
export async function main(): Promise<void> {
  serveStdio(() => createServer({ allowedRoots: parseAllowedRoots(process.env.EVIDENCELENS_ALLOWED_ROOTS) }));
}
```

Follow the same explicit parse → validate → inject flow for a project-local file (for example `.evidencelens.local.json`) and a committed redacted example. Defaults are `https://api.deepseek.com` and `deepseek-v4-flash-vision-exp`; allow only the three context-listed model IDs. Reject conflicting sources and invalid settings before provider calls. Do not log the API key, full URL, or raw config contents.

### `src/providers/errors.ts` or `src/errors.ts` (error mapper, request-response)

**Analog:** `src/errors.ts:3-21`:

```typescript
export type EvidenceLensErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_REVIEW_ROLES"
  | "UNSUPPORTED_EVIDENCE_TYPE"
  | "UNSUPPORTED_FORMAT"
  | "LIMIT_EXCEEDED"
  | "ACCESS_DENIED"
  | "PROVIDER_FAILURE"
  | "INTERNAL_ERROR";

export class EvidenceLensError extends Error {
  readonly code: EvidenceLensErrorCode;
  constructor(code: EvidenceLensErrorCode, message: string) {
    super(message);
    this.name = "EvidenceLensError";
    this.code = code;
  }
}
```

Extend the stable error model or introduce an internal provider error that is converted to it at the MCP boundary. Preserve the sanitized wrapper (`src/errors.ts:58-73`) and add stable provider details internally: code, retryable, retry count, and request ID. Retry only 429, 5xx, connection, and timeout errors; at most two retries with bounded jittered exponential backoff. Never expose API keys, complete upstream URLs, response bodies, or stack traces. Non-retryable 400/401/402/403/422 errors must fail immediately.

### `src/providers/provenance.ts` or `src/review/analysis.ts` (validation utility, transform)

**Analog:** `src/review/analysis.ts:113-137`.

```typescript
const resolveCitation = (evidenceId: string, location: NormalizedEvidenceReference, visual = false): ReviewCitation => {
  const evidence = normalizedById.get(evidenceId);
  if (!evidence || !evidence.references.some((candidate) => JSON.stringify(candidate) === JSON.stringify(location))) {
    throw new Error("citation is not present in normalized evidence");
  }
  const payloadHash = visualPayloadHash(evidence, location);
  if (visual && payloadHash === undefined) throw new Error("visual citation has no retained payload");
  return { evidenceId, role: ..., contentHash: evidence.contentHash,
    sourceReference: evidence.source.reference, location, visual: ..., ...(payloadHash ? { visualPayloadSha256: payloadHash } : {}) };
};
```

Reuse exact evidence-ID, role, content hash, source reference, typed location, visual payload hash, and role-binding checks. The model may propose citation locations/IDs, but only locally resolved citations can enter the provider result. Use `reviewResponseSchema.parse` or a dedicated strict provider-finding schema after enriching/validating the draft. Keep the request-scoped cleanup in a `finally` boundary; `buildReviewAnalysisInput` zeroes bytes and drops transient fields at lines 126-137.

### `src/contracts/review.ts` (DTO/response contract, request-response)

**Analog:** same file, especially `reviewResponseSchema` lines 339-391 and `reviewFindingSchema` lines 308-337.

```typescript
export const reviewResponseSchema = z
  .object({
    ok: z.literal(true),
    requestId: z.string().min(1).max(128),
    status: z.literal("accepted"),
    findings: z.array(reviewFindingSchema),
    normalizedEvidence: z.array(normalizedEvidenceSchema),
    metadata: z.object({
      serverName: z.string().min(1), serverVersion: z.string().min(1),
      analyzerName: z.string().min(1).max(128), analyzerVersion: z.string().min(1).max(64),
      generatedAt: z.string().datetime()
    }).strict()
  }).strict();
```

If provider metadata is added, prefer a strict optional provider/result envelope or extension that does not alter request fields and remains compatible with MCP response parsing. Keep deterministic and DeepSeek findings as separate labeled sets; do not make a model result replace or adjudicate `deterministic-rules`. Preserve all current strict citation invariants and add provider-specific schemas rather than weakening the public response schema.

### `src/tools/review.ts` (controller/orchestrator, request-response)

**Analog:** same file, `createReviewResponse` lines 28-50 and `handleReviewRequest` lines 76-101.

```typescript
const bundle = await normalizeEvidenceBundle(request.evidence, { ...options, generatedAt: GENERATED_AT });
const analysis = buildReviewAnalysisInput(bundle);
const analyzer = createDeterministicReviewAnalyzer();
try {
  const response = { ok: true, requestId: request.reviewId, status: "accepted",
    findings: orchestrateReview({ ...analysis, reviewId: request.reviewId, objective: request.objective }),
    normalizedEvidence: bundle.normalizedEvidence, metadata: { ... } } satisfies ReviewResponse;
  return reviewResponseSchema.parse(response);
} finally {
  analysis.clear();
}
```

Insert provider DTO construction and provider invocation between normalization/analysis and final response validation. Keep local deterministic analysis independent and separately labeled. Preserve the current early `safeParse`, role validation, `toToolErrorResult` path, and `RangeError`/`TypeError` mapping. Ensure provider failure and invalid-response errors pass through the sanitized MCP result, and preserve the unchanged tool name, input schema, and read-only annotations.

### `src/server.ts` (wiring/registry, request-response)

**Analog:** same file lines 7-16.

```typescript
export interface ServerOptions {
  allowedRoots?: readonly FilesystemRootConfig[];
}

export function createServer(options: ServerOptions = {}): McpServer {
  const server = new McpServer({ name: "evidencelens", version: "0.1.3" });
  registerReviewTool(server, { filesystemPolicy: createFilesystemPolicy(options.allowedRoots ?? []) });
  return server;
}
```

Extend `ServerOptions` with an injected provider/configuration seam suitable for tests, while registering only the DeepSeek implementation at runtime. Do not add arbitrary npm-module provider loading. Startup configuration should fail closed with a sanitized configuration error.

### `package.json` / `package-lock.json` (configuration/dependency, build/runtime)

**Analog:** `package.json:6-22` and `tests/smoke/project-config.test.ts:9-37`.

```json
"scripts": {
  "dev": "tsx src/server.ts",
  "build": "tsc -p tsconfig.json",
  "start": "node dist/server.js",
  "test": "vitest run"
}
```

Keep ESM, NodeNext, strict TypeScript, and the existing scripts. If an HTTP client is added, update both manifests and extend the smoke test only for intentional dependency/config changes. Prefer the platform `fetch` if it provides the required timeout/abort behavior without adding a dependency.

### `.gitignore` and `.evidencelens.local.example.json` (secret/config files, file I/O)

**Analog:** `.gitignore` currently ignores only `node_modules/` and `dist/`; README configuration examples use explicit scoped values at `README.md:22-29`.

Add only the concrete local secret filename and keep the example redacted. The local file must never be committed. Do not place an API key in MCP request examples, planning files, tests, or documentation. Example fields should show base URL, allowlisted model, timeout/retry settings, and a placeholder key.

### `tests/providers/config.test.ts` (test, transform)

**Analog:** `tests/smoke/project-config.test.ts:4-7` and `:9-37`.

```typescript
async function readJson(path: string): Promise<Record<string, any>> {
  const contents = await readFile(path, "utf8");
  return JSON.parse(contents);
}
```

Use Vitest `describe/expect/it`, direct parser tests, and safe temporary/config fixtures. Cover defaults, allowlisted model IDs, invalid/unknown models, conflicting sources, missing credentials, and secret/path redaction without asserting implementation-specific prose.

### `tests/providers/deepseek.test.ts` (integration test, request-response)

**Analog:** `tests/review/engine.test.ts:14-35` for stable interface assertions and deterministic structural assertions; `tests/contract/review-normalized-evidence.test.ts:35-61` for fixed repository fixtures.

```typescript
it("exposes a provider-neutral analyzer boundary", () => {
  expect(createDeterministicReviewAnalyzer().name).toBe("deterministic-rules");
  expect(createDeterministicReviewAnalyzer().version).toBe("1.0.0");
});
```

Use small fixed non-sensitive fixtures under `tests/fixtures/evidence/` and call the real API by default as required by context. Assertions should check HTTP/API success, structured findings, expected categories, model metadata, input fingerprint, and citation/provenance binding—not exact natural-language wording. Add focused injected transport/fake responses for retry classification, retry count, timeout, malformed JSON, invalid findings, and forged citations. Avoid logging response bodies or credentials.

### `tests/contract/review-provider.test.ts` (contract/integration test, request-response)

**Analog:** `tests/contract/review-tool.test.ts:1-11`, `:184-220`, and `:222-247`.

```typescript
function parseToolPayload(toolResult: unknown) {
  const parsedToolResult = reviewToolResultSchema.parse(toolResult);
  return JSON.parse(parsedToolResult.content[0]?.text ?? "{}");
}
```

Reuse the MCP wrapper parser and `handleReviewRequest` assertions. Verify the public tool name/schema/annotations remain unchanged, successful responses pass `reviewResponseSchema`, deterministic and provider findings remain distinguishable, provider metadata is present only where selected, and provider errors return stable sanitized JSON. Do not require byte-for-byte equality for live model responses.

### `README.md` / `docs/mcp-contract.md` (documentation, request-response/configuration)

**Analog:** `README.md:5-20` and `docs/mcp-contract.md:64-133`.

Document local DeepSeek setup, the redacted example config, allowed models/default, timeout/retry behavior, live-test prerequisites/cost, provider failure codes, and the fact that local provenance validation remains authoritative. Update the contract docs without changing the MCP request schema or claiming deterministic output for model findings. Preserve the existing explicit filesystem/read-only/security caveats.

## Shared Patterns

### Strict schemas and local validation

**Sources:** `src/contracts/review.ts:123-139`, `:284-306`, `:308-337`, `:357-391`. Use Zod v4 strict objects, discriminated unions for typed locations, bounded strings/arrays, and `superRefine` for cross-object invariants. Provider drafts are untrusted input and must be validated before becoming `ReviewFinding` values.

### Provenance and bounded transient data

**Sources:** `src/evidence/index.ts:46-75`, `src/review/analysis.ts:113-137`. Normalize once, pass only bounded in-memory payloads, derive hashes from authorized bytes, resolve citations against normalized references, and clear raw text/table/byte fields in `finally`. Provider code never receives filesystem paths or read adapters.

### Sanitized MCP errors

**Sources:** `src/tools/review.ts:76-101`, `src/errors.ts:23-73`. Validate before normalization, map known errors to stable codes, and serialize only `{ ok: false, code, message }`. Extend the code mapping for configuration, retry exhaustion, and invalid provider response without exposing upstream details.

### Independent result sets

**Sources:** `src/review/engine.ts:5-9`, `:85-92`; `src/tools/review.ts:31-47`. Preserve the deterministic analyzer as a baseline and return/record DeepSeek findings separately. Do not overwrite, silently fall back to, or adjudicate one result set with the other.

### Test and build conventions

**Sources:** `package.json:6-22`, `tests/contract/review-tool.test.ts:142-182`, `tests/smoke/project-config.test.ts:9-37`. Tests use Vitest, direct ESM `.js` imports from `src`, strict TypeScript builds use `npm run build`, and MCP protocol tests use `InMemoryTransport` with explicit cleanup in `finally`.

## No Analog Found

| File/Concern | Role | Data Flow | Reason |
|---|---|---|---|
| DeepSeek Chat Completions adapter | service | HTTP request-response | No network/provider implementation exists; use the new interface plus official API contract. |
| Retry/backoff and upstream error classification | utility | request-response | Existing errors are local parser/filesystem errors only; no retry policy exists. |
| Project-local provider credentials/config file | config | file I/O/transform | Existing config is environment-based filesystem-root parsing; secret-file loading is new. |

## Metadata

**Analog search scope:** `src/`, `tests/`, `docs/`, root manifests/configuration, and prior Phase 4 plans.  
**Files scanned:** 15 primary implementation/test/doc analogs plus project planning references.  
**Pattern extraction date:** 2026-08-23
