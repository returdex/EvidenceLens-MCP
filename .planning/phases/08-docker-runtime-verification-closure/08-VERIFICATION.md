---
phase: 08-docker-runtime-verification-closure
status: passed
requirement: DEPL-01
verified: 2026-08-25
---

# Phase 8 Docker Runtime Verification

## Environment

- Docker CLI and daemon: available; `docker info` exited 0.
- Runtime image: `evidencelens-mcp:plan06`.
- Image inspection: user `node`, entrypoint `/usr/local/bin/docker-entrypoint.sh`.
- Provider credentials: not used; offline profile disables the provider and uses `network_mode: none`.

## Commands and results

1. `npm test -- --run tests/smoke/docker-config.test.ts` — passed, 4 tests.
2. `npm run docker:smoke` — passed.
   - Compose offline profile rendered successfully.
   - Single-stage image built successfully and compiled `dist/server.js`.
   - MCP `initialize`, `tools/list`, and `tools/call` completed over container stdio.
   - Four fixed evidence fixtures were normalized; response contained 0 findings and no provider call.
   - `/workspace` marker write was rejected with read-only filesystem behavior.
   - Credentialed preflight with provider disablement overridden failed nonzero and emitted the sanitized `PROVIDER_CONFIGURATION` marker.
3. `npm test` — passed, 25 test files and 130 tests.
4. `git diff --check` — passed.
5. `docker compose --profile smoke config --quiet` — passed.

## Security checks

- Image runs as non-root `node`.
- `/workspace` is a read-only bind mount and the container root filesystem is read-only with `/tmp` as the declared tmpfs.
- Compose drops all capabilities and enables `no-new-privileges`.
- Offline smoke has no provider network path.
- No API key, raw fixture text, absolute host path, upstream response, or stack trace was recorded in this verification artifact.

## Result

DEPL-01 is verified complete for the available Docker environment. The runtime failure found during verification was corrected in `src/filesystem/read.ts`: Linux proc descriptor traversal no longer applies `O_NOFOLLOW` to the trusted `/proc/self/fd/<rootDescriptor>` hop, while evidence path components retain no-follow protection. PDF.js/font warnings seen in the local suite are non-blocking and unrelated to the Docker boundary.
