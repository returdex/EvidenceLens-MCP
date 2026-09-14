import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import {
  AUTOMATIC_BUILD_CONTROLS,
  AUTOMATIC_LIVE_CONTROLS,
  claimExclusive,
  runAutomaticBuild,
  runFixedAutomaticBuild,
  runFixedAutomaticLive,
  validateFixedInvocation,
} from "../../scripts/automatic-live-review.mjs";
import { canonicalJson } from "../../scripts/audit-live-readiness.mjs";

describe("automatic immutable review runner", () => {
  it("accepts only the two literal package entrypoints", () => {
    expect(validateFixedInvocation(["auto-build"])).toBe("auto-build");
    expect(validateFixedInvocation(["auto-live-once"])).toBe("auto-live-once");
    for (const argv of [[], ["auto-build", "elsewhere"], ["./auto-build"], ["auto-live-once;docker", "build"]]) {
      expect(() => validateFixedInvocation(argv)).toThrow("AUTOMATIC_ARGV");
    }
  });

  it("claims before one authenticated build and verifies without building", async () => {
    const order: string[] = [];
    const result = await runAutomaticBuild({
      authenticate: vi.fn(async () => order.push("authenticate")),
      claim: vi.fn(async () => order.push("claim")),
      buildOnce: vi.fn(async () => { order.push("build"); return { image_id: `sha256:${"a".repeat(64)}` }; }),
      verifyExisting: vi.fn(async (value) => { order.push("verify"); return value; }),
    });
    expect(order).toEqual(["authenticate", "claim", "build", "verify"]);
    expect(result).toMatchObject({ image_id: `sha256:${"a".repeat(64)}` });
    expect(AUTOMATIC_BUILD_CONTROLS).toEqual({ build_count: 1, verifier_build_count: 0 });
  });

  it("binds live execution to the authenticated production harness without a spawnOnce authority", async () => {
    const source = await readFile("scripts/automatic-live-review.mjs", "utf8");
    expect(source).toContain('import { runReviewHarness } from "./docker-review-real.mjs"');
    expect(source).toContain("options.runHarness ?? runReviewHarness");
    expect(source).not.toContain("spawnOnce");
    expect(source).toContain("recordRequestEvidence(options.path, requestEvidence)");
    expect(source).not.toContain("requestEvidence === undefined");
    expect(source).toContain("AUTOMATIC_TERMINAL_MISSING");
  });

  it("pins production to 10-57/58/59 and isolates 10-49/50/51 behind forensic compatibility", async () => {
    const source = await readFile("scripts/automatic-live-review.mjs", "utf8");
    expect(source).toContain("10-57-SOURCE.json");
    expect(source).toContain("10-58-FINAL-BUILD.json");
    expect(source).toContain(".10-59-live-state.json");
    expect(source).toContain("readForensicCompatibility");
    expect(source.match(/10-51-live-state\.json/gu)).toHaveLength(1);
  });

  it("uses O_EXCL for claims and refuses replay or concurrency", async () => {
    const root = await mkdtemp(join(tmpdir(), "automatic-review-"));
    const path = join(root, "claim.json");
    const values = await Promise.allSettled([
      claimExclusive(path, { generation: "a".repeat(64), kind: "live" }),
      claimExclusive(path, { generation: "a".repeat(64), kind: "live" }),
    ]);
    expect(values.filter((entry) => entry.status === "fulfilled")).toHaveLength(1);
    expect(values.filter((entry) => entry.status === "rejected")).toHaveLength(1);
    expect(JSON.parse(await readFile(path, "utf8"))).toMatchObject({ status: "consumed", max_provider_requests: 1 });
  });

  it("locks every request multiplier to a finite one-request budget", () => {
    expect(AUTOMATIC_LIVE_CONTROLS).toEqual({
      diagnostic_second_call: false,
      fallback: false,
      max_provider_requests: 1,
      max_retries: 0,
      max_tools_calls: 1,
    });
  });

  it("exports substantive fixed production dispatchers without the unconditional stub", async () => {
    expect(runFixedAutomaticBuild).toBeTypeOf("function");
    expect(runFixedAutomaticLive).toBeTypeOf("function");
    const source = await readFile("scripts/automatic-live-review.mjs", "utf8");
    expect(source).not.toContain('// Concrete source sets and generation locators are supplied only by reviewed');
    expect(source).toContain('mode === "auto-build"');
    expect(source).toContain("runFixedAutomaticLive()");
  });

  it("drives the real fixed live entrypoint through terminal-owner sealing and both local audits before return", async () => {
    const root = await mkdtemp(join(tmpdir(), "automatic-fixed-owner-"));
    const h = (c: string) => c.repeat(64);
    const generation = h("f");
    const paths = Object.fromEntries(Object.entries({
      source: "SOURCE.json", review: "REVIEW.md", security: "SECURITY.md", build: "BUILD.json", state: "state.json",
      terminal: "terminal.json", transition: "TRANSITION.json", execution: "EXECUTION.json", proof: "PROOF.json", localValidation: "LOCAL_VALIDATION.json",
    }).map(([key, name]) => [key, join(root, name)])) as any;
    await mkdir(root, { recursive: true });
    const identity = { certifier_sha256: { audit_live_evidence_sha256: h("a"), audit_proof_chain_sha256: h("b") }, manifest_sha256: h("c"), non_planning_tree: h("d"), reviewed_commit: "e".repeat(40) };
    const source = { ...identity, schema: "evidencelens.source.v2", status: "ready" };
    const build = { ...identity, build_count: 1, daemon_identity_sha256: h("1"), fixture_sha256: [h("2"), h("3"), h("4"), h("5")], generation: h("6"), image_config_sha256: h("7"), image_content_sha256: h("8"), image_id: `sha256:${h("9")}`, runtime_sha256: h("0"), schema: "evidencelens.build.v2", status: "ready", verifier_build_count: 0 };
    await Promise.all([writeFile(paths.source, canonicalJson(source)), writeFile(paths.build, canonicalJson(build)), writeFile(paths.review, "review"), writeFile(paths.security, "security")]);
    const readCredential = vi.fn(async () => "must-not-be-read");
    await expect(runFixedAutomaticLive({
      auditBuild: async () => { throw new Error("isolated preflight failure"); }, generation, paths, readCredential,
    })).rejects.toThrow("AUTOMATIC_PREFLIGHT");
    expect(readCredential).not.toHaveBeenCalled();
    for (const key of ["transition", "execution", "proof", "localValidation"] as const) expect(JSON.parse(await readFile(paths[key], "utf8"))).toBeTruthy();
    expect(JSON.parse(await readFile(paths.localValidation, "utf8"))).toMatchObject({ branch: "preflight_started", generation, outcome: "preflight_failed", validation: { execution: "passed", proof: "passed" } });
  });

});
