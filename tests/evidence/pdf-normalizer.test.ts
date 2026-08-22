import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { normalizedEvidenceSchema } from "../../src/contracts/review.js";
import { normalizePdfEvidence } from "../../src/evidence/pdf.js";
import { sha256Hex } from "../../src/evidence/hash.js";

const generatedAt = "2026-08-22T00:00:00.000Z";

describe("normalizePdfEvidence", () => {
  it("normalizes text PDF pages with parser-derived page references and hashes", async () => {
    const bytes = new Uint8Array(await readFile("tests/fixtures/evidence/pdfs/text-page.pdf"));
    const result = await normalizePdfEvidence({
      id: "text-pdf",
      role: "assignment_brief",
      type: "pdf",
      reference: "fixture://text-page.pdf",
      bytes,
      generatedAt
    });

    expect(normalizedEvidenceSchema.parse(result)).toEqual(result);
    expect(result.contentHash).toBe(sha256Hex(bytes));
    expect(result.references).toEqual([{ kind: "pdf", pageNumber: 1, pageCount: 1 }]);
    expect(result.extraction.partial).toBe(false);
    expect(result.warnings).toEqual([]);
    expect(result.visualPayload).toBeUndefined();
  });

  it("preserves actual bounded rendered bytes for scanned pages", async () => {
    const bytes = new Uint8Array(await readFile("tests/fixtures/evidence/pdfs/scanned-page.pdf"));
    const result = await normalizePdfEvidence({
      id: "scanned-pdf",
      role: "rubric",
      type: "pdf",
      reference: "fixture://scanned-page.pdf",
      bytes,
      generatedAt
    });

    expect(normalizedEvidenceSchema.parse(result)).toEqual(result);
    expect(result.references).toEqual([{ kind: "pdf", pageNumber: 1, pageCount: 1 }]);
    expect(result.extraction.partial).toBe(true);
    expect(result.warnings.some((warning) => warning.code === "PDF_PAGE_TEXT_UNAVAILABLE")).toBe(true);
    expect(result.visualPayload?.base64.length).toBeGreaterThan(0);
    expect(result.visualPayload?.byteLength).toBeGreaterThan(0);
    expect(result.visualPayload?.sha256).toBe(sha256Hex(Buffer.from(result.visualPayload?.base64 ?? "", "base64")));
  });

  it("rejects oversized and unparseable PDF bytes with sanitized errors", async () => {
    await expect(normalizePdfEvidence({
      id: "oversized-pdf",
      role: "other",
      type: "pdf",
      reference: "fixture://oversized.pdf",
      bytes: new Uint8Array(26),
      limits: { maxPdfBytes: 25 },
      generatedAt
    })).rejects.toThrow(/maximum|size/i);

    await expect(normalizePdfEvidence({
      id: "invalid-pdf",
      role: "other",
      type: "pdf",
      reference: "fixture://invalid.pdf",
      bytes: new TextEncoder().encode("not a pdf"),
      generatedAt
    })).rejects.toThrow(/parse|PDF|invalid/i);
  });
});
