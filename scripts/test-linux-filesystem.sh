#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
cd "$PROJECT_ROOT"

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  printf '%s\n' 'Docker daemon is required for the Linux filesystem regression.' >&2
  exit 1
fi

docker build -t evidencelens-phase11-filesystem:local .
docker run --rm --network none --read-only --tmpfs /tmp:rw,nosuid,nodev,mode=1777 \
  --mount "type=bind,src=$PROJECT_ROOT/tests/filesystem/linux-anchored.mjs,dst=/tmp/linux-anchored.mjs,readonly" \
  --entrypoint node evidencelens-phase11-filesystem:local --test /tmp/linux-anchored.mjs
