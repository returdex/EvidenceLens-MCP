#!/bin/sh
set -Eeuo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
cd "$PROJECT_ROOT"

phase() {
  printf '[docker-smoke:%s] %s\n' "$1" "$2" >&2
}

if ! command -v docker >/dev/null 2>&1; then
  phase preflight 'Docker CLI is not installed; offline container smoke cannot run.'
  exit 127
fi

phase config 'Rendering the offline Compose profile.'
if ! EVIDENCELENS_PROOF_DEEPSEEK_API_KEY=compose-placeholder DEEPSEEK_API_KEY=compose-placeholder docker compose --profile smoke config --quiet; then
  phase config 'Compose configuration failed.'
  exit 1
fi

phase build 'Building the single-stage offline image.'
if ! EVIDENCELENS_PROOF_DEEPSEEK_API_KEY=compose-placeholder DEEPSEEK_API_KEY=compose-placeholder docker compose --profile smoke build; then
  phase build 'Docker image build failed.'
  exit 1
fi

phase protocol 'Running initialize, tools/list, and tools/call over container stdio.'
if ! EVIDENCELENS_PROOF_DEEPSEEK_API_KEY=compose-placeholder DEEPSEEK_API_KEY=compose-placeholder node "$PROJECT_ROOT/scripts/docker-review-real.mjs" --offline; then
  phase protocol 'Offline MCP stdio validation failed.'
  exit 1
fi

phase filesystem 'Proving the /workspace evidence mount rejects writes.'
if EVIDENCELENS_PROOF_DEEPSEEK_API_KEY=compose-placeholder DEEPSEEK_API_KEY=compose-placeholder docker compose --profile smoke run --rm -T --entrypoint /bin/sh smoke -c 'touch /workspace/.evidencelens-docker-smoke-write-test'; then
  phase filesystem 'The read-only /workspace mount unexpectedly accepted a write.'
  exit 1
fi

phase preflight 'Proving credentialed startup fails closed without a key.'
missing_key_output=$(EVIDENCELENS_PROOF_DEEPSEEK_API_KEY=compose-placeholder DEEPSEEK_API_KEY=compose-placeholder docker compose --profile smoke run --rm -T -e EVIDENCELENS_DISABLE_PROVIDER=0 -e DEEPSEEK_API_KEY= smoke 2>&1) || missing_key_status=$?
missing_key_status=${missing_key_status:-0}
if [ "$missing_key_status" -eq 0 ]; then
  phase preflight 'Credentialed startup unexpectedly succeeded without DEEPSEEK_API_KEY.'
  exit 1
fi
if ! printf '%s' "$missing_key_output" | grep -q 'PROVIDER_CONFIGURATION'; then
  phase preflight 'Missing-key startup did not emit the sanitized PROVIDER_CONFIGURATION marker.'
  exit 1
fi
if printf '%s' "$missing_key_output" | grep -Eq '/workspace|/app/|https?://|requestId|response body|stack'; then
  phase preflight 'Missing-key diagnostics leaked a path, URL, request detail, or stack marker.'
  exit 1
fi

phase complete 'Offline Docker smoke passed without provider calls or external requests.'
