import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  contentHashSchema,
  extractionMetadataSchema,
  normalizedEvidenceReferenceSchema,
  normalizedEvidenceSchema,
  reviewResponseSchema,
  visualPayloadSchema
} from "../../src/contracts/review.js";
import { sha256Hex } from "../../src/evidence/hash.js";

const hash = "a".repeat(64);
const imageBytes = readFileSync("tests/fixtures/evidence/images/rubric-screenshot.png");
const imageBase64 = imageBytes.toString("base64");
const extraction = {
  extractor: "text-normalizer",
  extractorVersion: "1.0.0",
  generatedAt: "2026-08-22T00:00:00.000Z",
  partial: false
};

describe("normalized evidence contract", () => {
  it("parses text evidence with provenance, line references, and warnings", () => {
    const artifact = normalizedEvidenceSchema.parse({
      source: { id: "brief-1", type: "text", reference: "course/brief" },
      role: "assignment_brief",
      contentHash: hash,
      extraction,
      references: [{ kind: "text", startLine: 1, endLine: 4 }],
      warnings: [{ code: "EMPTY_LINE", message: "Blank lines were preserved." }]
    });

    expect(artifact.references[0]).toEqual({ kind: "text", startLine: 1, endLine: 4 });
  });

  it("parses PDF page references and scanned-page visual descriptors", () => {
    const artifact = normalizedEvidenceSchema.parse({
      source: { id: "scan-1", type: "pdf", reference: "course/scan.pdf" },
      role: "rubric",
      contentHash: hash,
      extraction: { ...extraction, extractor: "pdf-extractor", partial: true },
      references: [{ kind: "pdf", pageNumber: 2, pageCount: 3 }],
      visualPayload: {
        mimeType: "image/png",
        width: 320,
        height: 180,
        byteLength: imageBytes.byteLength,
        sha256: sha256Hex(imageBytes),
        base64: imageBase64
      },
      warnings: [{ code: "TEXT_UNAVAILABLE", message: "Page is scanned." }]
    });

    expect(artifact.references[0]).toMatchObject({ kind: "pdf", pageNumber: 2, pageCount: 3 });
    expect(artifact.visualPayload?.mimeType).toBe("image/png");
  });

  it("parses image and screenshot visual metadata", () => {
    const result = normalizedEvidenceSchema.safeParse({
      source: { id: "shot-1", type: "screenshot", reference: "submission.png" },
      role: "solution",
      contentHash: hash,
      extraction: { ...extraction, extractor: "image-extractor" },
      references: [{ kind: "image", width: 800, height: 600, mimeType: "image/jpeg" }],
      visualPayload: {
      mimeType: "image/png",
      width: 320,
      height: 180,
      byteLength: imageBytes.byteLength,
      sha256: sha256Hex(imageBytes),
      base64: imageBase64
      },
      warnings: []
    });

    expect(result.success).toBe(true);
  });

  it("parses table cell references", () => {
    const result = normalizedEvidenceSchema.safeParse({
      source: { id: "rubric-1", type: "table", reference: "rubric.csv" },
      role: "rubric",
      contentHash: hash,
      extraction: { ...extraction, extractor: "table-extractor" },
      references: [
        { kind: "table", sheetName: "Rubric", row: 3, column: 2, cell: "B3" }
      ],
      warnings: []
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid hashes, source identity, references, controls, and visual bounds", () => {
    expect(contentHashSchema.safeParse("A".repeat(64)).success).toBe(false);
    expect(contentHashSchema.safeParse("a".repeat(63)).success).toBe(false);
    expect(extractionMetadataSchema.safeParse({ ...extraction, partial: undefined }).success).toBe(false);
    expect(
      normalizedEvidenceSchema.safeParse({
        source: { id: "", type: "text", reference: "safe\nunsafe" },
        contentHash: hash,
        extraction,
        references: [{ kind: "text", startLine: 1, endLine: 1 }],
        warnings: []
      }).success
    ).toBe(false);
    expect(normalizedEvidenceReferenceSchema.safeParse({ kind: "unknown" }).success).toBe(false);
    expect(
      visualPayloadSchema.safeParse({
        mimeType: "image/png",
        width: 1000000,
        height: 100,
        byteLength: 10,
        contentHash: hash
      }).success
    ).toBe(false);
    const validVisual = {
      mimeType: "image/png",
      width: 320,
      height: 180,
      byteLength: imageBytes.byteLength,
      sha256: sha256Hex(imageBytes),
      base64: imageBase64
    };
    expect(visualPayloadSchema.safeParse(validVisual).success).toBe(true);
    expect(visualPayloadSchema.safeParse({ ...validVisual, byteLength: 2 }).success).toBe(false);
    expect(visualPayloadSchema.safeParse({ ...validVisual, sha256: hash }).success).toBe(false);
    expect(visualPayloadSchema.safeParse({ ...validVisual, base64: Buffer.from(imageBytes).subarray(0, -1).toString("base64") }).success).toBe(false);
    expect(visualPayloadSchema.safeParse({ ...validVisual, mimeType: "image/jpeg" }).success).toBe(false);
    expect(visualPayloadSchema.safeParse({ ...validVisual, width: 1 }).success).toBe(false);
  });

  it("requires normalized evidence on successful responses", () => {
    const response = reviewResponseSchema.parse({
      ok: true,
      requestId: "review-001",
      status: "accepted",
      findings: [],
      normalizedEvidence: [],
      metadata: {
        serverName: "evidencelens",
        serverVersion: "0.1.2",
        analyzerName: "deterministic-rules",
        analyzerVersion: "1.0.0",
        generatedAt: "2026-08-22T00:00:00.000Z"
      }
    });

    expect(response.normalizedEvidence).toEqual([]);
  });
});
