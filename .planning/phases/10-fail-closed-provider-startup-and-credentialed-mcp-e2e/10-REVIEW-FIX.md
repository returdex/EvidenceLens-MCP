---
phase: 10-fail-closed-provider-startup-and-credentialed-mcp-e2e
review: 10-REVIEW.md
fixed: 2026-09-22T00:00:00Z
status: all_fixed
findings_fixed:
  critical: 3
  warning: 1
  total: 4
---

# Phase 10 Review Fix

All findings discovered across the initial review and two offline re-review passes were fixed before live validation. No Docker command, provider request, network request, or GitHub Actions workflow was run.

## Fixes

- **CR-01:** Rotated all current automatic execution, proof audit, and synchronization registries to the 10-162 through 10-166 namespace. The prior 10-157 through 10-161 records remain reachable only through explicit historical audit modes.
- **CR-02:** Rejects an own `DEEPSEEK_MAX_TOKENS` property before state creation, credential access, Compose resolution, Docker spawn, or provider send. Both the resolved service environment and controlled child environment must omit the key.
- **WR-01:** Replaced unbounded `response.json()` decoding with a 4 MiB byte-bounded stream reader, fatal UTF-8 decoding, and `JSON.parse`. Overflow and decode failures emit stable content-free diagnostics.
- **Re-review blocker:** Changed the consumed-live archive creator and its fixed zero-argument CLI from the already-existing historical `10-157-CONSUMED-LIVE.json` path to the current `10-162-CONSUMED-LIVE.json` path, while retaining historical 10-160 inputs for authentication.

## Verification

- `EVIDENCELENS_DISABLE_PROVIDER=1 npm test`: 43 files, 779 tests passed.
- `npm run build`: passed.
- Focused provider, automatic runner, Docker harness, proof-chain, and synchronization suites passed.
- Final deep re-review: clean, 0 critical and 0 warning findings; 322 focused tests passed.
- `git diff --check`: passed before each implementation commit.

## Commits

- `199b20a` — `fix(provider): bound upstream response decoding`
- `f79ed1c` — `fix(proof): reject ambient output caps`
- `2fc8aa3` — `fix(proof): rotate current evidence registries`
- `373eef3` — `fix(proof): create current consumed archive`
