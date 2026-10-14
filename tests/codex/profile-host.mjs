import test from 'node:test';
import assert from 'node:assert/strict';
import {CODEX_EXECUTABLE,CODEX_VERSION,CODEX_BINARY_SHA256} from '../../skills/assignment-review/scripts/codex-profile.mjs';
import {boundedProbe,childEnvironment,executableIdentity} from '../../skills/assignment-review/scripts/codex-preflight.mjs';

test('installed desktop CLI matches the certified version and binary',async()=>{
 const version=await boundedProbe(CODEX_EXECUTABLE,['--version'],{env:childEnvironment()});
 assert.equal(version.exitCode,0);assert.equal(version.cleanupComplete,true);
 assert.equal(version.output.trim(),'codex-cli '+CODEX_VERSION);
 assert.equal((await executableIdentity(CODEX_EXECUTABLE)).binarySha256,CODEX_BINARY_SHA256);
});
