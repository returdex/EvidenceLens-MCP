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

  it("retries a configured request timeout but never more than twice", async () => {
    let calls = 0;
    await expect(fetchWithRetry({ maxRetries: 2, timeoutMs: 5, maxTotalWaitMs: 10_000, operation: async (signal) => new Promise<Response>((_resolve, reject) => {
      calls += 1;
      signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    }) })).rejects.toMatchObject({ code: "PROVIDER_RETRY_EXHAUSTED", retryCount: 2 });
    expect(calls).toBe(3);
  });

  it("keeps jittered delays within the bounded exponential range", async () => {
    let calls = 0; const injected = clock();
    await expect(fetchWithRetry({ maxRetries: 1, timeoutMs: 100, maxTotalWaitMs: 10_000, clock: { ...injected, random: () => 1 }, operation: async () => { calls += 1; return new Response("", { status: 500 }); } })).rejects.toMatchObject({ code: "PROVIDER_RETRY_EXHAUSTED" });
    expect(calls).toBe(2); expect(injected.sleeps[0]).toBeGreaterThanOrEqual(125); expect(injected.sleeps[0]).toBeLessThanOrEqual(375);
  });
});
