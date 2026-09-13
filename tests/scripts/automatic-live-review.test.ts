import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import {
  AUTOMATIC_BUILD_CONTROLS,
  AUTOMATIC_LIVE_CONTROLS,
  claimExclusive,
  runAutomaticBuild,
  runAutomaticLiveOnce,
  runStatefulAutomaticLive,
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

  it("consumes before credential access and one pinned spawn", async () => {
    const order: string[] = [];
    const spawnOnce = vi.fn(async (controls) => { order.push("spawn"); return { status: "failed", controls }; });
    const result = await runAutomaticLiveOnce({
      authenticateReadyBuild: vi.fn(async () => order.push("authenticate")),
      consume: vi.fn(async () => order.push("consume")),
      readCredential: vi.fn(async () => { order.push("credential"); return "private"; }),
      spawnOnce,
    });
    expect(order).toEqual(["authenticate", "consume", "credential", "spawn"]);
    expect(spawnOnce).toHaveBeenCalledOnce();
    expect(spawnOnce.mock.calls[0]?.[0]).toEqual(AUTOMATIC_LIVE_CONTROLS);
    expect(result).toEqual({ status: "failed" });
    expect(JSON.stringify(result)).not.toContain("private");
  });

  it("never reads a credential when authentication or consumption fails", async () => {
    const readCredential = vi.fn();
    await expect(runAutomaticLiveOnce({
      authenticateReadyBuild: async () => { throw new Error("not-ready"); }, consume: vi.fn(), readCredential, spawnOnce: vi.fn(),
    })).rejects.toThrow("AUTOMATIC_PREFLIGHT");
    await expect(runAutomaticLiveOnce({
      authenticateReadyBuild: async () => undefined, consume: async () => { throw new Error("exists"); }, readCredential, spawnOnce: vi.fn(),
    })).rejects.toThrow("AUTOMATIC_REPLAY");
    expect(readCredential).not.toHaveBeenCalled();
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

  it.each(["after-consume", "after-result", "before-wrapper"])("recovers interruption %s without respawn", async (point) => {
    const root = await mkdtemp(join(tmpdir(), "automatic-crash-"));
    const path = join(root, "live.json");
    const counters = { credential: 0, spawn: 0 };
    await expect(runStatefulAutomaticLive({
      generation: "b".repeat(64),
      path,
      authenticateReadyBuild: async () => undefined,
      readCredential: async () => { counters.credential += 1; return "private"; },
      spawnOnce: async () => { counters.spawn += 1; return { status: "failed" }; },
      interrupt: async (at) => { if (at === point) throw new Error("crash"); },
    })).rejects.toThrow("crash");
    const before = { ...counters };
    const { recoverProofState } = await import("../../scripts/live-proof-state.mjs");
    const recovered = await recoverProofState(path);
    expect(recovered.wrapper_status).toBe("completed");
    expect(counters).toEqual(before);
  });
});
