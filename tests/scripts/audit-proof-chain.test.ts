import { describe, expect, it } from "vitest";
import { auditChainRecord, auditSourceAndReports } from "../../scripts/audit-proof-chain.mjs";

const h = (c: string) => c.repeat(64);
const certifiers = { audit_live_evidence_sha256: h("a"), audit_proof_chain_sha256: h("b") };
const identity = { certifier_sha256: certifiers, manifest_sha256: h("c"), non_planning_tree: h("d"), reviewed_commit: "e".repeat(40) };

describe("proof chain certifier", () => {
  it.each([
    ["evidencelens.source.v2", "ready"], ["evidencelens.deep-review.v2", "ready"],
    ["evidencelens.asvs-review.v2", "ready"], ["evidencelens.build.v2", "ready"],
    ["evidencelens.diagnostic.v2", "passed"], ["evidencelens.repair.v2", "not_required"],
    ["evidencelens.live-proof.v2", "passed"],
  ])("accepts the exact %s schema", (schema, status) => {
    expect(auditChainRecord({ ...identity, schema, status })).toMatchObject(identity);
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
});
