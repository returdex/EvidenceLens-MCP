import { describe, expect, it } from "vitest";
import { buildReviewAnalysisInput, extractSolutionClaims, type TransientEvidenceAnalysis } from "../../src/review/analysis.js";

describe("review analysis handoff", () => {
  it("extracts requirements and ordinary solution claims with typed locations", () => {
    const payload: TransientEvidenceAnalysis = {
      evidenceId: "solution",
      role: "solution",
      type: "text",
      reference: "inline://solution",
      contentHash: "a".repeat(64),
      text: "coverage = 80%\nThe report includes a conclusion.",
      references: [
        { kind: "text", startLine: 1, endLine: 1 },
        { kind: "text", startLine: 2, endLine: 2 }
      ],
      byteLength: 50
    };
    const input = buildReviewAnalysisInput({ normalizedEvidence: [], analysisPayloads: [payload] });
    expect(extractSolutionClaims(payload)).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "coverage", location: { kind: "text", startLine: 1, endLine: 1 } }),
      expect.objectContaining({ key: "report includes conclusion", location: { kind: "text", startLine: 2, endLine: 2 } })
    ]));
    expect(input.payloads).toHaveLength(1);
  });

  it("resolves only normalized locations and retained visual pages", () => {
    const payload: TransientEvidenceAnalysis = {
      evidenceId: "scan", role: "rubric", type: "pdf", reference: "inline://scan", contentHash: "b".repeat(64),
      bytes: new Uint8Array([1, 2]), byteLength: 2,
      references: [{ kind: "pdf", pageNumber: 1, pageCount: 1 }]
    };
    const input = buildReviewAnalysisInput({
      normalizedEvidence: [{ source: { id: "scan", type: "pdf", reference: "inline://scan" }, contentHash: "b".repeat(64), extraction: { extractor: "x", extractorVersion: "1", generatedAt: "1970-01-01T00:00:00.000Z", partial: true }, references: payload.references, visualPayloads: [{ mimeType: "image/png", byteLength: 1, width: 1, height: 1, sha256: "c".repeat(64), base64: "AA==", pageNumber: 1 }], warnings: [] }],
      analysisPayloads: [payload]
    });
    expect(input.resolveCitation("scan", { kind: "pdf", pageNumber: 1, pageCount: 1 }, true)).toMatchObject({ visual: true, visualPayloadSha256: "c".repeat(64) });
    expect(() => input.resolveCitation("scan", { kind: "pdf", pageNumber: 2, pageCount: 1 }, true)).toThrow();
  });
});
