#!/bin/sh
set -eu

if [ "${EVIDENCELENS_DISABLE_PROVIDER:-}" != "1" ]; then
  if ! node --input-type=module -e 'import { loadProviderConfig } from "./dist/providers/config.js"; try { loadProviderConfig(); } catch { process.exitCode = 1; }'; then
    echo "PROVIDER_CONFIGURATION: configure DEEPSEEK_API_KEY or provide one valid mounted provider configuration before starting the credentialed profile." >&2
    exit 1
  fi
fi

exec node dist/server.js
