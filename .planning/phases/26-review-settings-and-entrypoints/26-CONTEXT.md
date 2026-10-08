# Phase26 approved scope

Continuation authorizes approved settings phase. Natural-language el-settings is a skill adapter over strict JSON helper, not a broad text parser. Explicit instruction overrides project settings, then user defaults, then built-in single Codex/full/zero retries/null goals. Settings contain no credentials/model/endpoint, do not read coursework or run review. Scope defaults project for changes; user scope only explicitly selected. Reset removes selected overrides so inheritance visible.

D26-01: Show effective values and source/path, no writes or model.
D26-02: Strict bounded allowlist, atomic private JSON, invalid changes preserve old bytes, symlink/concurrent-lock failures stop rather than overwrite.
D26-03: Both installed and repository entries use the same resolved execution plan/goals/view; single and explicit dual retain full state and Phase25 synthesis.
D26-04: Install new el-settings without replacing existing links/config/records; synthetic cross-project tests isolated, actual user-root link checked separately, GUI discovery remains unverified.
