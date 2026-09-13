import { mkdtemp, readFile } from "node:fs/promises";
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
    expect(source).toContain("await runReviewHarness({");
    expect(source).not.toContain("spawnOnce");
    expect(source).toContain("recordRequestEvidence(options.path, requestEvidence)");
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

});
