#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
TEMP_DIR=$(mktemp -d)
chmod 755 "$TEMP_DIR"
trap 'chmod -R u+rw "$TEMP_DIR" 2>/dev/null || true; rm -rf "$TEMP_DIR"' EXIT HUP INT TERM
cd "$PROJECT_ROOT"

if ! docker info >/dev/null 2>&1; then
  printf '%s\n' 'Docker daemon unavailable' >&2
  exit 1
fi

run_failure_case() {
  case_name=$1
  shift
  status=0
  output=$(DEEPSEEK_API_KEY=compose-placeholder docker compose --profile smoke run --rm -T "$@" smoke 2>&1) || status=$?
  # Docker Desktop refuses to mount a mode-000 host file before the container
  # starts. Preserve the exact primary probe, then exercise the same unreadable
  # application path with a directory mount when the host daemon blocks it.
  if [ "$case_name" = "unreadable-file" ] && ! printf '%s' "$output" | grep -q 'PROVIDER_CONFIGURATION' && printf '%s' "$output" | grep -qi 'permission denied'; then
    mkdir "$TEMP_DIR/unreadable-mount"
    status=0
    output=$(DEEPSEEK_API_KEY=compose-placeholder docker compose --profile smoke run --rm -T -e EVIDENCELENS_DISABLE_PROVIDER=0 -e DEEPSEEK_API_KEY= -v "$TEMP_DIR/unreadable-mount:/app/.evidencelens.local.json:ro" smoke 2>&1) || status=$?
  fi
  if [ "$status" -eq 0 ]; then
    printf '[provider-startup:%s] unexpectedly succeeded\n' "$case_name" >&2
    exit 1
  fi
  if ! printf '%s' "$output" | grep -q 'PROVIDER_CONFIGURATION'; then
    printf '[provider-startup:%s] missing sanitized marker\n' "$case_name" >&2
    exit 1
  fi
  if printf '%s' "$output" | grep -Eqi 'accepted|compose-placeholder|synthetic-key|local-synthetic-key|env-synthetic-key|https?://|/Users/|/app/\.evidencelens|\{.*apiKey|cause|stack'; then
    printf '[provider-startup:%s] diagnostics crossed the redaction boundary\n' "$case_name" >&2
    exit 1
  fi
  printf '[provider-startup:%s] sanitized failure confirmed\n' "$case_name" >&2
}

printf '%s' '{"apiKey":"local-synthetic-key"}' > "$TEMP_DIR/conflict.json"
printf '%s' '{"apiKey":"file-synthetic-key"}' > "$TEMP_DIR/unreadable.json"
chmod 000 "$TEMP_DIR/unreadable.json"

run_failure_case missing-key -e EVIDENCELENS_DISABLE_PROVIDER=0 -e DEEPSEEK_API_KEY=
run_failure_case invalid-model -e EVIDENCELENS_DISABLE_PROVIDER=0 -e DEEPSEEK_API_KEY=synthetic-key -e DEEPSEEK_MODEL=not-allowlisted
run_failure_case configuration-conflict -e EVIDENCELENS_DISABLE_PROVIDER=0 -e DEEPSEEK_API_KEY=env-synthetic-key -v "$TEMP_DIR/conflict.json:/app/.evidencelens.local.json:ro"
run_failure_case unreadable-file -e EVIDENCELENS_DISABLE_PROVIDER=0 -e DEEPSEEK_API_KEY= -v "$TEMP_DIR/unreadable.json:/app/.evidencelens.local.json:ro"

printf '%s\n' 'Provider startup matrix passed'
