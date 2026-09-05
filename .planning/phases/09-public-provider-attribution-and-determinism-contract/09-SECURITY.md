---
phase: 09
slug: public-provider-attribution-and-determinism-contract
status: verified
threats_open: 0
asvs_level: 1
created: 2026-09-05
---

# Phase 09 — Security

Independent read-only audit of all nine Phase 09 threat registers. Implementation evidence was taken from current code and executed tests, not summaries or prose alone.

## Trust Boundaries

| Boundary | Description | Data Crossing |
|---|---|---|
| Provider/analyzer input and result | Untrusted provider result objects and injected analyzer behavior | Findings, provider identity, errors, transient analysis data |
| Review orchestration to MCP | Internal result/configuration reduced to public review JSON | Allowlisted attribution, validated findings/citations |
| Documentation to consumers | Contract language governs client assumptions | Determinism, error, cleanup, and attribution semantics |

## Threat Register

| Threat ID | Category | Severity | Disposition | Status | Evidence |
|---|---|---|---|---|---|
| T-09-01 | Spoofing | not rated | mitigate | closed | `src/tools/review.ts:173-180`; identity mismatch test `tests/contract/review-provider.test.ts:1272`. |
| T-09-02 | Tampering | not rated | mitigate | closed | Namespacing `src/tools/review.ts:134-144`; response provenance refinement `src/contracts/review.ts:371-430`; test `review-provider.test.ts:439`. |
| T-09-03 | Repudiation | not rated | mitigate | closed | Server-owned analyzer metadata and conditional projection `src/tools/review.ts:240-259,283-285`; raw-byte/variability tests `review-provider.test.ts:408,1239`. |
| T-09-04 | Information Disclosure | not rated | mitigate | closed | Strict two-field attribution `src/contracts/review.ts:344-367`; allowlisted projection/token test `review-provider.test.ts:1294`. |
| T-09-05 | Denial of Service | not rated | mitigate | closed | Bounded provider/model schemas and 100-item caps `src/providers/types.ts:39-56`; cap test `review-provider.test.ts:2001`. |
| T-09-06 | Elevation of Privilege | not rated | accept | accepted | Explicitly accepted in `09-01-PLAN.md:265`; recorded below. |
| T-09-GC-01 | Spoofing | not rated | mitigate | closed | Attribution iff/namespace refinement `src/contracts/review.ts:374-386`; matrix `review-provider.test.ts:439`. |
| T-09-GC-02 | Tampering | not rated | mitigate | closed | Image/screenshot hash binding `src/contracts/review.ts:420-428`; provenance tests `review-provider.test.ts:568`. |
| T-09-GC-03 | Information Disclosure | not rated | mitigate | closed | Provider-owned catch creates fresh error `src/tools/review.ts:265-304`; hostile result tests `review-provider.test.ts:1962`. |
| T-09-GC-04 | Repudiation | not rated | mitigate | closed | Provider call exception conversion `src/tools/review.ts:267-271`; classification test `review-provider.test.ts:1940`. |
| T-09-GC-05 | Tampering | not rated | mitigate | closed | Configured provider branch preflights/parses every result `src/tools/review.ts:261-280`; nullish/incomplete matrix `review-provider.test.ts:1925`. |
| T-09-GC-06 | Denial of Service | not rated | mitigate | closed | Independent array caps `src/providers/types.ts:11,52-53`; 100/101 test `review-provider.test.ts:2001`. |
| T-09-GC-07 | Elevation of Privilege | not rated | accept | accepted | Explicitly accepted in `09-02-PLAN.md:307`; recorded below. |
| T-09-GC3-01 | Tampering | not rated | mitigate | closed | PDF child and retained-page refinements `src/contracts/review.ts:297-310,405-416`; test `review-provider.test.ts:568`. |
| T-09-GC3-02 | Denial of Service | not rated | mitigate | closed | Parse/reads contained by provider catch `src/tools/review.ts:265-304`; trap/access tests `review-provider.test.ts:1475,1528,1962`. |
| T-09-GC3-03 | Information Disclosure | not rated | mitigate | closed | Fresh server/provider error conversion `src/tools/review.ts:302-304,314-329`; negative-leak matrices `review-provider.test.ts:714,1940`. |
| T-09-GC3-04 | Repudiation | not rated | mitigate | closed | Analyzer-only error boundary `src/tools/review.ts:230-238`; retained request/limit controls `review-provider.test.ts:714,1153`. |
| T-09-GC3-05 | Spoofing | not rated | mitigate | closed | Strict name/model schema `src/contracts/review.ts:344-348`; integration attribution test `review-provider.test.ts:439`. |
| T-09-GC3-06 | Tampering | not rated | mitigate | closed | Runtime/doc exact error contract test `tests/contract/public-contract-docs.test.ts:246`. |
| T-09-GC3-07 | Elevation of Privilege | not rated | accept | accepted | Explicitly accepted in `09-03-PLAN.md:291`; recorded below. |
| T-09-GC4-01 | Information Disclosure | high | mitigate | closed | Provider-authored-only scanner `src/tools/review.ts:148-165`; every-string redaction matrix `review-provider.test.ts:1783`. |
| T-09-GC4-02 | Information Disclosure / Repudiation | high | mitigate | closed | Sanitized errors/no value interpolation `src/tools/review.ts:302-304,314-329`; payload/log tests `review-provider.test.ts:160,1940`. |
| T-09-GC4-03 | Denial of Service / Repudiation | high | mitigate | closed | Analyzer catch and saved cleanup lifecycle `src/tools/review.ts:214-238,318-325`; tests `review-provider.test.ts:736,1030,1045`. |
| T-09-GC4-04 | Tampering / Repudiation | high | mitigate | closed | Separate normalization, provider, and final-merge boundaries `src/tools/review.ts:203-312`; controls `review-provider.test.ts:699,1153`. |
| T-09-GC4-05 | Tampering | high | mitigate | closed | Retained-page invariant `src/contracts/review.ts:405-416`; target-branch test `review-provider.test.ts:568`. |
| T-09-GC4-06 | Spoofing | medium | mitigate | closed | Identity/namespace/projection chain `src/tools/review.ts:173-180,281-296`; valid control `review-provider.test.ts:1211`. |
| T-09-GC4-07 | Elevation of Privilege | low | accept | accepted | Explicitly accepted in `09-04-PLAN.md:292`; recorded below. |
| T-09-GC5-01 | Denial of Service / Repudiation | high | mitigate | closed | Provenance parses before authored scan `src/tools/review.ts:286-296`; collision controls `review-provider.test.ts:1853,1884`. |
| T-09-GC5-02 | Spoofing / Information Disclosure | high | mitigate | closed | Fixed identity and one-time reads `src/tools/review.ts:27-31,230-252`; test `review-provider.test.ts:766`. |
| T-09-GC5-03 | Tampering / Repudiation | high | mitigate | closed | Request-before-analyzer and isolated clone `src/tools/review.ts:220-238`; mutation test `review-provider.test.ts:817`. |
| T-09-GC5-04 | Information Disclosure | high | mitigate | closed | Stable cleanup targets/first-error continuation `src/review/analysis.ts:127-173`; retained-reference tests `review-provider.test.ts:1075`, `analysis.test.ts:53`. |
| T-09-GC5-05 | Tampering / Repudiation | high | mitigate | closed | Executable runtime documentation equality test `tests/contract/public-contract-docs.test.ts:257`. |
| T-09-GC5-06 | Information Disclosure | high | mitigate | closed | Fresh sanitized failures `src/tools/review.ts:230-238,302-304`; redaction matrix `review-provider.test.ts:1783`. |
| T-09-GC5-07 | Elevation of Privilege | low | accept | accepted | Explicitly accepted in `09-05-PLAN.md:295`; recorded below. |
| T-09-GC6-01 | Information Disclosure | high | mitigate | closed | Fresh strict inference projection `src/tools/review.ts:99-122`; schema `src/providers/types.ts:39-46`; production-config test `review-provider.test.ts:271`. |
| T-09-GC6-02 | Tampering / Denial of Service | high | mitigate | closed | Request-owned clone/freeze `src/tools/review.ts:109-132`; ownership test `review-provider.test.ts:271`. |
| T-09-GC6-03 | Information Disclosure | high | mitigate | closed | Claim/token/payload cleanup `src/review/analysis.ts:127-173`; direct test `analysis.test.ts:5,53`. |
| T-09-GC6-04 | Tampering / Repudiation | high | mitigate | closed | Deep-copied frozen findings used through merge `src/tools/review.ts:254-259,282,298-312`; TOCTOU test `review-provider.test.ts:881`. |
| T-09-GC6-05 | Repudiation / Information Disclosure | high | mitigate | closed | Cleanup registration before option/config access `src/tools/review.ts:213-224`; hostile setup test `review-provider.test.ts:382`. |
| T-09-GC6-06 | Tampering | high | mitigate | closed | Per-action cleanup and pending-error precedence `src/review/analysis.ts:145-173`, `src/tools/review.ts:318-325`; tests `review-provider.test.ts:1129,1153`. |
| T-09-GC6-07 | Repudiation | high | mitigate | closed | Production config, cleanup, snapshot, and strict-extra-field tests `review-provider.test.ts:271,881,1342`; docs guard `public-contract-docs.test.ts:108`. |
| T-09-GC7-01 | Denial of Service / Repudiation | high | mitigate | closed | Narrow filesystem access/one-shot dependency snapshots `src/tools/review.ts:201-224`; lifecycle tests `review-provider.test.ts:130,160,225`. |
| T-09-GC7-02 | Elevation of Privilege / Tampering | high | mitigate | closed | One provider snapshot drives request/invocation/identity `src/tools/review.ts:223-281`; stateful getter test `review-provider.test.ts:249`. |
| T-09-GC7-03 | Information Disclosure | high | mitigate | closed | Exact-key/prototype/data-descriptor/Proxy preflight `src/providers/types.ts:23-36`; preflight matrix `review-provider.test.ts:1387`. |
| T-09-GC7-04 | Denial of Service / Information Disclosure | high | mitigate | closed | Preflight/parse inside provider catch `src/tools/review.ts:265-304`; trap/accessor matrices `review-provider.test.ts:1475,1528`. |
| T-09-GC7-05 | Information Disclosure | high | mitigate | closed | Per-category continuation `src/review/analysis.ts:145-173`; retained-reference matrix `tests/review/analysis.test.ts:53`. |
| T-09-GC7-06 | Repudiation | medium | mitigate | closed | Pending error wins over cleanup fault `src/tools/review.ts:318-325`; precedence test `review-provider.test.ts:1129`. |
| T-09-GC7-07 | Information Disclosure | high | mitigate | closed | Stable error mappings `src/tools/review.ts:206,238,302-304`; hostile option/result tests `review-provider.test.ts:160,1475`. |
| T-09-GC8-01 | Tampering | high | mitigate | closed | Data-descriptor preflight `src/providers/types.ts:23-36`; zero-read accessor matrix `review-provider.test.ts:1590`. |
| T-09-GC8-02 | Information Disclosure | high | mitigate | closed | Provider catch and one-call rejection `src/tools/review.ts:265-304`; one-call/no-leak test `review-provider.test.ts:1590`. |
| T-09-GC8-03 | Spoofing | high | mitigate | closed | Post-preflight identity/namespace/conditional attribution `src/tools/review.ts:281-296`; valid control `review-provider.test.ts:1211`. |
| T-09-GC8-04 | Repudiation | medium | mitigate | closed | Heading-scoped executable semantics `tests/contract/public-contract-docs.test.ts:126`; normative clause `docs/mcp-contract.md:70`. |
| T-09-GC8-05 | Denial of Service | medium | mitigate | closed | Descriptor-only rejection and reflected-trap containment `src/providers/types.ts:25-36`; tests `review-provider.test.ts:1475,1590`. |
| T-09-GC8-06 | Elevation of Privilege | low | accept | accepted | Explicitly accepted as non-blocking WR-01 in `09-08-PLAN.md:215` and `09-REVIEW.md:29-34`; recorded below. |
| T-09-09-01 | Tampering | not rated | mitigate | closed | Post-parse preflight before `.data` `src/tools/review.ts:273-280`; 12-case mutation matrix `review-provider.test.ts:1679`. |
| T-09-09-02 | Spoofing | not rated | mitigate | closed | Post-parse gate precedes identity/namespace/projection `src/tools/review.ts:277-296`; same matrix `review-provider.test.ts:1679`. |
| T-09-09-03 | Information Disclosure | not rated | mitigate | closed | Provider-owned catch makes fresh failures `src/tools/review.ts:265-304`; no-leak matrix `review-provider.test.ts:1679`. |
| T-09-09-04 | Denial of Service | not rated | mitigate | closed | Descriptor-only preflight `src/providers/types.ts:23-36`; accessor/reflective matrices `review-provider.test.ts:1475,1590`. |
| T-09-09-05 | Elevation of Privilege | not rated | accept | accepted | Explicitly accepted in `09-09-PLAN.md:205` and constrained by `09-REVIEW.md:29-34`; recorded below. |

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---|---|---|---|---|
| AR-09-01 | T-09-06 | Provider attribution is inert response data; it grants no capability. | 09-01 threat model | 2026-09-05 |
| AR-09-02 | T-09-GC-07 | This phase added no execution, permission, filesystem, startup, or provider-config capability. | 09-02 threat model | 2026-09-05 |
| AR-09-03 | T-09-GC3-07 | Closure narrowed provenance/error behavior and did not add a public capability. | 09-03 threat model | 2026-09-05 |
| AR-09-04 | T-09-GC4-07 | No filesystem, startup, live-provider, credential, or executable-input surface was added. | 09-04 threat model | 2026-09-05 |
| AR-09-05 | T-09-GC5-07 | No new MCP input, startup/network/credential/Docker/filesystem/write surface was added. | 09-05 threat model | 2026-09-05 |
| AR-09-06 | T-09-GC8-06 | WR-01 direct hostile-request object handling is explicitly non-blocking and out of this closure. | 09-08 threat model and review | 2026-09-05 |
| AR-09-07 | T-09-09-05 | WR-01 remains explicitly accepted/non-blocking; this plan did not change request parsing or MCP decode. | 09-09 threat model and review | 2026-09-05 |

## Unregistered Flags

None. No Phase 09 `SUMMARY.md` contains a `## Threat Flags` section or an unmapped threat flag.

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|---|---:|---:|---:|---|
| 2026-09-05 | 59 | 59 | 0 | independent Codex security auditor |

Executed evidence: `npm test -- --run tests/review/analysis.test.ts tests/contract/review-provider.test.ts tests/contract/public-contract-docs.test.ts` (66/66), `npm run build`, `npm test` (191/191), and `git diff --check` all passed. The test command sets `EVIDENCELENS_DISABLE_PROVIDER=1`; no live-provider test ran.

Audit note: the historical 09-09 four-state range command cannot now reproduce its initial `.planning/STATE.md` inventory because that former unstaged path is no longer present. This is a planning-provenance discrepancy, not a declared threat or implementation mitigation. The relevant request-boundary code was independently checked: the `e068d729..HEAD` diff changes only post-parse provider-envelope handling in `src/tools/review.ts`, not request parsing/decoding.

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-05
