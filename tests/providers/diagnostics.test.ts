import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  CHILD_DIAGNOSTIC_PREFIX,
  CHILD_DIAGNOSTIC_SCHEMA,
  createChildDiagnosticSink,
  createChildDiagnosticSinkFromEnvironment,
  parseChildDiagnosticFrame
} from "../../src/providers/diagnostics.js";

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
    env.EVIDENCELENS_DIAGNOSTIC_GENERATION = generation;
    env.EVIDENCELENS_DIAGNOSTIC_KEY = key.toString("hex");
    let stderr = "";
    const sink = createChildDiagnosticSinkFromEnvironment(env, (value) => { stderr += value; });
    expect(env).not.toHaveProperty("EVIDENCELENS_DIAGNOSTIC_GENERATION");
    expect(env).not.toHaveProperty("EVIDENCELENS_DIAGNOSTIC_KEY");
    expect(sink.emit(feature)).toBe(true);
    expect(parseChildDiagnosticFrame(stderr, { generation, key })).toEqual(feature);
  });
});
