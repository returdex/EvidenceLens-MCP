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

  it("rejects unsupported, corrupted, oversized, or impossible image bytes safely", async () => {
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

    const malformedPng = new Uint8Array([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
      0, 0, 0, 1, 0, 0, 0, 1
    ]);
    expect(() => normalizeImageEvidence({ id: "fake-png", role: "other", type: "image", reference: "fake.png", bytes: malformedPng })).toThrow(/unsupported|invalid/i);

    const malformedJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0, 11, 8, 0, 1, 0, 1, 1, 1, 0, 0]);
    expect(() => normalizeImageEvidence({ id: "fake-jpeg", role: "other", type: "image", reference: "fake.jpg", bytes: malformedJpeg })).toThrow(/unsupported|invalid/i);

    const corrupted = new Uint8Array(await readFile("tests/fixtures/evidence/images/rubric-screenshot.png"));
    corrupted[corrupted.length - 20] ^= 0xff;
    expect(() => normalizeImageEvidence({ id: "corrupt-png", role: "other", type: "image", reference: "corrupt.png", bytes: corrupted })).toThrow(/unsupported|invalid/i);
  });
});
