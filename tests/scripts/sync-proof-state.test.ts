import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { canonicalJson } from "../../scripts/audit-live-readiness.mjs";
import { recoverProofSynchronization, synchronizeProofState } from "../../scripts/sync-proof-state.mjs";

const h = (c: string) => c.repeat(64);
const requirements = (complete: boolean) => `- [${complete ? "x" : " "}] **PROV-01**: requirement\n| PROV-01 | Phase 10 | ${complete ? "Complete" : "Gap: credentialed Docker MCP proof"} |\n`;
const phase = (n: number, status = "gaps_found") => `---\nphase: ${n}\nstatus: ${status}\n---\n\nstatus: retained-evidence-status\n`;
const proof = (passed: boolean) => ({ certifier_sha256: { audit_live_evidence_sha256: h("a"), audit_proof_chain_sha256: h("b") }, clean_exit: passed, finding_count: passed ? 1 : 0, fixture_count: passed ? 4 : 0, manifest_sha256: h("c"), non_planning_tree: h("d"), outcome: passed ? "passed" : "timeout", reviewed_commit: "e".repeat(40), schema: "evidencelens.live-proof.v2", status: passed ? "passed" : "gaps_found" });

async function fixture(passed = true) {
  const root = await mkdtemp(join(tmpdir(), "proof-sync-")); await chmod(root, 0o700);
  const paths = { claimPath: join(root, "claim.json"), journalPath: join(root, "journal.json"), proofPath: join(root, "proof.json"), phase7Path: join(root, "07.md"), phase10Path: join(root, "10.md"), requirementsPath: join(root, "requirements.md") };
  await writeFile(paths.proofPath, canonicalJson(proof(passed)), { mode: 0o600 });
  await writeFile(paths.phase7Path, phase(7)); await writeFile(paths.phase10Path, phase(10)); await writeFile(paths.requirementsPath, requirements(false));
  return paths;
}

describe("sealed proof state synchronization", () => {
  it.each(["after-claim", "before-phase7", "after-phase7", "before-phase10", "after-phase10", "before-requirements", "after-requirements"])("recovers interruption at %s idempotently", async (interruptAt) => {
    const paths = await fixture(true);
    await expect(synchronizeProofState(paths, { interruptAt })).rejects.toThrow("PROOF_SYNC_INTERRUPTED");
    const counters = { docker: 0, credential: 0, provider: 0, spawn: 0 };
    await recoverProofSynchronization(paths, counters);
    expect(await readFile(paths.phase7Path, "utf8")).toContain("status: passed");
    expect(await readFile(paths.phase10Path, "utf8")).toContain("status: passed");
    expect(await readFile(paths.requirementsPath, "utf8")).toContain("[x] **PROV-01**");
    const stable = await Promise.all([paths.phase7Path, paths.phase10Path, paths.requirementsPath].map((p) => readFile(p, "utf8")));
    await recoverProofSynchronization(paths, counters);
    expect(await Promise.all([paths.phase7Path, paths.phase10Path, paths.requirementsPath].map((p) => readFile(p, "utf8")))).toEqual(stable);
    expect(counters).toEqual({ docker: 0, credential: 0, provider: 0, spawn: 0 });
  });

  it("keeps every non-pass in mutually consistent gap state", async () => {
    const paths = await fixture(false); await synchronizeProofState(paths);
    expect(await readFile(paths.phase7Path, "utf8")).toContain("status: gaps_found");
    expect(await readFile(paths.phase10Path, "utf8")).toContain("status: gaps_found");
    expect(await readFile(paths.requirementsPath, "utf8")).toContain("[ ] **PROV-01**");
  });

  it("fails closed on sealed proof tampering and stale targets", async () => {
    const paths = await fixture(true); await expect(synchronizeProofState(paths, { interruptAt: "after-claim" })).rejects.toThrow();
    await writeFile(paths.proofPath, canonicalJson({ ...proof(true), finding_count: 2 }), { mode: 0o600 });
    await expect(recoverProofSynchronization(paths)).rejects.toThrow("PROOF_SYNC_TAMPERED");
    const stale = await fixture(true); await expect(synchronizeProofState(stale, { interruptAt: "after-claim" })).rejects.toThrow();
    await writeFile(stale.phase7Path, "stale\n");
    await expect(recoverProofSynchronization(stale)).rejects.toThrow("PROOF_SYNC_STALE");
  });
});
