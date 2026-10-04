# Phase 19 — Fresh runtime and packaging evidence

Product 0.3.2. Source baseline HEAD at run: 14dbb42; dirty paths were the six version-only expectation/document updates later committed with this evidence. No dependency install, recovery or version change was needed. Lock equality check permitted only root version and packages[empty].version (0.3.1 -> 0.3.2); all dependency data unchanged. analyzerVersion remains 1.0.0.

Owned-process wrapper stripped inherited provider/credential/Compose overrides, set EVIDENCELENS_DISABLE_PROVIDER=1 and COMPOSE_DISABLE_ENV_FILE=1, and checked/reaped only owned groups. These are offline tests, not network sandbox proof. Build completed before affected test acceptance.

| Check | Actual UTC start | Elapsed | Exit | Owned group remaining |
|---|---|---|---|---|
| phase19-build | 2026-10-04T14:34:42.256717+00:00 | 0.891s | 0 | false |
| phase19-affected | 2026-10-04T14:34:57.082991+00:00 | 3.576s | 0 | false |
| phase19-node | 2026-10-04T14:34:57.082987+00:00 | 2.45s | 0 | false |

- `npm run build`: fresh TypeScript compiler exit 0, cap 300s.
- `npm test -- tests/smoke/project-config.test.ts tests/contract/review-tool.test.ts tests/contract/public-contract-docs.test.ts tests/contract/fit5032-fixture.test.ts tests/contract/review-provider.test.ts tests/e2e/docker-review.test.ts`: six files, 118/118 passed, zero skipped/failed, cap 120s. Vitest internal duration 2.95s. Existing PDF font/indexing fixture warnings were emitted; no assertions failed. Injected-provider tests are not live-provider proof, and docker-review filename does not assert an actual container was started.
- `node --test tests/prompts/*.mjs tests/commands/*.mjs tests/baseline/source-boundary.mjs`: 51/51 passed, zero skipped/failed, cap 120s. Includes actual controlled child deaths and Phase 18 command/source regression. Internal duration 2.349s.
- Official `quick_validate.py`: all seven installed source Skill manifests passed; synthetic missing-description negative exited 1 with the expected diagnostic. Existing isolated Python/PyYAML 6.0.3 reused; no installation. Validator SHA-256: `ee6dba90f44d37171c5a6edb8095979c54919ff6822c1a907afca2e78c48738c`.
- `git diff --check`: pass. Schema drift: drift_detected=false, blocking=false. Codebase drift: skipped, no-structure-md. No database/frontend work.

Historical full 795-test results are not refreshed by this narrower gate. No paid proof, credentials, live provider, new conversation, remote CI or release/tag was created.

## Source/build fingerprints

| File | SHA-256 |
|---|---|
| package-lock.json | `0a00a6af94b1ef488068dded4ab639cb32b949be7c89a6a2fbe9fc7f1cabd34e` |
| src/server.ts | `ccc00bfcbd01fe9b947dbd611508db5eae60ff43ca1208935c05822ce7365517` |
| src/tools/review.ts | `0d4eec77ba28836ee7ed2f4e1603a5309cf3a7339174e23e46f56c70175d3ece` |
| dist/server.js | `25105f10361a45674500a8b07ae0fca35b5b8aeb129df1595563d38a51f897a9` |
| dist/tools/review.js | `5fec89f89e71933b182a9c0d798ae4049cba0369a36104cf80de9509dba5c31e` |
| skills/assignment-review/scripts/prompt-contract.mjs | `b580387ffe019f37ba2f6b2ae5d2c949851f45a5f1ff876c0ab2619a03219490` |
| skills/assignment-review/scripts/prompt-store.mjs | `cb3fccf48b07d6dc834004dcde529929b8e76f4ae9eb68cfe59d6475f9b4af23` |
| skills/assignment-review/scripts/prompt-records.mjs | `8ce143e6660348e2082f24fe2e6f2e179c676645505d65bc19e6d5affd47690b` |
