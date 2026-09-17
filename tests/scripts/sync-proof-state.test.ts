import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { canonicalJson } from "../../scripts/audit-live-readiness.mjs";
import { FIXED_SYNC_PATHS, recoverProofSynchronization, synchronizeProofState } from "../../scripts/sync-proof-state.mjs";

const h = (c: string) => c.repeat(64);
const requirements = (complete: boolean) => `- [${complete ? "x" : " "}] **PROV-01**: requirement\n| PROV-01 | Phase 10 | ${complete ? "Complete" : "Gap: credentialed Docker MCP proof"} |\n`;
const phase = (n: number, status = "gaps_found") => `---\nphase: ${n}\nstatus: ${status}\n---\n\nstatus: retained-evidence-status\n`;
const proof = (passed: boolean) => ({ build_sha256: h("1"), certifier_sha256: { audit_live_evidence_sha256: h("a"), audit_proof_chain_sha256: h("b") }, clean_exit: passed, execution_sha256: h("2"), finding_count: passed ? 1 : 0, fixture_count: passed ? 4 : 0, manifest_sha256: h("c"), non_planning_tree: h("d"), outcome: passed ? "passed" : "timeout", review_sha256: h("3"), reviewed_commit: "e".repeat(40), schema: "evidencelens.live-proof.v3", security_sha256: h("4"), source_sha256: h("5"), status: passed ? "passed" : "gaps_found" });

async function fixture(passed = true) {
  const root = await mkdtemp(join(tmpdir(), "proof-sync-")); await chmod(root, 0o700);
  const authorityPaths = Array.from({ length: 6 }, (_, index) => join(root, `authority-${index}.json`));
  const paths = { authorityPaths, claimPath: join(root, "claim.json"), journalPath: join(root, "journal.json"), proofPath: authorityPaths[0], phase7Path: join(root, "07.md"), phase10Path: join(root, "10.md"), requirementsPath: join(root, "requirements.md") };
  await writeFile(paths.proofPath, canonicalJson(proof(passed)), { mode: 0o600 });
  for (const path of authorityPaths.slice(1)) await writeFile(path, canonicalJson({ path }), { mode: 0o600 });
  await writeFile(paths.phase7Path, phase(7)); await writeFile(paths.phase10Path, phase(10)); await writeFile(paths.requirementsPath, requirements(false));
  return paths;
}

const authority = vi.fn(async () => undefined);
const options = (extra = {}) => ({ ...extra, authorityValidator: authority });

describe("sealed proof state synchronization", () => {
  it("uses fixed 10-146 outputs and includes the 10-145 LOCAL_VALIDATION", () => {
    expect(FIXED_SYNC_PATHS.claim).toMatch(/10-146-SYNC-CLAIM\.json$/u);
    expect(FIXED_SYNC_PATHS.journal).toMatch(/10-146-SYNC-JOURNAL\.json$/u);
    expect(FIXED_SYNC_PATHS.localValidation).toMatch(/10-145-LOCAL-VALIDATION\.json$/u);
    expect(FIXED_SYNC_PATHS.forensic).toMatch(/10-142-CONSUMED-LIVE\.json$/u);
  });

  it("permits a five-member authority only for gaps_found and tags its claim distinctly", async () => {
    const paths = await fixture(false);
    const root = join(paths.claimPath, "..");
    const members = Array.from({ length: 5 }, (_, index) => join(root, `preflight-${index}.json`));
    paths.authorityPaths = members; paths.proofPath = members[3];
    for (const [index, path] of members.entries()) await writeFile(path, canonicalJson(index === 3 ? proof(false) : { index }), { mode: 0o600 });
    await synchronizeProofState(paths, options());
    expect(JSON.parse(await readFile(paths.claimPath, "utf8")).schema).toBe("evidencelens.preflight-sync-claim.v1");

    const rejected = await fixture(true);
    const rejectedRoot = join(rejected.claimPath, "..");
    const rejectedMembers = Array.from({ length: 5 }, (_, index) => join(rejectedRoot, `preflight-${index}.json`));
    rejected.authorityPaths = rejectedMembers; rejected.proofPath = rejectedMembers[3];
    for (const [index, path] of rejectedMembers.entries()) await writeFile(path, canonicalJson(index === 3 ? proof(true) : { index }), { mode: 0o600 });
    await expect(synchronizeProofState(rejected, options())).rejects.toThrow("PROOF_SYNC_AUTHORITY");
  });

  it("binds every ordered member of a nine-member live tuple", async () => {
    const paths = await fixture(true); const root = join(paths.claimPath, "..");
    const members = Array.from({ length: 9 }, (_, index) => join(root, `live-${index}.json`));
    paths.authorityPaths = members; paths.proofPath = members[7];
    for (const [index, path] of members.entries()) await writeFile(path, canonicalJson(index === 7 ? proof(true) : { index }), { mode: 0o600 });
    await synchronizeProofState(paths, options());
    const claim = JSON.parse(await readFile(paths.claimPath, "utf8"));
    expect(claim.schema).toBe("evidencelens.live-sync-claim.v1");
    expect(Object.keys(claim.tuple_sha256).sort()).toEqual(["build", "execution", "forensic", "local_validation", "proof", "review", "security", "source", "transition"]);
  });

  it.each(["after-claim", "before-phase7", "after-phase7", "before-phase10", "after-phase10", "before-requirements", "after-requirements"])("recovers interruption at %s idempotently", async (interruptAt) => {
    const paths = await fixture(true);
    await expect(synchronizeProofState(paths, options({ interruptAt }))).rejects.toThrow("PROOF_SYNC_INTERRUPTED");
    const counters = { docker: 0, credential: 0, provider: 0, spawn: 0 };
    await recoverProofSynchronization(paths, counters, options());
    expect(await readFile(paths.phase7Path, "utf8")).toContain("status: passed");
    expect(await readFile(paths.phase10Path, "utf8")).toContain("status: passed");
    expect(await readFile(paths.requirementsPath, "utf8")).toContain("[x] **PROV-01**");
    const stable = await Promise.all([paths.phase7Path, paths.phase10Path, paths.requirementsPath].map((p) => readFile(p, "utf8")));
    await recoverProofSynchronization(paths, counters, options());
    expect(await Promise.all([paths.phase7Path, paths.phase10Path, paths.requirementsPath].map((p) => readFile(p, "utf8")))).toEqual(stable);
    expect(counters).toEqual({ docker: 0, credential: 0, provider: 0, spawn: 0 });
  });

  it("keeps every non-pass in mutually consistent gap state", async () => {
    const paths = await fixture(false); await synchronizeProofState(paths, options());
    expect(await readFile(paths.phase7Path, "utf8")).toContain("status: gaps_found");
    expect(await readFile(paths.phase10Path, "utf8")).toContain("status: gaps_found");
    expect(await readFile(paths.requirementsPath, "utf8")).toContain("[ ] **PROV-01**");
  });

  it("fails closed on sealed proof tampering and stale targets", async () => {
    const paths = await fixture(true); await expect(synchronizeProofState(paths, options({ interruptAt: "after-claim" }))).rejects.toThrow();
    await writeFile(paths.proofPath, canonicalJson({ ...proof(true), finding_count: 2 }), { mode: 0o600 });
    await expect(recoverProofSynchronization(paths, undefined, options())).rejects.toThrow("PROOF_SYNC_TAMPERED");
    const stale = await fixture(true); await expect(synchronizeProofState(stale, options({ interruptAt: "after-claim" }))).rejects.toThrow();
    await writeFile(stale.phase7Path, "stale\n");
    await expect(recoverProofSynchronization(stale, undefined, options())).rejects.toThrow("PROOF_SYNC_STALE");
  });

  it("authenticates and binds every tuple member before creating a claim", async () => {
    authority.mockClear();
    const paths = await fixture(true);
    await expect(synchronizeProofState(paths, options({ interruptAt: "after-claim" }))).rejects.toThrow("PROOF_SYNC_INTERRUPTED");
    expect(authority).toHaveBeenCalledWith(paths.authorityPaths);
    const claim = JSON.parse(await readFile(paths.claimPath, "utf8"));
    expect(Object.keys(claim.tuple_sha256)).toEqual(["build", "execution", "proof", "review", "security", "source"]);
    expect(Object.values(claim.tuple_sha256)).toHaveLength(6);
  });

  it("rejects a standalone owner-only proof before creating claim or journal", async () => {
    const paths = await fixture(true);
    delete (paths as { authorityPaths?: string[] }).authorityPaths;
    await expect(synchronizeProofState(paths)).rejects.toThrow("PROOF_SYNC_AUTHORITY");
    await expect(readFile(paths.claimPath)).rejects.toThrow();
    await expect(readFile(paths.journalPath)).rejects.toThrow();
  });

  it("rejects changed tuple members and changed certifier authority during recovery", async () => {
    const paths = await fixture(true);
    await expect(synchronizeProofState(paths, options({ interruptAt: "after-claim" }))).rejects.toThrow("PROOF_SYNC_INTERRUPTED");
    await writeFile(paths.authorityPaths[1], canonicalJson({ changed: true }), { mode: 0o600 });
    await expect(recoverProofSynchronization(paths, undefined, options())).rejects.toThrow("PROOF_SYNC_TAMPERED");

    const rejected = await fixture(true);
    const rejectingValidator = vi.fn(async () => { throw new Error("changed certifier"); });
    await expect(synchronizeProofState(rejected, { authorityValidator: rejectingValidator })).rejects.toThrow("PROOF_SYNC_AUTHORITY");
    await expect(readFile(rejected.claimPath)).rejects.toThrow();
  });
});
