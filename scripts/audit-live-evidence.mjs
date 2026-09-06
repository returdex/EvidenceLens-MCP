#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const START = "<!-- live-proof:start -->";
const END = "<!-- live-proof:end -->";
const success = /^outcome: credentialed review passed: 4 fixtures, ([1-9]\d*) findings$/u;
const failure = /^outcome: \[docker-review:(preflight|docker|initialize|tools\/list|tools\/call|protocol|timeout)\] failed$/u;
const noAuthorization = "outcome: no-authorization";

export function auditLiveEvidence(verification, requirements) {
  const blocks = verification.split(START);
  if (blocks.length !== 2) throw new Error("live evidence audit failed");
  const tail = blocks[1].split(END);
  if (tail.length !== 2) throw new Error("live evidence audit failed");
  const lines = tail[0].trim().split("\n");
  if (lines.length !== 5) throw new Error("live evidence audit failed");
  const [command, timestamp, outcome, interpretation, retainedStatus] = lines;
  if (command !== "command: npm run docker:review:real" || !/^timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(timestamp)) throw new Error("live evidence audit failed");

  const successMatch = success.exec(outcome);
  const passedOutcome = successMatch !== null && Number.isSafeInteger(Number(successMatch[1]));
  const failedOutcome = failure.test(outcome) || outcome === noAuthorization;
  if (!passedOutcome && !failedOutcome) throw new Error("live evidence audit failed");
  const expectedInterpretation = passedOutcome
    ? "interpretation: complete credentialed Docker MCP structural proof passed"
    : "interpretation: complete credentialed Docker MCP structural proof remains unproven";
  const expectedStatus = passedOutcome ? "status: passed" : "status: gaps_found";
  if (interpretation !== expectedInterpretation || retainedStatus !== expectedStatus) throw new Error("live evidence audit failed");

  const phaseStatus = verification.match(/^status: (passed|gaps_found)$/mu)?.[1];
  const requirement = requirements.match(/^- \[([ x])\] \*\*PROV-01\*\*:/mu)?.[1];
  const trace = requirements.match(/^\| PROV-01 \| Phase 10 \| (Complete|Gap: credentialed Docker MCP proof) \|$/mu)?.[1];
  if (passedOutcome) {
    if (phaseStatus !== "passed" || requirement !== "x" || trace !== "Complete") throw new Error("live evidence audit failed");
  } else if (phaseStatus !== "gaps_found" || requirement !== " " || trace !== "Gap: credentialed Docker MCP proof") {
    throw new Error("live evidence audit failed");
  }
  return { passed: passedOutcome };
}

async function main() {
  if (process.argv.length !== 4) throw new Error("live evidence audit failed");
  const [verification, requirements] = await Promise.all([
    readFile(process.argv[2], "utf8"), readFile(process.argv[3], "utf8")
  ]);
  auditLiveEvidence(verification, requirements);
  process.stdout.write("live evidence audit passed\n");
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    process.stderr.write("live evidence audit failed\n");
    process.exitCode = 1;
  });
}
