---
status: testing
phase: 06-docker-deployment-and-end-to-end-validation
source: [06-01-SUMMARY.md, 06-02-SUMMARY.md]
started: 2026-08-24T00:00:00+10:00
updated: 2026-08-24T00:00:00+10:00
---

## Current Test

number: 1
name: Cold Start Smoke Test
expected: |
  With no service already running, the Docker Compose offline profile builds and starts the MCP server from scratch. The stdio client completes initialize, tools/list, and tools/call for the four fixed fixtures; the read-only workspace rejects writes; and missing provider configuration exits with a sanitized PROVIDER_CONFIGURATION error.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: With no service already running, the Docker Compose offline profile builds and starts the MCP server from scratch. The stdio client completes initialize, tools/list, and tools/call for the four fixed fixtures; the read-only workspace rejects writes; and missing provider configuration exits with a sanitized PROVIDER_CONFIGURATION error.
result: pending

### 2. Offline Multimodal Review
expected: The credential-free E2E path completes a four-role review using assignment text, rubric table, teacher image, and solution PDF, while returning schema-valid findings with hashes, logical references, and citations without raw content or host paths.
result: pending

### 3. Deployment Runbook
expected: The documented setup identifies the exact offline command and separately documents the credentialed DeepSeek command, read-only mount behavior, sanitized configuration errors, and network/cost warning.
result: pending

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0

## Gaps

none yet
