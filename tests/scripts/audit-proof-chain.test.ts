import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, copyFile, lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { auditBuildAuto, auditChainRecord, auditConsumedGenerationForensic, auditConsumedGenerationForensicFile, auditConsumedLiveArchive, auditExecution, auditExecutionAuto, auditLiveProof, auditModeRecords, auditProofAuto, auditRepairSet, auditSourceAndReports, BRANCH_AUTHORITY_REGISTRIES, closeTerminalOwnerCapability, createTerminalOwnerCapability, CURRENT_CONSUMED_LIVE_ARCHIVE_PATH, FINAL_AUDIT_REGISTRIES, PROOF_CHAIN_MODES, validateDisconfirmationRecord, validateTerminalOwnerReceipt } from "../../scripts/audit-proof-chain.mjs";
import { canonicalJson } from "../../scripts/audit-live-readiness.mjs";

const h = (c: string) => c.repeat(64);
const digest = (value: unknown) => createHash("sha256").update(canonicalJson(value)).digest("hex");
const certifiers = { audit_live_evidence_sha256: h("a"), audit_proof_chain_sha256: h("b") };
const identity = { certifier_sha256: certifiers, manifest_sha256: h("c"), non_planning_tree: h("d"), reviewed_commit: "e".repeat(40) };

const buildRecord = {
  ...identity, build_count: 1, daemon_identity_sha256: h("1"), fixture_sha256: [h("2"), h("3"), h("4"), h("5")],
  generation: h("6"), image_config_sha256: h("7"), image_content_sha256: h("8"), image_id: `sha256:${h("9")}`,
  runtime_sha256: h("a"), schema: "evidencelens.build.v2", status: "ready", verifier_build_count: 0,
};
const receipt = {
  diagnostic_second_call: false, fallback: false, generation: h("f"), mac: h("1"), max_retries: 0,
  observed_provider_requests: 1, reservation_count: 1, schema: "evidencelens.provider-request-receipt.v1",
};
const result = { finding_count: 2, fixture_count: 4, model: "deepseek-chat", provider: "deepseek", public_schema: true, provenance: true };
const transcript = { close_code: 0, exit_code: 0, mcp_method: "tools/call", tool: "review_evidence" };
const executionRecord = {
  ...identity, argv: ["docker", "compose", "--profile", "review", "run", "--rm", "-T", "review"],
  build_generation: buildRecord.generation, clean_exit: true, close: { code: 0, observed: true, signal: null },
  diagnostic: null, environment: { profile: "review", provider_disabled: false }, execution_generation: receipt.generation,
  exit: { code: 0, observed: true, signal: null }, finding_count: 2, fixture_count: 4, image_id: buildRecord.image_id,
  mcp_tools_call_count: 1, model: "deepseek-chat", outcome: "passed", provider: "deepseek", repair_set: [],
  request_receipt: receipt, request_receipt_sha256: digest(receipt), reservation_count: 1, result,
  result_sha256: digest(result), schema: "evidencelens.execution.v2", status: "passed", transcript,
  transcript_sha256: digest(transcript),
};
const forensicRecord = {
  build_generation: "aa9559e40fb797ce19457fdbbecb5a59913befb124d6258b4ea506e7596ce19f",
  build_image_id: "sha256:5766201ff50c1fb4f0688443d11793eb4192ea209cc6d99f435f498deec4d270",
  build_sha256: "d0af8988e0e9c070b9dcd5c6095ae3a86536c00821a05b6b7d4a5d88b427d3be",
  canonical_encoding: "utf-8/canonical-json", certifier_sha256: {
    audit_live_evidence_sha256: "62d56935b86e2956e83221948c992ca2a44f51b3522f2817678c4d3c66dbd500",
    audit_proof_chain_sha256: "ee6e0fe5a3c9e3a9aa2f408d3dda31bcb182c2c825afc9ed51a6472e2594e802",
  },
  committed_state_commit: "1b62227f8c38b12a8c287f670d9300241a11686b", committed_state_mode: "0600",
  committed_state_path: ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/.10-51-live-state.json",
  committed_state_sha256: "fccf4bf8244b73cea24ac00a47653762164906ec451d1373de1260a43e30a387",
  diagnostic: "unavailable_from_committed_state", generation: "aa9559e40fb797ce19457fdbbecb5a59913befb124d6258b4ea506e7596ce19f",
  inner_status: "failed", lifecycle_close: "unavailable_from_committed_state", lifecycle_exit: "unavailable_from_committed_state",
  manifest_sha256: "8a8556d3eb5bd93f04e27ba5becb369aa2fecf9ffbe596f443f1b42732ce76fd", mcp_tools_call_count: 0,
  non_planning_tree: "4f9b2179939056aaa632d06f0b7405eddfde2322c7fcd207de5b6817f88dd79a", observed_provider_requests: 0,
  outcome: "terminal_evidence_incomplete", previous_sha256: "ba48bb767a5dc0648e58c062364e79865235056b4bcfaa1eb0d3ceadfca08a09",
  request_receipt: "unavailable_from_committed_state", request_receipt_mac: "unavailable_from_committed_state", reservation_count: 1,
  result: "unavailable_from_committed_state", reviewed_commit: "5751312a28da639ebe0b24834b18d90655efe4b3",
  schema: "evidencelens.consumed-generation-forensic.v1", sequence: 4, status: "gaps_found",
  transcript: "unavailable_from_committed_state", wrapper_status: "completed",
};
const proofRecord = {
  ...identity, build_sha256: digest(buildRecord), clean_exit: true, execution_sha256: digest(executionRecord), finding_count: 2,
  fixture_count: 4, outcome: "passed", review_sha256: "", schema: "evidencelens.live-proof.v3",
  security_sha256: "", source_sha256: "", status: "passed",
};

describe("proof chain certifier", () => {
  const source = { ...identity, schema: "evidencelens.source.v2", status: "ready" };
  const deep = { ...identity, schema: "evidencelens.deep-review.v2", status: "ready" };
  const asvs = { ...identity, schema: "evidencelens.asvs-review.v2", status: "ready" };
  const build = buildRecord;
  const execution = executionRecord;
  const boundProof = { ...proofRecord, source_sha256: digest(source), review_sha256: digest(deep), security_sha256: digest(asvs) };

  it("creates one canonical owner-only fixed-path disconfirmation record without external effects", async () => {
    const repoRoot = process.cwd();
    const root = await mkdtemp(join(tmpdir(), "evidencelens-disconfirmation-"));
    const target = join(root, ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-167-DISCONFIRMATION.json");
    const marker = join(root, "external-called");
    try {
      await mkdir(join(target, ".."), { recursive: true });
      for (const command of ["docker", "curl", "wget", "gh"]) {
        await writeFile(join(root, command), `#!/bin/sh\nprintf called >> '${marker}'\nexit 99\n`, { mode: 0o700 });
      }
      const result = spawnSync(process.execPath, [join(repoRoot, "scripts/audit-proof-chain.mjs"), "disconfirmation-auto"], {
        cwd: root, encoding: "utf8", env: { PATH: `${root}:${process.env.PATH}`, DEEPSEEK_API_KEY: "must-not-be-read" },
      });
      expect(result).toMatchObject({ status: 0, stderr: "" });
      expect(result.stdout).toBe('{"status":"ready"}\n');
      const bytes = await readFile(target, "utf8");
      const record = JSON.parse(bytes);
      expect(bytes).toBe(canonicalJson(record));
      expect(validateDisconfirmationRecord(record)).toEqual({ status: "ready" });
      expect((await lstat(target)).mode & 0o777).toBe(0o600);
      expect(record.side_effects).toEqual({
        credential_reads: 0, dispatches: 0, docker_invocations: 0, github_actions_runs: 0,
        network_requests: 0, paid_provider_requests: 0, provider_requests: 0, pushes: 0,
        unrelated_target_writes: 0,
      });
      expect(bytes).not.toContain("must-not-be-read");
      await expect(readFile(marker)).rejects.toMatchObject({ code: "ENOENT" });
      expect((await readdir(join(target, ".."))).filter((name) => name.includes(".tmp-"))).toEqual([]);
      const replay = spawnSync(process.execPath, [join(repoRoot, "scripts/audit-proof-chain.mjs"), "disconfirmation-auto"], { cwd: root, encoding: "utf8" });
      expect(replay).toMatchObject({ status: 1, stdout: "", stderr: "PROOF_CHAIN_REPLAY\n" });
      expect(await readFile(target, "utf8")).toBe(bytes);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("rejects extra argv and a pre-existing symlink without replacing its target", async () => {
    const repoRoot = process.cwd();
    const root = await mkdtemp(join(tmpdir(), "evidencelens-disconfirmation-hostile-"));
    const phaseDir = join(root, ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e");
    const target = join(phaseDir, "10-167-DISCONFIRMATION.json");
    const unrelated = join(root, "unrelated");
    try {
      await mkdir(phaseDir, { recursive: true });
      await writeFile(unrelated, "preserve", { mode: 0o600 });
      await symlink(unrelated, target);
      const hostile = spawnSync(process.execPath, [join(repoRoot, "scripts/audit-proof-chain.mjs"), "disconfirmation-auto"], { cwd: root, encoding: "utf8" });
      expect(hostile).toMatchObject({ status: 1, stdout: "", stderr: "PROOF_CHAIN_REPLAY\n" });
      expect(await readFile(unrelated, "utf8")).toBe("preserve");
      expect((await lstat(target)).isSymbolicLink()).toBe(true);
      const extra = spawnSync(process.execPath, [join(repoRoot, "scripts/audit-proof-chain.mjs"), "disconfirmation-auto", target], { cwd: root, encoding: "utf8" });
      expect(extra).toMatchObject({ status: 1, stdout: "", stderr: "PROOF_CHAIN_ARGV\n" });
      expect((await readdir(phaseDir)).filter((name) => name.includes(".tmp-"))).toEqual([]);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("rejects malformed disconfirmation evidence and keeps the command outside authority modes", () => {
    const valid = {
      cases: { complete_content_acceptance: "passed", explicit_max_tokens_bounds: "passed", hostile_output_rejection: "passed", provider_default_omits_max_tokens: "passed" },
      schema: "evidencelens.hostile-disconfirmation.v1",
      side_effects: { credential_reads: 0, dispatches: 0, docker_invocations: 0, github_actions_runs: 0, network_requests: 0, paid_provider_requests: 0, provider_requests: 0, pushes: 0, unrelated_target_writes: 0 },
      status: "ready",
    };
    expect(validateDisconfirmationRecord(valid)).toEqual({ status: "ready" });
    for (const changed of [
      { ...valid, extra: true },
      { ...valid, status: "passed" },
      { ...valid, cases: { ...valid.cases, hostile_output_rejection: "failed" } },
      { ...valid, side_effects: { ...valid.side_effects, provider_requests: 1 } },
    ]) expect(() => validateDisconfirmationRecord(changed)).toThrow("PROOF_CHAIN_DISCONFIRMATION");
    expect(PROOF_CHAIN_MODES).not.toHaveProperty("disconfirmation-auto");
  });

  it("publishes a frozen exact registry without draft modes", () => {
    expect(CURRENT_CONSUMED_LIVE_ARCHIVE_PATH).toMatch(/10-167-CONSUMED-LIVE\.json$/u);
    expect(Object.isFrozen(PROOF_CHAIN_MODES)).toBe(true);
    expect(Object.keys(PROOF_CHAIN_MODES)).toContain("consumed-live-archive-10-165");
    expect(Object.keys(PROOF_CHAIN_MODES)).not.toContain("draft");
    expect(PROOF_CHAIN_MODES.build.schemas).toEqual(["evidencelens.build.v2", "evidencelens.source.v2", "evidencelens.deep-review.v2", "evidencelens.asvs-review.v2"]);
  });

  it("publishes distinct immutable 5/9 sync and 7/11 final registries including LOCAL_VALIDATION", () => {
    expect(BRANCH_AUTHORITY_REGISTRIES.preflight.paths).toHaveLength(5);
    expect(BRANCH_AUTHORITY_REGISTRIES.live.paths).toHaveLength(9);
    expect(FINAL_AUDIT_REGISTRIES.preflight).toHaveLength(7);
    expect(FINAL_AUDIT_REGISTRIES.live).toHaveLength(11);
    for (const paths of [BRANCH_AUTHORITY_REGISTRIES.preflight.paths, BRANCH_AUTHORITY_REGISTRIES.live.paths]) {
      expect(paths[0]).toMatch(/10-167-CONSUMED-LIVE\.json$/u);
      expect(paths.at(-1)).toMatch(/10-169-LOCAL-VALIDATION\.json$/u);
      expect(new Set(paths).size).toBe(paths.length);
      expect(Object.isFrozen(paths)).toBe(true);
    }
    expect(BRANCH_AUTHORITY_REGISTRIES.preflight.schema).not.toBe(BRANCH_AUTHORITY_REGISTRIES.live.schema);
  });

  it("rotates current source, build, live and final-audit authority to 10-167 through 10-170", () => {
    expect(PROOF_CHAIN_MODES["source-review-auto"].paths).toEqual([
      expect.stringMatching(/10-167-SOURCE\.json$/u), expect.stringMatching(/10-167-REVIEW\.md$/u),
    ]);
    expect(PROOF_CHAIN_MODES["reviews-auto"].paths).toEqual([
      expect.stringMatching(/10-167-SOURCE\.json$/u), expect.stringMatching(/10-167-REVIEW\.md$/u), expect.stringMatching(/10-167-SECURITY\.md$/u),
    ]);
    expect(PROOF_CHAIN_MODES["build-auto"].paths[0]).toMatch(/10-168-FINAL-BUILD\.json$/u);
    expect(FINAL_AUDIT_REGISTRIES.live.slice(-2)).toEqual([
      expect.stringMatching(/10-170-SYNC-CLAIM\.json$/u), expect.stringMatching(/10-170-SYNC-JOURNAL\.json$/u),
    ]);
  });

  it("rejects local audit modes without a live owner capability and after capability closure", () => {
    const transition = { branch: "preflight_authenticated", generation: executionRecord.execution_generation, schema: "evidencelens.live-transition.v1" };
    expect(() => auditExecutionAuto({}, transition, executionRecord)).toThrow("PROOF_CHAIN_LOCAL_OWNER");
    const capability = createTerminalOwnerCapability();
    expect(auditExecutionAuto(capability, transition, executionRecord)).toEqual({ branch: "preflight_authenticated", status: "passed" });
    expect(auditProofAuto(capability, transition, executionRecord, { ...boundProof, execution_sha256: digest(executionRecord) })).toEqual({ branch: "preflight_authenticated", status: "passed" });
    closeTerminalOwnerCapability(capability);
    expect(() => auditExecutionAuto(capability, transition, executionRecord)).toThrow("PROOF_CHAIN_LOCAL_OWNER");
  });

  it("validates an exact terminal-owner receipt but never treats it as standalone authority", () => {
    const validation = {
      artifact_sha256: { execution: h("1"), proof: h("2"), transition: h("3") },
      auditors: { execution: "execution-auto", proof: "proof-auto" }, branch: "preflight_authenticated",
      capability_identity: h("4"), generation: h("5"), outcome: "passed", schema: "evidencelens.terminal-owner-validation.v1",
      validation: { execution: "passed", proof: "passed" },
    };
    expect(validateTerminalOwnerReceipt(validation)).toEqual(validation);
    expect(() => validateTerminalOwnerReceipt({ ...validation, extra: true })).toThrow("PROOF_CHAIN_LOCAL_VALIDATION");
    expect(() => validateTerminalOwnerReceipt({ ...validation, artifact_sha256: { ...validation.artifact_sha256, proof: h("0") } })).not.toThrow();
    expect(() => auditModeRecords("proof", [validation])).toThrow();
  });

  it("accepts only the exact authority-revoked current consumed-live archive", async () => {
    const path = ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-167-CONSUMED-LIVE.json";
    const archive = JSON.parse(await readFile(path, "utf8"));
    expect(auditConsumedLiveArchive(archive)).toEqual({ authority: false, status: "passed" });
    expect(auditModeRecords("consumed-live-archive", [archive])).toEqual({ authority: false, status: "passed" });
    for (const changed of [
      { ...archive, authority: true }, { ...archive, replay_allowed: true }, { ...archive, status: "gaps_found" },
      { ...archive, reservation_count: 0 }, { ...archive, observed_provider_requests: 0 },
      { ...archive, artifacts: { ...archive.artifacts, proof: { ...archive.artifacts.proof, sha256: h("0") } } },
    ]) expect(() => auditConsumedLiveArchive(changed)).toThrow("PROOF_CHAIN_CONSUMED_LIVE");
  });

  it("retains 10-150 only through its explicit read-only historical audit", async () => {
    const path = ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-152-CONSUMED-LIVE.json";
    const archive = JSON.parse(await readFile(path, "utf8"));
    expect(auditModeRecords("consumed-live-archive-10-150", [archive])).toEqual({ authority: false, status: "gaps_found" });
    expect(PROOF_CHAIN_MODES["consumed-live-archive-10-150"].paths).toEqual([path]);
    expect(PROOF_CHAIN_MODES["consumed-live-archive"].paths).not.toContain(path);
  });

  it("retains 10-145 only through its explicit read-only historical audit", async () => {
    const path = ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-147-CONSUMED-LIVE.json";
    const archive = JSON.parse(await readFile(path, "utf8"));
    expect(auditModeRecords("consumed-live-archive-10-145", [archive])).toEqual({ authority: false, status: "gaps_found" });
    expect(PROOF_CHAIN_MODES["consumed-live-archive-10-145"].paths).toEqual([path]);
    expect(PROOF_CHAIN_MODES["consumed-live-archive"].paths).not.toContain(path);
  });

  it("retains 10-140 only through its explicit read-only historical audit", async () => {
    const path = ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-142-CONSUMED-LIVE.json";
    const archive = JSON.parse(await readFile(path, "utf8"));
    expect(auditModeRecords("consumed-live-archive-10-140", [archive])).toEqual({ authority: false, status: "gaps_found" });
    expect(PROOF_CHAIN_MODES["consumed-live-archive-10-140"].paths).toEqual([path]);
    expect(PROOF_CHAIN_MODES["consumed-live-archive"].paths).not.toContain(path);
  });

  it("retains 10-135 only through its explicit read-only historical audit", async () => {
    const path = ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-137-CONSUMED-LIVE.json";
    const archive = JSON.parse(await readFile(path, "utf8"));
    expect(auditModeRecords("consumed-live-archive-10-135", [archive])).toEqual({ authority: false, status: "gaps_found" });
    expect(PROOF_CHAIN_MODES["consumed-live-archive-10-135"].paths).toEqual([path]);
    expect(PROOF_CHAIN_MODES["consumed-live-archive"].paths).not.toContain(path);
  });

  it("retains 10-130 only through its explicit read-only historical audit", async () => {
    const path = ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-132-CONSUMED-LIVE.json";
    const archive = JSON.parse(await readFile(path, "utf8"));
    expect(auditModeRecords("consumed-live-archive-10-130", [archive])).toEqual({ authority: false, status: "gaps_found" });
    expect(PROOF_CHAIN_MODES["consumed-live-archive-10-130"].paths).toEqual([path]);
    expect(PROOF_CHAIN_MODES["consumed-live-archive"].paths).not.toContain(path);
  });

  it("retains 10-125 only through its explicit read-only historical audit", async () => {
    const path = ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-127-CONSUMED-LIVE.json";
    const archive = JSON.parse(await readFile(path, "utf8"));
    expect(auditModeRecords("consumed-live-archive-10-125", [archive])).toEqual({ authority: false, status: "gaps_found" });
    expect(PROOF_CHAIN_MODES["consumed-live-archive-10-125"].paths).toEqual([path]);
    expect(PROOF_CHAIN_MODES["consumed-live-archive"].paths).not.toContain(path);
  });

  it("retains 10-120 only through its explicit read-only historical audit", async () => {
    const path = ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-122-CONSUMED-LIVE.json";
    const archive = JSON.parse(await readFile(path, "utf8"));
    expect(auditModeRecords("consumed-live-archive-10-120", [archive])).toEqual({ authority: false, status: "gaps_found" });
    expect(PROOF_CHAIN_MODES["consumed-live-archive-10-120"].paths).toEqual([path]);
    expect(PROOF_CHAIN_MODES["consumed-live-archive"].paths).not.toContain(path);
  });

  it("retains 10-110 only through its explicit read-only historical audit", async () => {
    const path = ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-112-CONSUMED-LIVE.json";
    const archive = JSON.parse(await readFile(path, "utf8"));
    expect(auditModeRecords("consumed-live-archive-10-110", [archive])).toEqual({ authority: false, status: "gaps_found" });
    expect(PROOF_CHAIN_MODES["consumed-live-archive-10-110"].paths).toEqual([path]);
    expect(PROOF_CHAIN_MODES["consumed-live-archive"].paths).not.toContain(path);
  });

  it("retains 10-105 only through its explicit read-only historical audit", async () => {
    const path = ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-107-CONSUMED-LIVE.json";
    const archive = JSON.parse(await readFile(path, "utf8"));
    expect(auditModeRecords("consumed-live-archive-10-105", [archive])).toEqual({ authority: false, status: "gaps_found" });
    expect(PROOF_CHAIN_MODES["consumed-live-archive-10-105"].paths).toEqual([path]);
    expect(PROOF_CHAIN_MODES["consumed-live-archive"].paths).not.toContain(path);
  });

  it("retains 10-100 only through its explicit read-only historical audit", async () => {
    const path = ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-102-CONSUMED-LIVE.json";
    const archive = JSON.parse(await readFile(path, "utf8"));
    expect(auditModeRecords("consumed-live-archive-10-100", [archive])).toEqual({ authority: false, status: "gaps_found" });
    expect(PROOF_CHAIN_MODES["consumed-live-archive-10-100"].paths).toEqual([path]);
    expect(PROOF_CHAIN_MODES["consumed-live-archive"].paths).not.toContain(path);
  });

  it("retains 10-90 only through its explicit read-only historical audit", async () => {
    const path = ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-92-CONSUMED-LIVE.json";
    const archive = JSON.parse(await readFile(path, "utf8"));
    expect(auditModeRecords("consumed-live-archive-10-90", [archive])).toEqual({ authority: false, status: "gaps_found" });
    expect(PROOF_CHAIN_MODES["consumed-live-archive-10-90"].paths).toEqual([path]);
    expect(PROOF_CHAIN_MODES["consumed-live-archive"].paths).not.toContain(path);
  });

  it("retains 10-85 only through its explicit read-only historical audit", async () => {
    const path = ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-87-CONSUMED-LIVE.json";
    const archive = JSON.parse(await readFile(path, "utf8"));
    expect(auditModeRecords("consumed-live-archive-10-85", [archive])).toEqual({ authority: false, status: "gaps_found" });
    expect(PROOF_CHAIN_MODES["consumed-live-archive-10-85"].paths).toEqual([path]);
    expect(PROOF_CHAIN_MODES["consumed-live-archive"].paths).not.toContain(path);
  });

  it("retains 10-80 only through its explicit read-only historical audit", async () => {
    const path = ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-82-CONSUMED-LIVE.json";
    const archive = JSON.parse(await readFile(path, "utf8"));
    expect(auditModeRecords("consumed-live-archive-10-80", [archive])).toEqual({ authority: false, status: "gaps_found" });
    expect(PROOF_CHAIN_MODES["consumed-live-archive-10-80"].paths).toEqual([path]);
    expect(PROOF_CHAIN_MODES["consumed-live-archive"].paths).not.toContain(path);
  });

  it("retains 10-75 only through its explicit read-only historical audit", async () => {
    const path = ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-77-CONSUMED-LIVE.json";
    const archive = JSON.parse(await readFile(path, "utf8"));
    expect(auditModeRecords("consumed-live-archive-10-75", [archive])).toEqual({ authority: false, status: "gaps_found" });
    expect(PROOF_CHAIN_MODES["consumed-live-archive-10-75"].paths).toEqual([path]);
    expect(PROOF_CHAIN_MODES["consumed-live-archive"].paths).not.toContain(path);
  });

  it("retains 10-70 only through its explicit read-only historical audit", async () => {
    const path = ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-72-CONSUMED-LIVE.json";
    const archive = JSON.parse(await readFile(path, "utf8"));
    expect(auditModeRecords("consumed-live-archive-10-70", [archive])).toEqual({ authority: false, status: "gaps_found" });
    expect(PROOF_CHAIN_MODES["consumed-live-archive-10-70"].paths).toEqual([path]);
    expect(PROOF_CHAIN_MODES["consumed-live-archive"].paths).not.toContain(path);
  });

  it("retains 10-65 only through its explicit read-only historical audit", async () => {
    const path = ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-67-CONSUMED-LIVE.json";
    const archive = JSON.parse(await readFile(path, "utf8"));
    expect(auditModeRecords("consumed-live-archive-10-65", [archive])).toEqual({ authority: false, status: "gaps_found" });
    expect(PROOF_CHAIN_MODES["consumed-live-archive-10-65"].paths).toEqual([path]);
    expect(PROOF_CHAIN_MODES["consumed-live-archive"].paths).not.toContain(path);
  });

  it("retains 10-59 only through its explicit read-only historical audit", async () => {
    const path = ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-62-CONSUMED-LIVE.json";
    const archive = JSON.parse(await readFile(path, "utf8"));
    expect(auditModeRecords("consumed-live-archive-10-59", [archive])).toEqual({ authority: false, status: "gaps_found" });
    expect(PROOF_CHAIN_MODES["consumed-live-archive-10-59"].paths).toEqual([path]);
    expect(PROOF_CHAIN_MODES["consumed-live-archive"].paths).not.toContain(path);
  });

  it.each(["proof-committed-auto", "sync-authority-auto"])('%s refuses the immutable old 10-59 tuple', async (mode) => {
    const repoRoot = process.cwd();
    const root = await mkdtemp(join(tmpdir(), "evidencelens-585fd01-"));
    const oldPaths = [
      ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-53-FORENSIC.json",
      ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-57-SOURCE.json",
      ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-57-REVIEW.md",
      ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-57-SECURITY.md",
      ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-58-FINAL-BUILD.json",
      ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-59-TRANSITION.json",
      ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-59-EXECUTION.json",
      ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-59-PROOF.json",
      ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-59-LOCAL-VALIDATION.json",
    ];
    try {
      for (const path of oldPaths) {
        const bytes = execFileSync("git", ["show", `585fd01:${path}`], { cwd: repoRoot });
        await mkdir(join(root, path, ".."), { recursive: true });
        await writeFile(join(root, path), bytes, { mode: 0o600 });
      }
      execFileSync("git", ["init", "-q"], { cwd: root });
      execFileSync("git", ["config", "user.email", "fixture@example.invalid"], { cwd: root });
      execFileSync("git", ["config", "user.name", "Evidence Fixture"], { cwd: root });
      execFileSync("git", ["add", "."], { cwd: root });
      execFileSync("git", ["commit", "-qm", "materialize immutable 585fd01 tuple"], { cwd: root });
      expect(() => execFileSync(process.execPath, [join(repoRoot, "scripts/audit-proof-chain.mjs"), mode], {
        cwd: root, env: { ...process.env, EVIDENCELENS_DISABLE_PROVIDER: "1" }, stdio: "pipe",
      })).toThrow(/PROOF_CHAIN_COMMITTED/u);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("rejects a caller-selected external certifier before external effects", async () => {
    const repoRoot = process.cwd();
    const root = await mkdtemp(join(tmpdir(), "evidencelens-ready-registry-"));
    const checkout = join(root, "repo");
    const phasePath = ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e";
    const marker = join(root, "external-called");
    const replacements = [
      ["10-63-SOURCE.json", "10-167-SOURCE.json"], ["10-63-REVIEW.md", "10-167-REVIEW.md"],
      ["10-63-SECURITY.md", "10-167-SECURITY.md"], ["10-64-FINAL-BUILD.json", "10-168-FINAL-BUILD.json"],
      ["10-65-TRANSITION.json", "10-169-TRANSITION.json"], ["10-65-EXECUTION.json", "10-169-EXECUTION.json"],
      ["10-65-PROOF.json", "10-169-PROOF.json"], ["10-65-LOCAL-VALIDATION.json", "10-169-LOCAL-VALIDATION.json"],
    ];
    try {
      execFileSync("git", ["clone", "-q", "--no-hardlinks", repoRoot, checkout]);
      await copyFile(join(repoRoot, phasePath, "10-167-CONSUMED-LIVE.json"), join(checkout, phasePath, "10-167-CONSUMED-LIVE.json"));
      for (const [from, to] of replacements) await copyFile(join(checkout, phasePath, from), join(checkout, phasePath, to));
      execFileSync("git", ["config", "user.email", "fixture@example.invalid"], { cwd: checkout });
      execFileSync("git", ["config", "user.name", "Evidence Fixture"], { cwd: checkout });
      execFileSync("git", ["add", phasePath], { cwd: checkout });
      execFileSync("git", ["commit", "-qm", "materialize synthetic READY registry"], { cwd: checkout });
      for (const command of ["docker", "curl", "wget", "gh"]) {
        await writeFile(join(root, command), `#!/bin/sh\nprintf called >> '${marker}'\nexit 99\n`, { mode: 0o700 });
      }
      const result = spawnSync(process.execPath, [join(repoRoot, "scripts/audit-proof-chain.mjs"), "sync-authority-auto"], {
        cwd: checkout, encoding: "utf8", env: { ...process.env, EVIDENCELENS_DISABLE_PROVIDER: "1", PATH: `${root}:${process.env.PATH}` },
      });
      expect(result).toMatchObject({ status: 1, stdout: "", stderr: "PROOF_CHAIN_EXECUTED_CERTIFIER\n" });
      await expect(readFile(marker)).rejects.toMatchObject({ code: "ENOENT" });
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("audits the mutable current namespace without writes or external effects", async () => {
    const repoRoot = process.cwd();
    const root = await mkdtemp(join(tmpdir(), "evidencelens-current-reject-"));
    const checkout = join(root, "repo");
    const archive = join(root, "current.tar");
    const marker = join(root, "external-called");
    const watched = [
      ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-161-SYNC-CLAIM.json",
      ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-161-SYNC-JOURNAL.json",
      ".planning/phases/07-deepseek-vision-provenance-closure/07-VERIFICATION.md",
      ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-VERIFICATION.md",
      ".planning/REQUIREMENTS.md",
    ];
    const snapshot = () => Promise.all(watched.map(async (path) => readFile(join(checkout, path)).catch((error) => error?.code === "ENOENT" ? null : Promise.reject(error))));
    try {
      await mkdir(checkout);
      execFileSync("git", ["archive", "--format=tar", "-o", archive, "HEAD"], { cwd: repoRoot });
      execFileSync("tar", ["-xf", archive, "-C", checkout]);
      execFileSync("git", ["init", "-q"], { cwd: checkout });
      execFileSync("git", ["config", "user.email", "fixture@example.invalid"], { cwd: checkout });
      execFileSync("git", ["config", "user.name", "Evidence Fixture"], { cwd: checkout });
      execFileSync("git", ["add", "."], { cwd: checkout });
      execFileSync("git", ["commit", "-qm", "materialize current consumed tuple"], { cwd: checkout });
      for (const command of ["docker", "curl", "wget", "gh"]) {
        await writeFile(join(root, command), `#!/bin/sh\nprintf called >> '${marker}'\nexit 99\n`, { mode: 0o700 });
      }
      const before = await snapshot();
      const result = spawnSync(process.execPath, [join(repoRoot, "scripts/audit-proof-chain.mjs"), "sync-authority-auto"], {
        cwd: checkout, encoding: "utf8", env: { ...process.env, EVIDENCELENS_DISABLE_PROVIDER: "1", PATH: `${root}:${process.env.PATH}` },
      });
      if (result.status === 0) {
        expect(result.stderr).toBe("");
        expect(result.stdout).toMatch(/"cardinality":9/u);
      } else {
        expect(result.stdout).toBe("");
        expect([
          "PROOF_CHAIN_COMMITTED\n",
          "PROOF_CHAIN_IDENTITY\n",
          "PROOF_CHAIN_LOCAL_VALIDATION\n",
          "PROOF_CHAIN_RECEIPT\n",
        ]).toContain(result.stderr);
      }
      expect(await snapshot()).toEqual(before);
      await expect(readFile(marker)).rejects.toMatchObject({ code: "ENOENT" });
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("discriminates strict build-auto ready and terminal non-pass without mixed authority", () => {
    expect(auditBuildAuto(buildRecord)).toEqual({ branch: "ready", status: "ready" });
    const terminal = {
      ...identity,
      attempted_input_paths: PROOF_CHAIN_MODES["build-auto"].paths.slice(1), build_count: 0,
      diagnostic: { code: "input_invalid" }, generation: h("7"),
      input_sha256: { review: "unavailable", security: h("8"), source: h("9") },
      schema: "evidencelens.build-terminal.v1", status: "terminal_non_pass", verifier_build_count: 0,
    };
    expect(auditBuildAuto(terminal)).toEqual({ branch: "terminal_non_pass", status: "gaps_found" });
    for (const changed of [
      { ...terminal, image_id: `sha256:${h("1")}` },
      { ...terminal, status: "ready" },
      { ...terminal, attempted_input_paths: [...terminal.attempted_input_paths].reverse() },
      { ...terminal, build_count: 2 },
    ]) expect(() => auditBuildAuto(changed)).toThrow();
  });

  it("accepts only the exact consumed-generation forensic non-pass", () => {
    expect(auditConsumedGenerationForensic(forensicRecord)).toMatchObject({ reviewed_commit: forensicRecord.reviewed_commit });
    expect(auditModeRecords("forensic-consumed-generation", [forensicRecord])).toMatchObject({ reviewed_commit: forensicRecord.reviewed_commit });
    expect(() => auditModeRecords("forensic-consumed-generation", [])).toThrow("PROOF_CHAIN_ARGV");
    expect(() => auditModeRecords("forensic-consumed-generation", [forensicRecord, forensicRecord])).toThrow("PROOF_CHAIN_ARGV");
  });

  it.each([
    ["commit", { committed_state_commit: "0".repeat(40) }], ["path", { committed_state_path: "other" }],
    ["state hash", { committed_state_sha256: h("0") }], ["generation", { generation: h("0") }],
    ["sequence", { sequence: 3 }], ["previous hash", { previous_sha256: h("0") }],
    ["status", { status: "passed" }], ["encoding", { canonical_encoding: "utf-8" }],
    ["mode", { committed_state_mode: "0644" }], ["source", { reviewed_commit: "0".repeat(40) }],
    ["build", { build_sha256: h("0") }], ["fabricated receipt", { request_receipt: {} }],
  ])("rejects changed forensic %s", (_label, changed) => {
    expect(() => auditModeRecords("forensic-consumed-generation", [{ ...forensicRecord, ...changed }])).toThrow();
  });

  it("rejects changed forensic keys and schema", () => {
    const { result: _result, ...missing } = forensicRecord;
    expect(() => auditModeRecords("forensic-consumed-generation", [missing])).toThrow("PROOF_CHAIN_SCHEMA");
    expect(() => auditModeRecords("forensic-consumed-generation", [{ ...forensicRecord, unknown: true }])).toThrow("PROOF_CHAIN_SCHEMA");
    expect(() => auditModeRecords("forensic-consumed-generation", [{ ...forensicRecord, schema: "evidencelens.execution.v2" }])).toThrow();
  });

  it("requires owner-only canonical bytes for the forensic file", async () => {
    const root = await mkdtemp(join(tmpdir(), "evidencelens-forensic-"));
    const path = join(root, "FORENSIC.json");
    try {
      await writeFile(path, canonicalJson(forensicRecord), { mode: 0o600 });
      await expect(auditConsumedGenerationForensicFile(path)).resolves.toMatchObject({ status: "gaps_found" });
      await writeFile(path, `${canonicalJson(forensicRecord)}\n`, { mode: 0o600 });
      await expect(auditConsumedGenerationForensicFile(path)).rejects.toThrow("PROOF_CHAIN_FILE");
      await writeFile(path, canonicalJson(forensicRecord), { mode: 0o600 });
      await chmod(path, 0o644);
      await expect(auditConsumedGenerationForensicFile(path)).rejects.toThrow("PROOF_CHAIN_FILE");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("enforces mode-specific schema order and cardinality", () => {
    expect(auditModeRecords("build", [build, source, deep, asvs])).toMatchObject(identity);
    for (const records of [[source], [build, source, asvs, deep], [build, source, deep], [build, source, deep, asvs, asvs]]) {
      expect(() => auditModeRecords("build", records)).toThrow(/PROOF_CHAIN_(ARGV|SCHEMA|IDENTITY)/u);
    }
    expect(() => auditModeRecords("execution", [build, build, source, deep, asvs])).toThrow("PROOF_CHAIN_SCHEMA");
  });

  it("rejects the demonstrated SOURCE-as-build subprocess substitution", () => {
    expect(() => execFileSync(process.execPath, ["scripts/audit-proof-chain.mjs", "build", ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-34-SOURCE.json"], { stdio: "pipe" })).toThrow();
  });

  it.each([
    ["missing", ["build"]],
    ["extra", ["build", ...PROOF_CHAIN_MODES.build.paths, PROOF_CHAIN_MODES.build.paths[3]]],
    ["reordered", ["build", PROOF_CHAIN_MODES.build.paths[1], PROOF_CHAIN_MODES.build.paths[0], ...PROOF_CHAIN_MODES.build.paths.slice(2)]],
    ["duplicate", ["build", PROOF_CHAIN_MODES.build.paths[0], PROOF_CHAIN_MODES.build.paths[0], ...PROOF_CHAIN_MODES.build.paths.slice(2)]],
    ["removed draft mode", ["proof-preflight", ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-36-PROOF.json"]],
  ])("rejects %s CLI tuples before loading evidence", (_label, argv) => {
    expect(() => execFileSync(process.execPath, ["scripts/audit-proof-chain.mjs", ...argv], { stdio: "pipe" })).toThrow();
  });
  it.each([
    ["evidencelens.source.v2", "ready"], ["evidencelens.deep-review.v2", "ready"],
    ["evidencelens.asvs-review.v2", "ready"], ["evidencelens.build.v2", "ready"],
    ["evidencelens.diagnostic.v2", "passed"], ["evidencelens.repair.v2", "not_required"],
  ])("accepts the exact %s schema", (schema, status) => {
    expect(auditChainRecord({ ...identity, schema, status })).toMatchObject(identity);
  });

  const proof = (outcome: string, overrides = {}) => ({
    ...identity,
    build_sha256: h("1"), execution_sha256: h("2"), review_sha256: h("3"), security_sha256: h("4"), source_sha256: h("5"),
    clean_exit: outcome === "passed",
    finding_count: outcome === "passed" ? 1 : 0,
    fixture_count: outcome === "passed" ? 4 : 0,
    outcome,
    schema: "evidencelens.live-proof.v3",
    status: outcome === "passed" ? "passed" : "gaps_found",
    ...overrides,
  });

  it("accepts the exact chain-bound live proof format for success and terminal preflight failure", () => {
    expect(auditLiveProof(proof("passed"))).toMatchObject(identity);
    expect(auditLiveProof(proof("preflight_failed"))).toMatchObject(identity);
  });

  it("rejects the obsolete six-key proof and any unknown proof key", () => {
    expect(() => auditChainRecord({ ...identity, schema: "evidencelens.live-proof.v2", status: "passed" })).toThrow("PROOF_CHAIN_SCHEMA");
    expect(() => auditLiveProof(proof("preflight_failed", { max_provider_requests: 0 }))).toThrow("PROOF_CHAIN_SCHEMA");
  });

  it("rejects forged success counts and false PROV closure from a non-pass", () => {
    expect(() => auditLiveProof(proof("passed", { fixture_count: 3 }))).toThrow("PROOF_CHAIN_STATE");
    expect(() => auditLiveProof(proof("passed", { finding_count: 0 }))).toThrow("PROOF_CHAIN_STATE");
    expect(() => auditLiveProof(proof("preflight_failed", { status: "passed" }))).toThrow("PROOF_CHAIN_STATE");
    expect(() => auditLiveProof(proof("preflight_failed", { clean_exit: true, fixture_count: 4, finding_count: 1 }))).toThrow("PROOF_CHAIN_STATE");
    expect(() => auditLiveProof(proof("passed", { finish_reason: "length" }))).toThrow("PROOF_CHAIN_SCHEMA");
  });

  it("authenticates a real tools/call, adapter receipt, immutable build and observed lifecycle", () => {
    expect(auditModeRecords("execution", [executionRecord, buildRecord, source, deep, asvs])).toMatchObject(identity);
    expect(() => auditModeRecords("execution", [{ ...executionRecord, request_receipt: { ...receipt, mac: h("0") } }, buildRecord, source, deep, asvs])).toThrow("PROOF_CHAIN_RECEIPT");
    expect(() => auditModeRecords("execution", [{ ...executionRecord, mcp_tools_call_count: 0 }, buildRecord, source, deep, asvs])).toThrow("PROOF_CHAIN_RECEIPT");
    expect(() => auditModeRecords("execution", [{ ...executionRecord, close: { code: 0, observed: false, signal: null } }, buildRecord, source, deep, asvs])).toThrow("PROOF_CHAIN_EXECUTION");
    expect(() => auditModeRecords("execution", [executionRecord, { ...buildRecord, image_id: `sha256:${h("0")}` }, source, deep, asvs])).toThrow("PROOF_CHAIN_IDENTITY");
  });

  it("requires an exact diagnostic choice, empty repair set and canonical result bindings", () => {
    for (const forged of [
      { ...executionRecord, diagnostic: { code: "unknown", path: "transport" } },
      { ...executionRecord, repair_set: ["post-review-edit"] },
      { ...executionRecord, result_sha256: h("0") },
      { ...executionRecord, transcript_sha256: h("0") },
    ]) expect(() => auditModeRecords("execution", [forged, buildRecord, source, deep, asvs])).toThrow();
  });

  it("accepts consumed pre-fetch failure but never reports it as an observed send", () => {
    const failedReceipt = { ...receipt, observed_provider_requests: 0 };
    const failedTranscript = { ...transcript, close_code: 1, exit_code: 1 };
    const failed = {
      ...executionRecord, clean_exit: false, close: { code: 1, observed: true, signal: null }, diagnostic: { code: "pre_fetch", path: "transport.fetch" },
      exit: { code: 1, observed: true, signal: null }, finding_count: 0, fixture_count: 0, outcome: "request_failed",
      request_receipt: failedReceipt, request_receipt_sha256: digest(failedReceipt), result: null, result_sha256: null, status: "gaps_found",
      transcript: failedTranscript, transcript_sha256: digest(failedTranscript),
    };
    expect(auditModeRecords("execution", [failed, buildRecord, source, deep, asvs])).toMatchObject(identity);
    expect(() => auditModeRecords("execution", [{ ...failed, request_receipt: receipt, request_receipt_sha256: digest(receipt) }, buildRecord, source, deep, asvs])).toThrow("PROOF_CHAIN_EXECUTION");
  });

  it("accepts strict pre-tools failure only with an absent receipt and zero observed requests", () => {
    const preTools = {
      ...executionRecord, clean_exit: false, close: null, diagnostic: { code: "pre_fetch", path: "transport.fetch" }, exit: null,
      finding_count: 0, fixture_count: 0, mcp_tools_call_count: 0, model: "", outcome: "request_failed",
      request_receipt: null, request_receipt_sha256: null, result: null, result_sha256: null, status: "gaps_found",
      transcript: null, transcript_sha256: null,
    };
    expect(auditExecution(preTools)).toMatchObject(identity);
    for (const forged of [
      { ...preTools, request_receipt: { ...receipt, observed_provider_requests: 0 }, request_receipt_sha256: digest({ ...receipt, observed_provider_requests: 0 }) },
      { ...preTools, reservation_count: 0 },
      { ...preTools, mcp_tools_call_count: 1 },
      { ...preTools, outcome: "passed", status: "passed" },
    ]) expect(() => auditExecution(forged)).toThrow();
  });

  it("requires an authenticated receipt after tools/call for both pre-fetch and post-fetch outcomes", () => {
    const preFetchReceipt = { ...receipt, observed_provider_requests: 0 };
    const failedTranscript = { ...transcript, close_code: 1, exit_code: 1 };
    const base = {
      ...executionRecord, clean_exit: false, close: { code: 1, observed: true, signal: null }, diagnostic: { code: "pre_fetch", path: "transport.fetch" },
      exit: { code: 1, observed: true, signal: null }, finding_count: 0, fixture_count: 0, outcome: "request_failed",
      request_receipt: preFetchReceipt, request_receipt_sha256: digest(preFetchReceipt), result: null, result_sha256: null, status: "gaps_found",
      transcript: failedTranscript, transcript_sha256: digest(failedTranscript),
    };
    expect(auditExecution(base)).toMatchObject(identity);
    const postFetch = { ...base, diagnostic: { code: "request", path: "transport.fetch" }, request_receipt: receipt, request_receipt_sha256: digest(receipt) };
    expect(auditExecution(postFetch)).toMatchObject(identity);
    for (const forged of [
      { ...base, request_receipt: null, request_receipt_sha256: null },
      { ...postFetch, request_receipt: { ...receipt, mac: h("0") } },
      { ...postFetch, request_receipt_sha256: h("0") },
      { ...executionRecord, request_receipt: null, request_receipt_sha256: null },
    ]) expect(() => auditExecution(forged)).toThrow("PROOF_CHAIN_RECEIPT");
  });

  it("binds terminal proof to exact tuple digests and rejects self-asserted legacy proof", () => {
    expect(auditModeRecords("proof", [boundProof, executionRecord, buildRecord, source, deep, asvs])).toMatchObject(identity);
    expect(() => auditModeRecords("proof", [{ ...boundProof, execution_sha256: h("0") }, executionRecord, buildRecord, source, deep, asvs])).toThrow("PROOF_CHAIN_IDENTITY");
    expect(() => auditModeRecords("proof", [{ ...identity, clean_exit: true, finding_count: 2, fixture_count: 4, outcome: "passed", schema: "evidencelens.live-proof.v2", status: "passed" }, executionRecord, buildRecord, source, deep, asvs])).toThrow("PROOF_CHAIN_SCHEMA");
  });

  it("binds source and both reviews to identical certifier and source identities", () => {
    const source = { ...identity, schema: "evidencelens.source.v2", status: "ready" };
    const deep = { ...identity, schema: "evidencelens.deep-review.v2", status: "ready" };
    const asvs = { ...identity, schema: "evidencelens.asvs-review.v2", status: "ready" };
    expect(auditSourceAndReports(source, deep, asvs)).toEqual(identity);
  });

  it.each(["self_sha256", "envelope_hash", "report_commit", "unknown"])("rejects forbidden or unknown field %s", (key) => {
    expect(() => auditChainRecord({ ...identity, schema: "evidencelens.source.v2", status: "ready", [key]: h("f") })).toThrow("PROOF_CHAIN_SCHEMA");
  });

  it("rejects certifier drift and contradictory readiness", () => {
    const source = { ...identity, schema: "evidencelens.source.v2", status: "ready" };
    expect(() => auditSourceAndReports(source, { ...identity, certifier_sha256: { ...certifiers, audit_proof_chain_sha256: h("0") }, schema: "evidencelens.deep-review.v2", status: "ready" }, { ...identity, schema: "evidencelens.asvs-review.v2", status: "ready" })).toThrow("PROOF_CHAIN_IDENTITY");
    expect(() => auditChainRecord({ ...identity, schema: "evidencelens.deep-review.v2", status: "blocked" })).toThrow("PROOF_CHAIN_STATE");
  });

  it("accepts the exclusive four-record no-repair route", () => {
    const diagnostic = { ...identity, schema: "evidencelens.diagnostic.v2", status: "blocked_by_build" };
    const repairs = Array.from({ length: 4 }, () => ({ ...identity, schema: "evidencelens.repair.v2", status: "not_required" }));
    expect(auditRepairSet(diagnostic, repairs)).toEqual({ production_correction: false, source_identity: identity });
  });

  it("accepts exactly one authenticated production correction for a repairable diagnostic", () => {
    const diagnostic = { ...identity, schema: "evidencelens.diagnostic.v2", status: "protocol_failed" };
    const repairs = Array.from({ length: 4 }, (_, index) => ({
      ...identity,
      schema: "evidencelens.repair.v2",
      status: index === 2 ? "ready" : "not_required",
    }));
    expect(auditRepairSet(diagnostic, repairs)).toEqual({ production_correction: true, source_identity: identity });
  });

  it.each([
    ["missing", 3, undefined],
    ["extra", 5, undefined],
    ["multiple corrections", 4, [0, 1]],
  ])("rejects a %s repair set", (_label, count, readyIndexes) => {
    const diagnostic = { ...identity, schema: "evidencelens.diagnostic.v2", status: "protocol_failed" };
    const ready = new Set(readyIndexes ?? []);
    const repairs = Array.from({ length: count }, (_, index) => ({
      ...identity,
      schema: "evidencelens.repair.v2",
      status: ready.has(index) ? "ready" : "not_required",
    }));
    expect(() => auditRepairSet(diagnostic, repairs)).toThrow("PROOF_CHAIN_REPAIR_SET");
  });

  it("rejects mixed schemas, unknown state, identity tampering, and a correction on the no-repair route", () => {
    const diagnostic = { ...identity, schema: "evidencelens.diagnostic.v2", status: "blocked_by_build" };
    const valid = Array.from({ length: 4 }, () => ({ ...identity, schema: "evidencelens.repair.v2", status: "not_required" }));
    expect(() => auditRepairSet(diagnostic, valid.map((entry, index) => index === 1 ? { ...entry, schema: "evidencelens.source.v2", status: "ready" } : entry))).toThrow("PROOF_CHAIN_REPAIR_SET");
    expect(() => auditRepairSet(diagnostic, valid.map((entry, index) => index === 1 ? { ...entry, status: "unknown" } : entry))).toThrow("PROOF_CHAIN_STATE");
    expect(() => auditRepairSet(diagnostic, valid.map((entry, index) => index === 1 ? { ...entry, manifest_sha256: h("f") } : entry))).toThrow("PROOF_CHAIN_IDENTITY");
    expect(() => auditRepairSet(diagnostic, valid.map((entry, index) => index === 1 ? { ...entry, status: "ready" } : entry))).toThrow("PROOF_CHAIN_REPAIR_SET");
  });
});
