# Phase 11: Linux Filesystem Traversal Hardening - Discussion Log

> **Audit trail only.** Planning and execution should use `11-CONTEXT.md`.

**Date:** 2026-09-22
**Phase:** 11-linux-filesystem-traversal-hardening
**Area examined:** In-root symlink compatibility during Linux no-follow hardening

## Existing decision carried forward

Phase 3 explicitly allowed a caller-supplied symlink whose canonical target remains inside the configured root. `tests/filesystem/policy.test.ts` verifies this behavior; `src/filesystem/policy.ts` authorizes and emits the canonical target path. The Phase 11 roadmap separately requires no-follow protection for every untrusted component opened by the Linux reader.

An optional preference question offered preserving this behavior or rejecting every symlink. No response was available when context was recorded, so the existing Phase 3 decision was retained. This log does not attribute that choice to a new user answer.

## Other constraints already fixed by the roadmap and code

- Keep the trusted proc-descriptor hop functional and harden untrusted component opens.
- Add deterministic Linux substitution and ordinary-read regression evidence.
- Synchronize current planning and verification truth after implementation, then re-audit the milestone.

## Deferred Ideas

None.
