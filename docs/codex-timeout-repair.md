# Assignment review duration repair (0.3.9)

## Observed failure

On 2026-10-05, a private real preparation review containing two admitted materials and a 31,041-byte captured prompt reached `thread.started` and `turn.started`. Its immutable receipt records `failed`, `timed_out`, `process/deadline_exceeded`, elapsed 120,408 ms, SIGTERM requested, process close observed and cleanup complete. No terminal event or validated result was recorded. There is no recorded authentication, model or protocol rejection for this attempt. These facts establish that the runner's 120-second deadline ended the attempt; they do not establish the model's progress or how much longer completion would have taken.

The user reports that normal assignment reviews take around five minutes. The default deadline was therefore too short for this workflow. Earlier short synthetic successes did not validate realistic assignment duration.

## Change

- The production supervisor's default and maximum review budget is now 600,000 ms (ten minutes). Preflight remains ten seconds and TERM grace remains two seconds.
- Existing strict event/source validation, output limits, cancellation and process-group cleanup remain active. A longer deadline does not make partial output successful.
- Command guidance requires waiting on the same running process, with brief progress updates, rather than applying a separate 120-second host deadline. A timeout states the actual execution ceiling and offers the same independent stage command as a recovery action. Explicit authorization that already covers retry is respected; no automatic resend is introduced.
- Installed assignment-review skills resolve to this checkout, so the runtime and reference update apply through the existing installation.

The original failed attempt remains unchanged. This repair makes no new model call and does not rerun the coursework. Actual A4 completion and Phase 21 handoff/recheck/usage acceptance remain unverified.

## Verification method

`tests/codex/deadline.mjs` launches real Node child processes through the production supervisor, while advancing only the parent supervisor's `setTimeout` clock using Node test mock timers. Children use independent real timers and controlled private release files.

1. Advance supervisor time to five minutes, confirm the child is still running, then allow a valid terminal sequence and confirm candidate completion without requested termination.
2. Confirm the child is still running at 599,999 ms, advance one more millisecond, and confirm `timed_out`, `deadline_exceeded`, process close, no candidate and complete cleanup.

These are clock-controlled process tests, not ten minutes of real inference. Existing short-deadline, stubborn-process, descendant and cancellation tests provide complementary real-time cleanup coverage.

## Fresh validation

Fresh build passed; the Codex/prompt/command/source-boundary Node suites passed 201/201 in 11.943 seconds, and six affected Vitest files passed 118/118 in 3.80 seconds. Zero failures or skipped checks. Existing non-fatal PDF/font warnings remained. Installed command/reference graph checks passed within the Node suite. See [commands and scope](development-validation.md).
