# Local development validation

Run from the repository root. Product version remains 0.2.4. These checks establish local metadata/build/offline behavior; they do not renew paid-provider proof, certify another host, install the Skill globally or prove its language semantics.

## Official Skill validator

The installed official script is external to this repository. Inspect it before execution; do not replace it with a repository fallback. The Phase 16 environment used Homebrew Python 3.14.5 and an isolated venv under `/tmp/evidencelens-phase16-validator`. Both the default and bundled Python initially lacked PyYAML.

```sh
python3 -m venv /tmp/evidencelens-phase16-validator
/tmp/evidencelens-phase16-validator/bin/python -m pip install --disable-pip-version-check -r tooling/skill-validation-requirements.txt
/tmp/evidencelens-phase16-validator/bin/python -c 'import sys, yaml, importlib.metadata; print(sys.version); print(importlib.metadata.version("PyYAML"))'
/tmp/evidencelens-phase16-validator/bin/python /Users/yifeng/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/assignment-review
```

Use a fresh task-specific venv path if that directory belongs to another run. The [exact developer dependency](../tooling/skill-validation-requirements.txt) is separate from npm/runtime dependencies. Installation uses the configured trusted Python package source. Phase 16 resolved the cached PyPI macOS arm64 CPython 3.14 wheel; another platform may resolve a different compatible artifact. No system package changes are needed.

Use a 180-second cap for venv creation/install and 30 seconds for import/validation. Run each command in an owned process group; capture start, duration, exit and sanitized output. On timeout terminate that group, wait up to five seconds, then kill/reap only remaining owned children. Do not retry without a diagnosed change. A timeout is not a successful check.

Negative control: create a temporary directory containing `SKILL.md` with exactly `---\nname: negative-control\n---\n# Synthetic fixture\n`; invoke the same validator against it. Require nonzero exit and `Missing 'description' in frontmatter`. Real target success requires exit 0 and `Skill is valid!`. Do not alter the real Skill for the control.

Keep venv, pip reports and raw logs outside Git. Remove only task-owned temporary files after evidence capture if cleanup is desired. Record the actual script/Skill SHA-256 and interpreter/dependency version: an updated external validator requires fresh evidence.

[Phase 16 tooling evidence](../.planning/phases/16-verification-tooling-and-offline-runtime-recovery/16-TOOLING-EVIDENCE.md) records actual commands and environment outcomes. Official acceptance checks frontmatter and unfinished placeholders only; semantic review remains separately scoped.
