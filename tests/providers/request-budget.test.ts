import { describe, expect, it } from "vitest";
import {
  createProviderRequestBudget,
  createProviderRequestProofFromEnvironment,
  PROVIDER_REQUEST_RECEIPT_PREFIX,
  verifyProviderRequestReceipt
} from "../../src/providers/request-budget.js";

const generation = "a".repeat(64);
const key = Buffer.alloc(32, 0x2a);

describe("provider HTTP request budget", () => {
  it("separates the reservation from an observed provider HTTP send", () => {
    const budget = createProviderRequestBudget({ generation, key });

    const before = budget.receipt();
    expect(before).toMatchObject({
      schema: "evidencelens.provider-request-receipt.v1",
      generation,
      reservation_count: 1,
      observed_provider_requests: 0,
      max_retries: 0,
      fallback: false,
      diagnostic_second_call: false
    });
    expect(Object.keys(before)).toEqual([
      "schema", "generation", "reservation_count", "observed_provider_requests",
      "max_retries", "fallback", "diagnostic_second_call", "mac"
    ]);
    expect(verifyProviderRequestReceipt(before, { generation, key })).toBe(true);

    budget.acquireHttpSend();
    const after = budget.receipt();
    expect(after.observed_provider_requests).toBe(1);
    expect(verifyProviderRequestReceipt(after, { generation, key })).toBe(true);
  });

  it("allows at most one sequential or concurrent hostile acquire", async () => {
    const budget = createProviderRequestBudget({ generation, key });
    const results = await Promise.allSettled(
      Array.from({ length: 16 }, async () => budget.acquireHttpSend())
    );
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(15);
    expect(() => budget.acquireHttpSend()).toThrow("PROVIDER_REQUEST_BUDGET_EXHAUSTED");
    expect(budget.receipt().observed_provider_requests).toBe(1);
  });

  it("rejects forged, malformed, cross-generation, and extra-key receipts", () => {
    const receipt = createProviderRequestBudget({ generation, key }).receipt();
    expect(verifyProviderRequestReceipt({ ...receipt, observed_provider_requests: 1 }, { generation, key })).toBe(false);
    expect(verifyProviderRequestReceipt({ ...receipt, reservation_count: 1.5 }, { generation, key })).toBe(false);
    expect(verifyProviderRequestReceipt({ ...receipt, fallback: 0 }, { generation, key })).toBe(false);
    expect(verifyProviderRequestReceipt({ ...receipt, extra: true }, { generation, key })).toBe(false);
    expect(verifyProviderRequestReceipt(receipt, { generation: "b".repeat(64), key })).toBe(false);
    expect(verifyProviderRequestReceipt(receipt, { generation, key: Buffer.alloc(32, 1) })).toBe(false);
  });

  it("does not expose a reset, mint, mutable receipt, or caller-owned key", () => {
    const callerKey = Buffer.from(key);
    const budget = createProviderRequestBudget({ generation, key: callerKey });
    callerKey.fill(0);
    expect(Object.keys(budget)).toEqual(["acquireHttpSend", "receipt"]);
    expect(Object.isFrozen(budget)).toBe(true);
    const receipt = budget.receipt();
    expect(Object.isFrozen(receipt)).toBe(true);
    expect(verifyProviderRequestReceipt(receipt, { generation, key })).toBe(true);
  });

  it("emits one bounded private-channel receipt from proof environment identity", () => {
    let stderr = "";
    const proof = createProviderRequestProofFromEnvironment({
      EVIDENCELENS_DIAGNOSTIC_GENERATION: generation,
      EVIDENCELENS_DIAGNOSTIC_KEY: key.toString("hex")
    }, (value) => { stderr += value; });
    expect(proof).toBeDefined();
    proof!.requestBudget.acquireHttpSend();
    proof!.receiptSink(proof!.requestBudget.receipt());
    expect(stderr.startsWith(PROVIDER_REQUEST_RECEIPT_PREFIX)).toBe(true);
    expect(stderr.endsWith("\n")).toBe(true);
    expect(() => proof!.receiptSink(proof!.requestBudget.receipt())).toThrow("PROVIDER_REQUEST_BUDGET_EXHAUSTED");
  });
});
