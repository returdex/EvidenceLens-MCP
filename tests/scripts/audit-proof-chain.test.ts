import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { auditChainRecord, auditLiveProof, auditModeRecords, auditRepairSet, auditSourceAndReports, PROOF_CHAIN_MODES } from "../../scripts/audit-proof-chain.mjs";

const h = (c: string) => c.repeat(64);
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
const executionRecord = {
  ...identity, argv: ["docker", "compose", "--profile", "review", "run", "--rm", "-T", "review"],
  build_generation: buildRecord.generation, clean_exit: true, close: { code: 0, observed: true, signal: null },
  diagnostic: null, environment: { profile: "review", provider_disabled: false }, execution_generation: receipt.generation,
  exit: { code: 0, observed: true, signal: null }, finding_count: 2, fixture_count: 4, image_id: buildRecord.image_id,
  mcp_tools_call_count: 1, model: "deepseek-chat", outcome: "passed", provider: "deepseek", repair_set: [],
  request_receipt: receipt, reservation_count: 1, result_sha256: h("2"), schema: "evidencelens.execution.v2",
  status: "passed", transcript_sha256: h("3"),
};
const proofRecord = {
  ...identity, build_sha256: h("4"), clean_exit: true, execution_sha256: h("5"), finding_count: 2,
  fixture_count: 4, outcome: "passed", review_sha256: h("6"), schema: "evidencelens.live-proof.v3",
  security_sha256: h("7"), source_sha256: h("8"), status: "passed",
};

describe("proof chain certifier", () => {
  const source = { ...identity, schema: "evidencelens.source.v2", status: "ready" };
  const deep = { ...identity, schema: "evidencelens.deep-review.v2", status: "ready" };
  const asvs = { ...identity, schema: "evidencelens.asvs-review.v2", status: "ready" };
  const build = buildRecord;
  const execution = executionRecord;

  it("publishes a frozen exact registry without draft modes", () => {
    expect(Object.isFrozen(PROOF_CHAIN_MODES)).toBe(true);
    expect(Object.keys(PROOF_CHAIN_MODES)).toEqual(["source-review", "reviews", "build", "diagnostic", "repair", "repair-set", "execution", "proof", "sync-authority"]);
    expect(PROOF_CHAIN_MODES.build.schemas).toEqual(["evidencelens.build.v2", "evidencelens.source.v2", "evidencelens.deep-review.v2", "evidencelens.asvs-review.v2"]);
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
    clean_exit: outcome === "passed",
    finding_count: outcome === "passed" ? 1 : 0,
    fixture_count: outcome === "passed" ? 4 : 0,
    outcome,
    schema: "evidencelens.live-proof.v2",
    status: outcome === "passed" ? "passed" : "gaps_found",
    ...overrides,
  });

  it("accepts the sole exact ten-key live proof format for success and terminal preflight failure", () => {
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
  });

  it("authenticates a real tools/call, adapter receipt, immutable build and observed lifecycle", () => {
    expect(auditModeRecords("execution", [executionRecord, buildRecord, source, deep, asvs])).toMatchObject(identity);
    expect(() => auditModeRecords("execution", [{ ...executionRecord, request_receipt: { ...receipt, mac: h("0") } }, buildRecord, source, deep, asvs])).toThrow("PROOF_CHAIN_RECEIPT");
    expect(() => auditModeRecords("execution", [{ ...executionRecord, mcp_tools_call_count: 0 }, buildRecord, source, deep, asvs])).toThrow("PROOF_CHAIN_EXECUTION");
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
    const failed = {
      ...executionRecord, clean_exit: false, close: { code: 1, observed: true, signal: null }, diagnostic: { code: "pre_fetch", path: "transport.fetch" },
      exit: { code: 1, observed: true, signal: null }, finding_count: 0, fixture_count: 0, outcome: "request_failed",
      request_receipt: { ...receipt, observed_provider_requests: 0 }, result_sha256: null, status: "gaps_found",
    };
    expect(auditModeRecords("execution", [failed, buildRecord, source, deep, asvs])).toMatchObject(identity);
    expect(() => auditModeRecords("execution", [{ ...failed, request_receipt: receipt }, buildRecord, source, deep, asvs])).toThrow("PROOF_CHAIN_EXECUTION");
  });

  it("binds terminal proof to exact tuple digests and rejects self-asserted legacy proof", () => {
    expect(() => auditModeRecords("proof", [proofRecord, executionRecord, buildRecord, source, deep, asvs])).toThrow("PROOF_CHAIN_IDENTITY");
    expect(() => auditModeRecords("proof", [proof("passed"), executionRecord, buildRecord, source, deep, asvs])).toThrow("PROOF_CHAIN_SCHEMA");
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
