# Phase 20 — Fresh runtime evidence

Executed 2026-10-05 Australia/Melbourne (UTC below). Source tested at base 8b3e92a plus the changes committed as 72b7c3f. Fresh build preceded the six Vitest files. Final Node rerun followed review fixes; no TypeScript source changed after the build/Vitest run. Each batch owned its process group, used a 120 s ceiling and exited normally. No test was skipped. No services started, dependencies changed, or historical provider proof replayed.

Environment removed inherited provider/API/proxy/Compose overrides, set EVIDENCELENS_DISABLE_PROVIDER=1 and COMPOSE_DISABLE_ENV_FILE=1. This is test configuration, not a claimed network sandbox. Actual Codex protocol tests use fresh fake auth and a loopback fixture, not real inference.

| Gate | Start UTC | Wall seconds | Exit | Result |
|---|---|---|---|---|
| build | 2026-10-04T16:14:19.630092+00:00 | 0.826 | 0 | Fresh TypeScript build |
| vitest | 2026-10-04T16:14:25.338131+00:00 | 4.432 | 0 | 6 files / 118 tests passed |
| node | 2026-10-04T16:16:43.197720+00:00 | 8.224 | 0 | 157 Node tests passed, 0 failed/cancelled/skipped |

## Exact commands

```sh
npm run build
npm test -- tests/smoke/project-config.test.ts tests/contract/review-tool.test.ts tests/contract/public-contract-docs.test.ts tests/contract/fit5032-fixture.test.ts tests/contract/review-provider.test.ts tests/e2e/docker-review.test.ts
node --test tests/codex/*.mjs tests/prompts/*.mjs tests/commands/*.mjs tests/baseline/source-boundary.mjs
```

## Reproducibility hashes

Lock SHA-256: `0df4ba7b0b7ce261439e1ef79aa7ff500d1d68ddef24df28aef282c5a1951536`. Parsed comparison to the preceding lock permits only root version and packages[""].version: 0.3.2 → 0.3.3. All dependencies/integrities unchanged. The deterministic fixture changes only current serverVersion; analyzerVersion remains 1.0.0.

Private transient logs were kept outside Git. Log SHA-256 (not a proof of independent execution):

- build: `6a69558d3db0555649019b9a89e98eaae73aaf33528c6ecdc871b7c5e5e47eac`
- vitest: `f010aa8b81c0af16e5f965148efd4c0b013f43736df34961c290e4d71b94420f`
- node: `9cc9658077e3519db0db07b51e6a218a7d61017733e3015a6ff899b15e1d48ef`

Earlier final Node run passed 155 tests. Code review then added two tests and expanded an alias control: two targeted failures reproduced the defects; three repair controls and the final 157-test run passed. No failed result was relabeled as passing. Seven official Skill validator positives and the invalid negative control are recorded in [host acceptance](20-HOST-ACCEPTANCE.md).

Actual login status/readiness, pinned binary/policy digests and synthetic versus real host distinctions are in the host report. Real ChatGPT inference, detailed model/token accounting and user-facing end-to-end handoff remain Phase 21 NOT_RUN. Local citation matching does not prove semantic correctness.
