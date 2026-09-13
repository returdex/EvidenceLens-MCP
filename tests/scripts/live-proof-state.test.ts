import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  completeWrapper,
  createProofState,
  readProofState,
  recordProviderAttempt,
  recoverProofState,
  transitionProofState,
} from "../../scripts/live-proof-state.mjs";

const generation = "a".repeat(64);
async function state(kind: "build" | "live") {
  const root = await mkdtemp(join(tmpdir(), "proof-state-"));
  await chmod(root, 0o700);
  const path = join(root, `${kind}.json`);
  await createProofState(path, kind, generation);
  return path;
}

describe("durable live proof state", () => {
  it("records build non-pass inside a completed wrapper", async () => {
    const path = await state("build");
    await transitionProofState(path, "started");
    await transitionProofState(path, "verification_failed");
    await completeWrapper(path);
    expect(await readProofState(path)).toMatchObject({ inner_status: "verification_failed", wrapper_status: "completed", build_count: 1, provider_request_count: 0 });
  });

  it("records live failure inside a completed wrapper without converting it to pass", async () => {
    const path = await state("live");
    await transitionProofState(path, "consumed");
    await transitionProofState(path, "failed");
    await completeWrapper(path);
    expect(await readProofState(path)).toMatchObject({ inner_status: "failed", wrapper_status: "completed", max_provider_requests: 1 });
    await expect(transitionProofState(path, "passed")).rejects.toThrow("PROOF_STATE_TRANSITION");
  });

  it.each([
    ["build", "prepared", "preflight_failed"],
    ["build", "started", "build_failed"],
    ["live", "prepared", "failed"],
    ["live", "consumed", "failed"],
  ] as const)("recovers %s interruption at %s without a side effect", async (kind, interruptedAt, terminal) => {
    const path = await state(kind);
    if (interruptedAt === "started" || interruptedAt === "consumed") await transitionProofState(path, interruptedAt);
    const counters = { build: 0, credential: 0, provider: 0, spawn: 0 };
    const recovered = await recoverProofState(path, counters);
    expect(recovered).toMatchObject({ inner_status: terminal, wrapper_status: "completed" });
    expect(counters).toEqual({ build: 0, credential: 0, provider: 0, spawn: 0 });
    expect(await recoverProofState(path, counters)).toEqual(recovered);
  });

  it("finishes wrapper-only interruption from durable terminal evidence", async () => {
    const path = await state("live");
    await transitionProofState(path, "consumed");
    await transitionProofState(path, "passed", { provider_request_count: 1 });
    expect((await readProofState(path)).wrapper_status).toBe("pending");
    expect(await recoverProofState(path)).toMatchObject({ inner_status: "passed", wrapper_status: "completed", provider_request_count: 1 });
  });

  it("writes request intent before spawn and refuses a second attempt", async () => {
    const path = await state("live");
    await transitionProofState(path, "consumed");
    await recordProviderAttempt(path);
    expect(await readProofState(path)).toMatchObject({ inner_status: "consumed", provider_request_count: 1 });
    await expect(recordProviderAttempt(path)).rejects.toThrow("PROOF_STATE_TRANSITION");
  });

  it("rejects malformed, noncanonical, and rollback state", async () => {
    const path = await state("live");
    const value = JSON.parse(await readFile(path, "utf8"));
    await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
    await expect(readProofState(path)).rejects.toThrow("PROOF_STATE_MALFORMED");
  });
});
