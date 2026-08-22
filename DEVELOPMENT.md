# Development and Release Policy

## GitHub synchronization

Every intentional modification must be committed locally and pushed to the configured GitHub repository. Keep commits focused and use messages that describe the change. Before pushing, inspect the diff and verify that secrets, unrestricted evidence paths, and generated credentials are not included.

Remote target: `https://github.com/returdex/EvidenceLens-MCP`

## Versioning

EvidenceLens MCP uses `x.y.z` version numbers:

- `x` (major): changed only after explicit human confirmation for an incompatible or major product change.
- `y` (minor): incremented when the GSD milestone changes.
- `z` (patch): incremented for each individually completed, user-visible feature or compatible fix.

The current pre-release development version is `0.1.3`. Version changes must update `VERSION` and the relevant planning state in the same commit.

## Releases

Completing a milestone, or fixing a function after a milestone has completed, requires publishing a GitHub Release for the resulting version. Release notes must summarize the milestone or fixes and link to the relevant commits. Do not publish a major (`x`) version without explicit human confirmation.
