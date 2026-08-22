import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { normalizedEvidenceSchema } from "../../src/contracts/review.js";
import { normalizeImageEvidence } from "../../src/evidence/image.js";
import { sha256Hex } from "../../src/evidence/hash.js";

const generatedAt = "2026-08-22T00:00:00.000Z";

describe("normalizeImageEvidence", () => {
  it("normalizes an explicit screenshot byte payload with identity, dimensions, hash, and visual bytes", async () => {
    const bytes = new Uint8Array(await readFile("tests/fixtures/evidence/images/rubric-screenshot.png"));
    const result = normalizeImageEvidence({
      id: "rubric-screenshot",
      role: "rubric",
      type: "screenshot",
      reference: "fixture://rubric-screenshot.png",
      bytes,
      generatedAt
    });

    expect(normalizedEvidenceSchema.parse(result)).toEqual(result);
    expect(result.source.type).toBe("screenshot");
    expect(result.contentHash).toBe(sha256Hex(bytes));
    expect(result.references).toEqual([{ kind: "image", width: 320, height: 180, mimeType: "image/png" }]);
    expect(result.visualPayload).toMatchObject({
      mimeType: "image/png",
      byteLength: bytes.byteLength,
      width: 320,
      height: 180,
      sha256: sha256Hex(bytes),
      base64: Buffer.from(bytes).toString("base64")
    });
    expect(result.extraction.partial).toBe(false);
  });

  it("rejects unsupported image bytes and oversized or impossible dimensions safely", () => {
    expect(() => normalizeImageEvidence({
      id: "not-image",
      role: "other",
      type: "image",
      reference: "fixture://not-image",
      bytes: new Uint8Array([1, 2, 3]),
      generatedAt
    })).toThrow(/unsupported|image/i);

    const oversized = new Uint8Array(26);
    expect(() => normalizeImageEvidence({
      id: "large-image",
      role: "other",
      type: "image",
      reference: "fixture://large-image",
      bytes: oversized,
      limits: { maxImageBytes: 25 },
      generatedAt
    })).toThrow(/maximum|size/i);
  });
});
