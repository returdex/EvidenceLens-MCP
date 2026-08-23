# Phase 6: Docker Deployment and End-to-End Validation - Pattern Map

**Mapped:** 2026-08-23  
**Files analyzed:** 8 likely new/modified files  
**Analogs found:** 8 / 8 (6 direct code/test analogs, 2 closest documentation/config analogs)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `Dockerfile` | config/build | batch/build | `package.json`, `tsconfig.json` | config-match; no Docker analog |
| `compose.yaml` (or `docker-compose.yml`) | config/runtime | request-response/file-I/O | `README.md` filesystem command and `src/server.ts` env wiring | config-match; no Compose analog |
| `scripts/docker-smoke.sh` (or equivalent) | utility/test harness | request-response/file-I/O | `tests/smoke/project-config.test.ts` and `tests/contract/review-filesystem.test.ts` | role/data-flow match |
| `tests/smoke/docker-config.test.ts` (if configuration is asserted in Vitest) | test | batch/config | `tests/smoke/project-config.test.ts` | exact role match |
| `tests/e2e/docker-review.test.ts` (if protocol assertions are kept in TypeScript) | test | request-response/file-I/O | `tests/contract/review-filesystem.test.ts` | exact role + flow match |
| `package.json` | config/scripts | batch/build/test | existing scripts and `tests/smoke/project-config.test.ts` | exact |
| `README.md` | documentation | request-response/file-I/O | current local development/provider sections | exact documentation structure |
| `docs/docker-deployment.md` (or deployment section in `README.md`) | documentation | request-response/file-I/O | `docs/mcp-contract.md` | role-match; no deployment analog |

The exact filenames for the Docker smoke script, Compose file, and deployment documentation are discretionary in `06-CONTEXT.md`; the planner should keep one canonical path and make all commands/documentation/tests agree.

## Pattern Assignments

### `Dockerfile` (config/build, batch/build)

**Analog:** `package.json` lines 5-12 and `tsconfig.json` lines 1-12; no existing container file exists.

Use the existing two-step build contract: compile `src/**/*.ts` to `dist` with `npm run build`, then run the compiled entry point with `npm start`. The runtime entry point must remain `dist/server.js`, not a new wrapper or HTTP server.

```json
"scripts": {
  "dev": "tsx src/server.ts",
  "build": "tsc -p tsconfig.json",
  "start": "node dist/server.js",
  "test": "EVIDENCELENS_DISABLE_PROVIDER=1 vitest run --exclude tests/providers/deepseek-live.test.ts",
  "test:deepseek-live": "vitest run tests/providers/deepseek-live.test.ts"
}
```

The Docker image should be single-stage and minimal as decided for this phase. Install from the lockfile, build, and run as a non-root user if compatible with the MCP runtime. Do not copy `.evidencelens.local.json` or bake credentials into an image. The container root filesystem should be read-only at runtime; provide only the explicitly needed temporary path through Compose `tmpfs`/equivalent. The image should contain the fixed tests/fixtures if the documented smoke flow references them inside the image, or mount the project read-only and use `/workspace` consistently.

### `compose.yaml` (config/runtime, request-response/file-I/O)

**Analog:** `src/server.ts:17-43` plus `README.md:44-52`; no Compose file exists.

**Environment-to-server wiring** (`src/server.ts:41-43`):

```typescript
export async function main(): Promise<void> {
  serveStdio(() => createServer({ allowedRoots: parseAllowedRoots(process.env.EVIDENCELENS_ALLOWED_ROOTS) }));
}
```

Compose should make the existing boundary explicit:

```yaml
environment:
  EVIDENCELENS_ALLOWED_ROOTS: /workspace
  EVIDENCELENS_DISABLE_PROVIDER: "1" # default offline smoke profile
volumes:
  - type: bind
    source: .
    target: /workspace
    read_only: true
read_only: true
tmpfs:
  - /tmp
```

The exact Compose service name and tmpfs target are discretionary. The host project mount must be visibly read-only, and `/workspace` must be the configured allowlisted root. Keep provider configuration project-local: use a project-specific `.env` or explicit secret source for the real API profile, never a shared host shell assumption. If a read-only mounted `.evidencelens.local.json` compatibility path is supported, document that environment/file conflicts fail closed according to `src/providers/config.ts:84-112`.

### `scripts/docker-smoke.sh` (utility/test harness, request-response/file-I/O)

**Analog:** `tests/smoke/project-config.test.ts:12-112` and `tests/contract/review-filesystem.test.ts:70-98,218-231`.

The script should be an explicit, fail-fast orchestration layer, not a second MCP implementation. It should build the image, start the stdio container, invoke `initialize`, `tools/list`, and `tools/call`, then validate JSON structurally. Reuse the fixed evidence fixture paths and the same no-network provider disablement used by ordinary tests.

**Existing no-network guard** (`tests/smoke/project-config.test.ts:29-46`):

```typescript
expect(process.env.EVIDENCELENS_DISABLE_PROVIDER).toBe("1");
process.env.DEEPSEEK_API_KEY = "dummy-test-key";
process.env.DEEPSEEK_BASE_URL = "http://127.0.0.1:9";
globalThis.fetch = (() => { throw new Error("network must remain disabled in ordinary tests"); }) as typeof fetch;
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
const server = createServer();
```

The shell smoke path cannot use `InMemoryTransport` across the container boundary, so use a small JSON-RPC/stdin client or a TypeScript wrapper that speaks the same stdio protocol. It must check non-zero build/start failures, missing-key/configuration failures, and malformed JSON clearly. Avoid asserting exact model prose.

### `tests/smoke/docker-config.test.ts` (test, batch/config)

**Analog:** `tests/smoke/project-config.test.ts:12-27,99-112`.

This is the direct pattern if Docker artifact assertions are kept in Vitest: read files with `node:fs/promises`, assert package/build conventions, and keep the test credential-free. The existing project test treats scripts and compiler settings as an executable configuration contract:

```typescript
async function readJson(path: string): Promise<Record<string, any>> {
  const contents = await readFile(path, "utf8");
  return JSON.parse(contents);
}

expect(packageJson.scripts).toMatchObject({
  dev: "tsx src/server.ts",
  build: "tsc -p tsconfig.json",
  start: "node dist/server.js"
});
```

Extend this style only for stable Docker/Compose declarations: service command, `/workspace` target, read-only mount, `EVIDENCELENS_ALLOWED_ROOTS`, offline default, and smoke command. Do not make the test depend on host-specific absolute paths.

### `tests/e2e/docker-review.test.ts` (test, request-response/file-I/O)

**Analog:** `tests/contract/review-filesystem.test.ts:70-98,100-141,218-231`.

The strongest end-to-end semantic analog is the filesystem integration test. It builds a linked MCP client/server pair, sends protocol requests, and checks safe logical provenance rather than host paths:

```typescript
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
const server = createServer(serverOptions);
await clientTransport.start();
await server.connect(serverTransport);
// send initialize, tools/list, and tools/call through JSON-RPC
try { await run(request); } finally {
  await server.close();
  await clientTransport.close();
}
```

Its multimodal filesystem assertions are directly reusable (`:101-141`): read text, CSV, PDF, and PNG fixtures; assert `ok: true`, exactly four opened/read items, the four `filesystem://course/...` references, no absolute temporary root in the response, and no raw source text in the response. For a container E2E test, replace the injected adapter with the real `/workspace` mount and preserve those output assertions.

### `package.json` (config/scripts, batch/build/test)

**Analog:** existing package scripts and `tests/smoke/project-config.test.ts`.

Any new `docker:build`, `docker:smoke`, or equivalent command should follow the terse existing script style and preserve the safe default `npm test`:

```json
"test": "EVIDENCELENS_DISABLE_PROVIDER=1 vitest run --exclude tests/providers/deepseek-live.test.ts",
"test:deepseek-live": "vitest run tests/providers/deepseek-live.test.ts"
```

The real DeepSeek path remains explicitly named, credentialed, networked, and potentially billable; the default Docker smoke path must inject a mock/provider or disable automatic provider registration. If scripts are added, update `tests/smoke/project-config.test.ts` in the same change so scripts are an intentional contract.

### `README.md` / `docs/docker-deployment.md` (documentation, request-response/file-I/O)

**Analog:** `README.md:5-15,17-36,44-52` and `docs/mcp-contract.md:3-7,43-62,131-145`.

Use the existing documentation pattern: short runnable command blocks followed by precise safety/contract prose. The local path currently documents install, dev, test, live provider, and build in order:

```bash
npm install
npm run dev
npm test
npm run test:deepseek-live # opt-in real API test
npm run build
```

The Docker documentation should add prerequisites and `docker compose` commands, explain the read-only whole-project mount and `/workspace` allowlist, document project-specific `.env`/secret handling and actionable missing-key failure, show the offline smoke command and its coverage, and show the explicit real DeepSeek multimodal command with key/network/cost warning. State structural output expectations (MCP schemas, findings, citations/evidence references, hashes, and provider/provenance rules) without exact natural-language assertions.

The contract’s stable error and privacy language is the source of truth (`docs/mcp-contract.md:131-145`): never document absolute roots, raw evidence, request details, upstream response bodies, or secrets as returned output.

## Shared Patterns

### Stdio MCP boundary

**Source:** `src/server.ts:1-8,17-43`  
**Apply to:** Docker command, Compose service, smoke client, deployment docs

```typescript
import { pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";

export async function main(): Promise<void> {
  serveStdio(() => createServer({ allowedRoots: parseAllowedRoots(process.env.EVIDENCELENS_ALLOWED_ROOTS) }));
}
```

Do not add HTTP/SSE, health endpoints, a write tool, or a process-side wrapper that changes the MCP request/response contract.

### In-memory MCP protocol harness

**Source:** `tests/contract/review-tool.test.ts:142-182` and `tests/smoke/project-config.test.ts:38-97`  
**Apply to:** TypeScript E2E tests and the expected behavior of any external smoke client

The harness uses `LATEST_PROTOCOL_VERSION`, linked `InMemoryTransport` instances, numeric request IDs, a pending-response map, explicit `initialize`, `tools/list`, and `tools/call`, followed by `server.close()` and transport close in `finally`. Assertions should confirm only `review_evidence` is listed and its annotations include `readOnlyHint: true`, `destructiveHint: false`, and `idempotentHint: true` (`src/tools/review.ts:205-220`).

### Filesystem allowlist and read-only semantics

**Sources:** `src/filesystem/policy.ts:67-83,93-155`, `src/filesystem/read.ts:103-190`, `docs/mcp-contract.md:56-62`  
**Apply to:** Compose mount/env, Docker smoke, E2E assertions, docs

```typescript
const root = canonicalRoots.get(parsed.data.rootId);
if (root === undefined) accessDenied();
const lexicalTarget = resolve(root.path, ...parsed.data.relativePath.split("/"));
const resolvedPath = primitives.realpathSync(lexicalTarget);
const safeRelativePath = normalizedRelativePath(root.path, resolvedPath);
return { rootId: root.id, relativePath: safeRelativePath,
  resolvedPath, reference: `filesystem://${root.id}/${safeRelativePath}` };
```

The reader authorizes before opening, opens with `O_RDONLY`/no-follow behavior, applies type-specific byte limits, checks target identity before and after reading, and closes descriptors in `finally` (`src/filesystem/read.ts:125-189`). Docker must reinforce this with a read-only bind mount and read-only root filesystem; it must not rely on Docker alone as a substitute for the application allowlist.

### Provider isolation and configuration failure

**Sources:** `src/server.ts:20-30`, `src/providers/config.ts:84-112`, `tests/providers/config.test.ts:21-35`  
**Apply to:** Compose profiles, offline smoke, real API docs, missing-key test

`EVIDENCELENS_DISABLE_PROVIDER=1` skips automatic provider configuration while allowing explicitly injected providers in tests. Provider config merges defaults, env, and local file only when no key is supplied by both sources; conflicts, unknown keys, missing credentials, and unsafe settings throw `ProviderError` without exposing secrets. The Docker default should use a mock/injected provider or disablement; the real profile should supply `DEEPSEEK_API_KEY` from a project-local secret source and document network/cost implications.

### Fixed fixtures and structural contract assertions

**Sources:** `tests/contract/review-normalized-evidence.test.ts:35-61`, `tests/contract/review-filesystem.test.ts:101-141`, `tests/providers/deepseek-live.test.ts:19-56`  
**Apply to:** smoke fixture selection, E2E validation, docs example

Use the repository fixtures exactly as canonical evidence: `tests/fixtures/evidence/text/assignment.txt`, `tables/rubric.csv`, `images/rubric-screenshot.png` (320x180 PNG), and `pdfs/text-page.pdf` (with scanned PDFs available for additional visual coverage). Assert schema validity, `ok`, required findings/roles, non-empty lowercase 64-character hashes, `filesystem://...` references, typed line/cell/page/image citations, and provider/provenance metadata rules. Follow the live test’s rule: natural-language model output is variable, so never assert exact prose.

### Sanitized failures

**Sources:** `tests/contract/review-provider.test.ts:78-87`, `tests/filesystem/read.test.ts:75-83`, `docs/mcp-contract.md:137-139`  
**Apply to:** Docker startup/smoke output and docs

Stable MCP errors are short and sanitized. Missing provider configuration should be clearly actionable in container logs while omitting the key, absolute paths, upstream URLs/bodies, raw evidence, errno details, and stacks. Smoke assertions should verify failure codes/messages and absence of secret/path markers rather than matching incidental runtime diagnostics.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `Dockerfile` | config/build | batch/build | No Dockerfile or image build exists; use package/TypeScript build contracts. |
| `compose.yaml` | config/runtime | request-response/file-I/O | No Compose or deployment manifest exists; use server env wiring and README root examples. |
| `scripts/docker-smoke.sh` | utility/test harness | request-response/file-I/O | No shell or external stdio smoke harness exists; use the in-memory protocol harness and filesystem integration assertions. |
| `docs/docker-deployment.md` | documentation | request-response/file-I/O | No deployment guide exists; use `docs/mcp-contract.md`’s stable contract/privacy language. |

## Metadata

**Analog search scope:** repository root, `src/`, `tests/`, `tests/fixtures/`, `docs/`, package/build configuration  
**Files scanned:** 22 relevant source, test, fixture, and documentation files; no Docker/Compose artifacts found  
**Pattern extraction date:** 2026-08-23
