import { describe, expect, it } from "vitest";
import { buildReviewAnalysisInput, extractSolutionClaims, type TransientEvidenceAnalysis } from "../../src/review/analysis.js";

describe("review analysis handoff", () => {
  it("clears original claim, token, payload, cell, and buffer references", () => {
    const byteBuffer = new Uint8Array([7, 8, 9]);
    const tableCell = { value: "Mode must be strict.", location: { kind: "table" as const, row: 2, column: 2 } };
    const analysis = buildReviewAnalysisInput({
      normalizedEvidence: [],
      analysisPayloads: [
        {
          evidenceId: "brief", role: "assignment_brief", type: "text", reference: "inline://brief", contentHash: "a".repeat(64),
          text: "Threshold must be 4.", references: [{ kind: "text", startLine: 1, endLine: 1 }], byteLength: 20, bytes: byteBuffer
        },
        {
          evidenceId: "rubric", role: "rubric", type: "table", reference: "inline://rubric", contentHash: "b".repeat(64),
          tableCells: [tableCell], references: [tableCell.location], byteLength: 20
        },
        {
          evidenceId: "solution", role: "solution", type: "text", reference: "inline://solution", contentHash: "c".repeat(64),
          text: "Threshold = 3.", references: [{ kind: "text", startLine: 1, endLine: 1 }], byteLength: 14
        }
      ]
    });
    const requirements = analysis.requirements;
    const solutionClaims = analysis.solutionClaims;
    const claims = [...requirements, ...solutionClaims];
    const originalTokens = claims.map((claim) => claim.tokens);
    const serverTokens = claims.flatMap((claim) => [claim.text, claim.key, claim.value, ...claim.tokens]).filter((value): value is string => value !== undefined);
    const replacementTokens = ["replacement-server-token"];
    claims[0]!.tokens = replacementTokens;
    const payloads = [...analysis.payloads];

    analysis.clear();

    expect(requirements).toHaveLength(0);
    expect(solutionClaims).toHaveLength(0);
    for (const claim of claims) {
      expect(claim.text).toBe("");
      expect(claim.key).toBe("");
      expect(claim.value).toBeUndefined();
      expect(claim.tokens).toEqual([]);
      expect(serverTokens.some((token) => claim.tokens.includes(token))).toBe(false);
    }
    expect(originalTokens.every((tokens) => tokens.length === 0)).toBe(true);
    expect(replacementTokens).toHaveLength(0);
    expect(payloads.every((payload) => payload.text === undefined && payload.tableCells === undefined && payload.bytes === undefined)).toBe(true);
    expect(tableCell.value).toBe("");
    expect([...byteBuffer]).toEqual([0, 0, 0]);
    expect(() => analysis.clear()).not.toThrow();
  });

  it("continues clearing stable references after a local claim fault", () => {
    const firstBuffer = new Uint8Array([1, 2]);
    const secondBuffer = new Uint8Array([3, 4]);
    const analysis = buildReviewAnalysisInput({
      normalizedEvidence: [],
      analysisPayloads: [
        { evidenceId: "brief", role: "assignment_brief", type: "text", reference: "inline://brief", contentHash: "a".repeat(64), text: "First must be present.", references: [{ kind: "text", startLine: 1, endLine: 1 }], byteLength: 10, bytes: firstBuffer },
        { evidenceId: "rubric", role: "rubric", type: "text", reference: "inline://rubric", contentHash: "b".repeat(64), text: "Second must be present.", references: [{ kind: "text", startLine: 1, endLine: 1 }], byteLength: 10, bytes: secondBuffer }
      ]
    });
    const claims = [...analysis.requirements];
    Object.defineProperty(claims[0]!, "text", { configurable: true, get: () => "faulted", set: () => { throw new Error("claim-fault-sentinel"); } });

    expect(() => analysis.clear()).toThrowError(expect.objectContaining({ code: "INTERNAL_ERROR", message: "Internal error" }));
    expect(claims[1]).toMatchObject({ text: "", key: "", value: undefined, tokens: [] });
    expect([...firstBuffer, ...secondBuffer]).toEqual([0, 0, 0, 0]);
    expect(analysis.requirements).toHaveLength(0);
  });

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
      expect.objectContaining({ key: "conclusion", location: { kind: "text", startLine: 2, endLine: 2 } })
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
      normalizedEvidence: [{ source: { id: "scan", type: "pdf", reference: "inline://scan" }, role: "rubric", contentHash: "b".repeat(64), extraction: { extractor: "x", extractorVersion: "1", generatedAt: "1970-01-01T00:00:00.000Z", partial: true }, references: payload.references, visualPayloads: [{ mimeType: "image/png", byteLength: 1, width: 1, height: 1, sha256: "c".repeat(64), base64: "AA==", pageNumber: 1 }], warnings: [] }],
      analysisPayloads: [payload]
    });
    expect(input.resolveCitation("scan", { kind: "pdf", pageNumber: 1, pageCount: 1 }, true)).toMatchObject({ visual: true, visualPayloadSha256: "c".repeat(64) });
    expect(() => input.resolveCitation("scan", { kind: "pdf", pageNumber: 2, pageCount: 1 }, true)).toThrow();
  });
});
