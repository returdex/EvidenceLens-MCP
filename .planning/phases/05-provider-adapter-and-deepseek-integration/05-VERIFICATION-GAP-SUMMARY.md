---
phase: 05-provider-adapter-and-deepseek-integration
gap: default-test-provider-isolation
status: resolved
---

# Phase 05 Verification Gap Summary

The ordinary test command is now explicitly credential-free and no-network even when `DEEPSEEK_API_KEY` is present. `npm test` sets `EVIDENCELENS_DISABLE_PROVIDER=1`; `createServer()` honors that switch by skipping automatic provider configuration loading and built-in DeepSeek registration. Explicitly injected providers remain supported, and normal runtime registration is unchanged when the switch is absent.

## Changes

- Updated `package.json` and `tests/smoke/project-config.test.ts` to require the isolation switch while preserving the unchanged `test:deepseek-live` script.
- Added an MCP protocol regression using a dummy key, loopback URL, and throwing `fetch` guard; it proves ordinary test isolation returns deterministic results without network access.
- Documented the exact isolation behavior in `README.md` and `docs/mcp-contract.md`.

## Verification

- `env DEEPSEEK_API_KEY=dummy npm test` — 21 files, 114 tests passed.
- `npm run build` — passed.
- Focused contract/provider tests — 6 files, 48 tests passed.
- `env -u DEEPSEEK_API_KEY npm run test:deepseek-live -- --run` — explicit live test skipped by its existing missing-key preflight; no network call.
- `git diff --check` — passed.

No public MCP schemas were changed and no real DeepSeek API call was made.
