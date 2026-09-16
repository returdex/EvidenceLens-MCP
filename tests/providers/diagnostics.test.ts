import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  CHILD_DIAGNOSTIC_GENERATION_ENV,
  CHILD_DIAGNOSTIC_KEY_ENV,
  CHILD_DIAGNOSTIC_PREFIX,
  CHILD_DIAGNOSTIC_SCHEMA,
  createChildDiagnosticSink,
  createChildDiagnosticSinkFromEnvironment,
  parseChildDiagnosticFrame
} from "../../src/providers/diagnostics.js";
import {
  createProviderRequestProofFromEnvironment,
  PROVIDER_REQUEST_GENERATION_ENV,
  PROVIDER_REQUEST_KEY_ENV
} from "../../src/providers/request-budget.js";

const generation = "a".repeat(64);
const key = Buffer.from("b".repeat(64), "hex");
const feature = { path: ["provider", "http", "json"] as const, code: "invalid_format" as const };

function sign(unsigned: Record<string, unknown>): string {
  return createHmac("sha256", key).update(JSON.stringify(unsigned)).digest("hex");
}

describe("proof child diagnostic channel", () => {
  it("emits and verifies exactly one canonical bounded allowlisted frame", () => {
    let stderr = "";
    const sink = createChildDiagnosticSink({ generation, key: Buffer.from(key), write: (value) => { stderr += value; } });
    expect(sink.emit(feature)).toBe(true);
    expect(sink.emit(feature)).toBe(false);
    expect(Buffer.byteLength(stderr)).toBeLessThanOrEqual(4096);
    expect(stderr.startsWith(CHILD_DIAGNOSTIC_PREFIX)).toBe(true);
    expect(parseChildDiagnosticFrame(stderr, { generation, key })).toEqual({ path: [...feature.path], code: feature.code });
    expect(stderr).not.toMatch(/detail|secret|stack|body|credential|request/iu);
  });

  it.each([
    "no_candidate", "multiple_candidates", "unbalanced", "wrong_root", "structural_context", "malformed_json"
  ])("authenticates the closed extraction-shape code %s and still rejects unknown codes", (code) => {
    let stderr = "";
    const sink = createChildDiagnosticSink({ generation, key: Buffer.from(key), write: (value) => { stderr += value; } });
    const extraction = { path: ["provider", "content", "object"] as const, code };
    expect(sink.emit(extraction)).toBe(true);
    expect(parseChildDiagnosticFrame(stderr, { generation, key })).toEqual(extraction);

    const unknownSink = createChildDiagnosticSink({ generation, key: Buffer.from(key), write: () => { throw new Error("must not write"); } });
    expect(unknownSink.emit({ path: ["provider", "content", "object"], code: `${code}_unknown` })).toBe(false);
  });

  it("rejects unknown, duplicate, oversize, malformed, stale, bad-MAC, and detail-bearing frames", () => {
    const unsigned = { schema: CHILD_DIAGNOSTIC_SCHEMA, generation, sequence: 1, path: [...feature.path], code: feature.code };
    const valid = `${CHILD_DIAGNOSTIC_PREFIX}${JSON.stringify({ ...unsigned, mac: sign(unsigned) })}\n`;
    expect(parseChildDiagnosticFrame(`${valid}${valid}`, { generation, key })).toBeUndefined();
    expect(parseChildDiagnosticFrame(`${CHILD_DIAGNOSTIC_PREFIX}${"x".repeat(4096)}\n`, { generation, key })).toBeUndefined();
    expect(parseChildDiagnosticFrame(`${CHILD_DIAGNOSTIC_PREFIX}{bad}\n`, { generation, key })).toBeUndefined();
    expect(parseChildDiagnosticFrame(valid, { generation: "c".repeat(64), key })).toBeUndefined();
    const badMac = `${CHILD_DIAGNOSTIC_PREFIX}${JSON.stringify({ ...unsigned, mac: "0".repeat(64) })}\n`;
    expect(parseChildDiagnosticFrame(badMac, { generation, key })).toBeUndefined();
    const unknown = { ...unsigned, path: ["private", "detail"] };
    expect(parseChildDiagnosticFrame(`${CHILD_DIAGNOSTIC_PREFIX}${JSON.stringify({ ...unknown, mac: sign(unknown) })}\n`, { generation, key })).toBeUndefined();
    const disclosed = { ...unsigned, detail: "secret" };
    expect(parseChildDiagnosticFrame(`${CHILD_DIAGNOSTIC_PREFIX}${JSON.stringify({ ...disclosed, mac: sign(disclosed) })}\n`, { generation, key })).toBeUndefined();

    const reordered = {
      generation,
      schema: CHILD_DIAGNOSTIC_SCHEMA,
      sequence: 1,
      path: [...feature.path],
      code: feature.code
    };
    expect(parseChildDiagnosticFrame(`${CHILD_DIAGNOSTIC_PREFIX}${JSON.stringify({ ...reordered, mac: sign(reordered) })}\n`, { generation, key })).toBeUndefined();
  });

  it("erases proof environment values and remains a no-op outside proof mode", () => {
    const env: Record<string, string | undefined> = {};
    expect(createChildDiagnosticSinkFromEnvironment(env).emit(feature)).toBe(false);
    env[CHILD_DIAGNOSTIC_GENERATION_ENV] = generation;
    env[CHILD_DIAGNOSTIC_KEY_ENV] = key.toString("hex");
    let stderr = "";
    const sink = createChildDiagnosticSinkFromEnvironment(env, (value) => { stderr += value; });
    expect(env).not.toHaveProperty(CHILD_DIAGNOSTIC_GENERATION_ENV);
    expect(env).not.toHaveProperty(CHILD_DIAGNOSTIC_KEY_ENV);
    expect(sink.emit(feature)).toBe(true);
    expect(parseChildDiagnosticFrame(stderr, { generation, key })).toEqual(feature);
  });

  it("keeps request-receipt and child-diagnostic capabilities independently consumable", () => {
    const environment: Record<string, string | undefined> = {
      [CHILD_DIAGNOSTIC_GENERATION_ENV]: generation,
      [CHILD_DIAGNOSTIC_KEY_ENV]: key.toString("hex"),
      [PROVIDER_REQUEST_GENERATION_ENV]: generation,
      [PROVIDER_REQUEST_KEY_ENV]: key.toString("hex")
    };
    let diagnostic = "";
    let receipt = "";

    const proof = createProviderRequestProofFromEnvironment(environment, (value) => { receipt += value; });
    const sink = createChildDiagnosticSinkFromEnvironment(environment, (value) => { diagnostic += value; });
    proof?.requestBudget.acquireHttpSend();
    proof?.receiptSink(proof.requestBudget.receipt());

    expect(sink.emit(feature)).toBe(true);
    expect(parseChildDiagnosticFrame(diagnostic, { generation, key })).toEqual(feature);
    expect(receipt).toContain("[evidencelens-provider-request]");
    expect(environment).not.toHaveProperty(CHILD_DIAGNOSTIC_GENERATION_ENV);
    expect(environment).not.toHaveProperty(CHILD_DIAGNOSTIC_KEY_ENV);
    expect(environment).not.toHaveProperty(PROVIDER_REQUEST_GENERATION_ENV);
    expect(environment).not.toHaveProperty(PROVIDER_REQUEST_KEY_ENV);
  });
});
