import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { auditChainRecord, auditLiveProof, auditModeRecords, auditRepairSet, auditSourceAndReports, PROOF_CHAIN_MODES } from "../../scripts/audit-proof-chain.mjs";

const h = (c: string) => c.repeat(64);
const certifiers = { audit_live_evidence_sha256: h("a"), audit_proof_chain_sha256: h("b") };
const identity = { certifier_sha256: certifiers, manifest_sha256: h("c"), non_planning_tree: h("d"), reviewed_commit: "e".repeat(40) };

describe("proof chain certifier", () => {
  const source = { ...identity, schema: "evidencelens.source.v2", status: "ready" };
  const deep = { ...identity, schema: "evidencelens.deep-review.v2", status: "ready" };
  const asvs = { ...identity, schema: "evidencelens.asvs-review.v2", status: "ready" };
  const build = { ...identity, schema: "evidencelens.build.v2", status: "ready" };
  const execution = { ...identity, schema: "evidencelens.diagnostic.v2", status: "passed" };

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
    expect(() => auditModeRecords("execution", [build, source, deep, asvs])).toThrow("PROOF_CHAIN_SCHEMA");
  });

  it("rejects the demonstrated SOURCE-as-build subprocess substitution", () => {
    expect(() => execFileSync(process.execPath, ["scripts/audit-proof-chain.mjs", "build", ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e/10-34-SOURCE.json"], { stdio: "pipe" })).toThrow();
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
