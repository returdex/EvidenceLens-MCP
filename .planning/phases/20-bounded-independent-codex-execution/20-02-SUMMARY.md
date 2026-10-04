---
phase: 20-bounded-independent-codex-execution
plan: "02"
subsystem: assignment-review
tags: [codex, isolation, protocol]
requires: [20-01]
provides: [Certified macOS launch descriptor, Actual binary fixture gate]
affects: [20-03, 20-04, 20-05]
requirements-completed: []
completed: 2026-10-05
---
# Plan 02 — R1 isolation and protocol acceptance

Two tasks complete following explicit user approval of the narrow R1 policy revision. Historical failed gate commit 9c48c93 is preserved; see 20-ISOLATION-EVIDENCE.md for failed probes and repaired acceptance. Task changes are committed with this summary.

45/45 Node tests pass, zero skips: isolation.mjs, protocol-host.mjs, preflight.mjs and contract.mjs. Positive actual binary structured fixture; deny-default OS boundary with symlink/write negatives; fixed four tools; context markers absent; HTTP/stream failure request counts one; forced-tool supervision rejects and reaps. Actual existing-login status works under a separate no-network bounded policy, production descriptor sealed and cleaned, no actual inference. Installation/auth content preservation checked (real auth metadata only; fake auth full bytes in fixtures).

R1 is authorized architecture adjustment: existing noncredential installation metadata data/mode operations, separate read-only config/agent-TOML status policy, stderr-aware tool guard. Runtime commands never receive status config read permissions. Profile, config/schema and dyld import are digest-bound; binary unchanged since Plan 01. Rule 1 fixes: accept noncredential metadata 0644 without allowing group/world write; parent cleanup restores owned control-directory mode before removal. No auth copying or model/provider fallback.

## Self-Check: PASSED

Installed module, reference, reproducible tests and evidence exist. No production stage routing yet; Plans 03–06 remain. No phase-wide requirement marked complete; product stays 0.3.2. Internal continuation race is explicit and no zero-tools/remote rollback claim is made.
