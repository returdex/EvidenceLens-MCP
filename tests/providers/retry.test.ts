import { describe, expect, it } from "vitest";
import { fetchWithRetry, type RetryClock } from "../../src/providers/retry.js";

function clock(): RetryClock & { sleeps: number[] } {
  let now = 0; const sleeps: number[] = [];
  return { sleeps, now: () => now, random: () => 0.5, sleep: async (ms) => { sleeps.push(ms); now += ms; } };
}

describe("bounded provider retries", () => {
  it("retries 429 and 5xx at most twice", async () => {
    let calls = 0; const injected = clock();
    await expect(fetchWithRetry({ maxRetries: 2, timeoutMs: 100, maxTotalWaitMs: 10_000, clock: injected, operation: async () => { calls += 1; return new Response("", { status: 503 }); } })).rejects.toMatchObject({ code: "PROVIDER_RETRY_EXHAUSTED", retryCount: 2 });
    expect(calls).toBe(3); expect(injected.sleeps).toHaveLength(2);
  });

  it("does not retry non-transient statuses", async () => {
    let calls = 0;
    await expect(fetchWithRetry({ maxRetries: 2, timeoutMs: 100, maxTotalWaitMs: 10_000, operation: async () => { calls += 1; return new Response("secret", { status: 422 }); } })).rejects.toMatchObject({ code: "PROVIDER_REQUEST_FAILED" });
    expect(calls).toBe(1);
  });

  it("retries network errors and stops before the total wait bound", async () => {
    let calls = 0; const injected = clock();
    await expect(fetchWithRetry({ maxRetries: 2, timeoutMs: 100, maxTotalWaitMs: 100, clock: injected, operation: async () => { calls += 1; throw new TypeError("network secret"); } })).rejects.toMatchObject({ code: "PROVIDER_RETRY_EXHAUSTED", retryCount: 0 });
    expect(calls).toBe(1); expect(injected.sleeps).toHaveLength(0);
  });
});
