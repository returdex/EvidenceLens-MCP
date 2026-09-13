#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const START = "<!-- live-proof:start -->";
const END = "<!-- live-proof:end -->";
const success = /^outcome: credentialed review passed: 4 fixtures, ([1-9]\d*) findings$/u;
const failure = /^outcome: \[docker-review:(preflight|docker|initialize|tools\/list|tools\/call|protocol|timeout)\] failed$/u;
const noAuthorization = "outcome: no-authorization";

const hash64 = /^[0-9a-f]{64}$/u;
const commitId = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/u;
const nonPasses = new Set(["diagnostic_failed", "preflight_failed", "review_failed", "build_failed", "request_failed", "timeout", "protocol_failed", "disclosure", "malformed", "abnormal_close"]);

function exact(value, keys) {
  return value !== null && typeof value === "object" && !Array.isArray(value) && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}
function auditSealed(proof, phase7, phase10, requirements) {
  const proofKeys = ["certifier_sha256", "clean_exit", "finding_count", "fixture_count", "manifest_sha256", "non_planning_tree", "outcome", "reviewed_commit", "schema", "status"];
  const certKeys = ["audit_live_evidence_sha256", "audit_proof_chain_sha256"];
  if (!exact(proof, proofKeys) || proof.schema !== "evidencelens.live-proof.v2" || !exact(proof.certifier_sha256, certKeys)
    || !Object.values(proof.certifier_sha256).every((value) => typeof value === "string" && hash64.test(value))
    || !hash64.test(proof.manifest_sha256) || !hash64.test(proof.non_planning_tree) || !commitId.test(proof.reviewed_commit)) throw new Error("live evidence audit failed");
  const passed = proof.outcome === "passed";
  if (!passed && !nonPasses.has(proof.outcome)) throw new Error("live evidence audit failed");
  if (passed ? (proof.status !== "passed" || proof.clean_exit !== true || proof.fixture_count !== 4 || !Number.isSafeInteger(proof.finding_count) || proof.finding_count < 1)
    : (proof.status !== "gaps_found" || proof.clean_exit !== false || proof.fixture_count !== 0 || proof.finding_count !== 0)) throw new Error("live evidence audit failed");
  const p7 = phase7.match(/^status: (passed|gaps_found)$/mu)?.[1];
  const p10 = phase10.match(/^status: (passed|gaps_found)$/mu)?.[1];
  const requirement = requirements.match(/^- \[([ x])\] \*\*PROV-01\*\*:/mu)?.[1];
  const trace = requirements.match(/^\| PROV-01 \| Phase 10 \| (Complete|Gap: credentialed Docker MCP proof) \|$/mu)?.[1];
  if (passed ? (p7 !== "passed" || p10 !== "passed" || requirement !== "x" || trace !== "Complete")
    : (p7 !== "gaps_found" || p10 !== "gaps_found" || requirement !== " " || trace !== "Gap: credentialed Docker MCP proof")) throw new Error("live evidence audit failed");
  return { passed };
}

export function auditLiveEvidence(verification, requirements, phase10, requirements4) {
  if (typeof verification === "object") return auditSealed(verification, requirements, phase10, requirements4);
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
  if (process.argv.length === 4) {
    const [verification, requirements] = await Promise.all([readFile(process.argv[2], "utf8"), readFile(process.argv[3], "utf8")]);
    auditLiveEvidence(verification, requirements);
  } else if (process.argv.length === 6) {
    const [proofText, phase7, phase10, requirements] = await Promise.all(process.argv.slice(2).map((path) => readFile(path, "utf8")));
    let proof; try { proof = JSON.parse(proofText); } catch { throw new Error("live evidence audit failed"); }
    auditLiveEvidence(proof, phase7, phase10, requirements);
  } else throw new Error("live evidence audit failed");
  process.stdout.write("live evidence audit passed\n");
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    process.stderr.write("live evidence audit failed\n");
    process.exitCode = 1;
  });
}
