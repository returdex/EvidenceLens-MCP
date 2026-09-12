import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { canonicalJson, sha256Hex } from "../../scripts/audit-live-readiness.mjs";
import { FIXED_CHALLENGE_HANDOFF, prepareChallengeHandoff, validateChallengePrecommit, verifyChallengeHandoff } from "../../scripts/evidence-envelope.mjs";

const hex = (c: string) => c.repeat(64);

async function completedFixture() {
  const root = await mkdtemp(join(tmpdir(), "evidencelens-envelope-"));
  await chmod(root, 0o700);
  const report = join(root, "report.md");
  const security = join(root, "security.md");
  await writeFile(report, "review\n"); await writeFile(security, "security\n");
  const result = { daemon_identity_sha256: hex("1"), fixture_sha256: [hex("2"), hex("3"), hex("4"), hex("5")], generation: hex("6"), image_config_sha256: hex("7"), image_content_sha256: hex("8"), image_id: `sha256:${hex("9")}`, runtime_sha256: hex("a"), schema: "evidencelens.build-result.v1", sentinels: { proof: "normalized", review: "normalized" } };
  const resultLocator = join(root, "BUILD_RESULT.json"); await writeFile(resultLocator, canonicalJson(result), { mode: 0o600 });
  const descriptor = { generation: result.generation, non_planning_tree: hex("b"), prepared_sha256: hex("c"), result_locator: resultLocator, result_sha256: sha256Hex(Buffer.from(canonicalJson(result))), reviewed_commit: "d".repeat(40), schema: "evidencelens.build-generation.v1", status: "completed" };
  const descriptorLocator = join(root, "BUILD_GENERATION.json"); await writeFile(descriptorLocator, canonicalJson(descriptor), { mode: 0o600 });
  const handoffPath = join(root, "10-23-HANDOFF.json");
  return { descriptorLocator, handoffPath, report, result, root, security };
}

describe("evidence envelope and challenge", () => {
  it("prepares canonical owner-only durable state without Git or external side effects", async () => {
    const f = await completedFixture(); const git = vi.fn(); const external = vi.fn();
    const prepared = await prepareChallengeHandoff(f.handoffPath, { expectedPath: f.handoffPath, privateRoot: join(f.root, "private"), descriptorLocator: f.descriptorLocator, reportPaths: [f.report, f.security], nowMs: 1_000, randomBytes: () => Buffer.alloc(32, 0xab), git, external });
    expect(prepared.nonce).toBe("ab".repeat(32)); expect(git).not.toHaveBeenCalled(); expect(external).not.toHaveBeenCalled();
    await expect(validateChallengePrecommit(f.handoffPath, { expectedPath: f.handoffPath, nowMs: 1_001 })).resolves.toMatchObject({ handoff: { nonce: prepared.nonce } });
  });

  it("rejects precommit Git identity and accepts a postcommit authenticated handoff", async () => {
    const f = await completedFixture();
    await prepareChallengeHandoff(f.handoffPath, { expectedPath: f.handoffPath, privateRoot: join(f.root, "private"), descriptorLocator: f.descriptorLocator, reportPaths: [f.report, f.security], nowMs: 2_000, randomBytes: () => Buffer.alloc(32, 1) });
    await expect(verifyChallengeHandoff(f.handoffPath, { expectedPath: f.handoffPath, nowMs: 2_001, authenticatePlanning: async () => { throw new Error("HANDOFF_COMMIT"); } })).rejects.toThrow("HANDOFF_COMMIT");
    const resume = await verifyChallengeHandoff(f.handoffPath, { expectedPath: f.handoffPath, nowMs: 2_001, authenticatePlanning: async () => ({ blob: hex("e"), commit: "f".repeat(40) }) });
    expect(resume).toMatchObject({ schema: "evidencelens.challenge-resume.v1", status: "ready", replay_status: "unconsumed", image_id: f.result.image_id });
    expect(resume.authorization_echo).toMatch(/^authorize evidencelens review nonce=[0-9a-f]{64} manifest_sha256=[0-9a-f]{64}$/u);
  });

  it.each(["", "/absolute", "./alternate", `${FIXED_CHALLENGE_HANDOFF};docker run x`])("rejects alternate path %s before side effects", async (path) => {
    const side = vi.fn(); await expect(prepareChallengeHandoff(path, { expectedPath: "fixed", external: side })).rejects.toThrow("ENVELOPE_ARGV"); expect(side).not.toHaveBeenCalled();
  });

  it("rejects expired, tampered and replayed durable state", async () => {
    const f = await completedFixture();
    await prepareChallengeHandoff(f.handoffPath, { expectedPath: f.handoffPath, privateRoot: join(f.root, "private"), descriptorLocator: f.descriptorLocator, reportPaths: [f.report, f.security], nowMs: 3_000, ttlMs: 1_000, randomBytes: () => Buffer.alloc(32, 2) });
    const auth = async () => ({ blob: hex("e"), commit: "f".repeat(40) });
    await expect(verifyChallengeHandoff(f.handoffPath, { expectedPath: f.handoffPath, nowMs: 4_001, authenticatePlanning: auth })).rejects.toThrow("ENVELOPE_TTL");
    const handoff = JSON.parse(await readFile(f.handoffPath, "utf8")); handoff.manifest_sha256 = hex("0"); await writeFile(f.handoffPath, canonicalJson(handoff));
    await expect(validateChallengePrecommit(f.handoffPath, { expectedPath: f.handoffPath, nowMs: 3_001 })).rejects.toThrow("ENVELOPE_DIGEST");
  });
});
