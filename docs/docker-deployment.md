# Docker deployment

This runbook starts EvidenceLens MCP from a fresh checkout without changing its MCP contract. The container runs the existing server directly over stdio; it does not add HTTP/SSE, a health endpoint, a write tool, or a second transport.

## Prerequisites

- Docker Engine with the Compose plugin
- Node.js and npm for the local smoke/E2E commands
- A checkout containing the four fixed fixtures under `tests/fixtures/evidence`

The Docker CLI is required for the container smoke path. If Docker is unavailable, `npm run test:e2e` still validates the multimodal semantic path locally through an injected provider, but it cannot prove the image or mount boundary.

## Offline validation

From the repository root, run:

```bash
docker compose --profile smoke build
npm run docker:smoke
npm run test:e2e
```

`npm run docker:smoke` renders the offline Compose profile, builds the image, starts the `smoke` service, and sends exactly `initialize`, `tools/list`, and `tools/call` through stdin/stdout. It checks that only the read-only `review_evidence` tool is advertised, the four fixed files are read, the response is schema-shaped, hashes are lowercase SHA-256, citations use logical references, and raw fixture text or absolute paths are absent. It also attempts a marker write under `/workspace` and checks credentialed startup fails closed when no key is present. Failures include a phase name and return non-zero.

The default smoke profile is offline: it sets `EVIDENCELENS_DISABLE_PROVIDER=1`, uses Compose `network_mode: none`, and never sends a DeepSeek request. `npm run test:e2e` is the routine semantic check; it injects a compatible offline `ReviewProvider` and uses a macOS-safe filesystem adapter backed by `node:fs/promises` for the same fixed fixtures. Both paths use structural assertions, not exact model prose.

## Runtime boundary

Every service sets the exact application allowlist `EVIDENCELENS_ALLOWED_ROOTS=course=/workspace` and mounts the whole host project read-only at `/workspace`. Filesystem evidence therefore uses references such as `filesystem://course/tests/fixtures/evidence/text/assignment.txt`; absolute host paths are never public provenance. The container root filesystem is read-only, `/tmp` is the only declared tmpfs, and the image runs as a non-root user with dropped capabilities and no-new-privileges protection.

The canonical four-role request maps these files as follows:

| Role | Fixture | Container-relative request path |
| --- | --- | --- |
| `assignment_brief` | `tests/fixtures/evidence/text/assignment.txt` | `/workspace/tests/fixtures/evidence/text/assignment.txt` |
| `rubric` | `tests/fixtures/evidence/tables/rubric.csv` | `/workspace/tests/fixtures/evidence/tables/rubric.csv` |
| `teacher_instructions` | `tests/fixtures/evidence/images/rubric-screenshot.png` | `/workspace/tests/fixtures/evidence/images/rubric-screenshot.png` |
| `solution` | `tests/fixtures/evidence/pdfs/text-page.pdf` | `/workspace/tests/fixtures/evidence/pdfs/text-page.pdf` |

The image starts `node dist/server.js` through `docker-entrypoint.sh`, preserving direct stdio and the existing public schemas and read-only annotations. No HTTP/SSE endpoint, write access, or provider module loader is introduced.

## Credentialed DeepSeek review

The real four-role client is deliberately separate from routine validation. `scripts/docker-review-real.mjs` is the client behind `npm run docker:review:real`; it starts the Compose `review` service and sends the same three MCP phases and four fixture mappings over stdio. Supply a project-local key explicitly:

```bash
DEEPSEEK_API_KEY=... npm run docker:review:real
```

This command requires network access to the configured DeepSeek endpoint and may incur API cost. Use an independent Compose `.env` or secret source per project; do not rely on a shared shell configuration. The `review` profile injects typed `DEEPSEEK_*` settings and does not disable the provider. The client requires provider-namespaced structural findings, so deterministic-only output is not accepted as a credentialed success. Natural-language finding prose may vary.

Missing `DEEPSEEK_API_KEY`, malformed settings, and conflicting environment/config-file sources fail before server startup with a non-zero exit and one actionable `PROVIDER_CONFIGURATION` message. The message omits secrets, absolute paths, request details, upstream bodies, and stacks.

## Read-only configuration-file compatibility

The optional `review-file` profile mounts a project-local configuration file read-only at exactly `/app/.evidencelens.local.json`. The image working directory is `/app`, and the entrypoint sets `EVIDENCELENS_CONFIG_FILE=./.evidencelens.local.json` so the existing typed loader retains conflict detection:

```bash
export EVIDENCELENS_CONFIG_FILE=./.evidencelens.local.json
docker compose --profile review-file run --rm -T review-file
```

Never copy this file into the image or commit it. If both environment variables and the mounted file provide settings, startup fails closed rather than selecting a source silently. The mounted file is read-only, and the same `course=/workspace` filesystem boundary remains in force.

## Output and privacy

Successful results retain the existing MCP response schema: four normalized evidence items, deterministic and optional provider findings, lowercase content hashes, typed line/cell/page/image citations, and logical filesystem references. Visual bytes remain subject to the existing bounded payload rules. The scripts validate structure and provenance only; they do not log raw evidence, secrets, absolute roots, request details, upstream responses, or exact model wording.
