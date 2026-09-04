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

  it("continues every independently clearable target after each local cleanup category fault", () => {
    const createCleanupFixture = () => {
      const firstBuffer = new Uint8Array([1, 2]);
      const laterBuffer = new Uint8Array([3, 4]);
      const requirementCell = { value: "Mode must be strict.", location: { kind: "table" as const, row: 2, column: 2 } };
      const solutionCell = { value: "Mode = loose.", location: { kind: "table" as const, row: 2, column: 2 } };
      const analysis = buildReviewAnalysisInput({
        normalizedEvidence: [],
        analysisPayloads: [
          { evidenceId: "brief", role: "assignment_brief", type: "text", reference: "inline://brief", contentHash: "a".repeat(64), text: "Threshold must be 4.", references: [{ kind: "text", startLine: 1, endLine: 1 }], byteLength: 20, bytes: firstBuffer },
          { evidenceId: "rubric", role: "rubric", type: "table", reference: "inline://rubric", contentHash: "b".repeat(64), tableCells: [requirementCell], references: [requirementCell.location], byteLength: 20 },
          { evidenceId: "solution", role: "solution", type: "text", reference: "inline://solution", contentHash: "c".repeat(64), text: "Threshold = 3.", references: [{ kind: "text", startLine: 1, endLine: 1 }], byteLength: 14, bytes: laterBuffer },
          { evidenceId: "solution-table", role: "solution", type: "table", reference: "inline://solution-table", contentHash: "d".repeat(64), tableCells: [solutionCell], references: [solutionCell.location], byteLength: 14 }
        ]
      });
      const requirements = analysis.requirements;
      const solutionClaims = analysis.solutionClaims;
      const claims = [...requirements, ...solutionClaims];
      const originalTokens = claims.map((claim) => claim.tokens);
      const currentTokens = claims.map((claim, index) => [`current-token-${index}`]);
      claims.forEach((claim, index) => { claim.tokens = currentTokens[index]!; });
      const payloads = [...analysis.payloads];
      const cells = payloads.flatMap((payload) => [...(payload.tableCells ?? [])]);
      const buffers = [firstBuffer, laterBuffer];
      return { analysis, requirements, solutionClaims, claims, originalTokens, currentTokens, payloads, cells, buffers };
    };
    type Fixture = ReturnType<typeof createCleanupFixture>;
    const clearThenThrowSetter = <T extends object, K extends keyof T>(target: T, key: K, clearedValue: T[K]) => {
      let value = target[key];
      Object.defineProperty(target, key, {
        configurable: true,
        enumerable: true,
        get: () => value,
        set: (next: T[K]) => {
          value = next;
          if (next === clearedValue) throw new Error("local-cleanup-fault-sentinel");
        }
      });
    };
    const cases: Array<{ label: string; inject: (fixture: Fixture) => void }> = [
      { label: "claim fields", inject: ({ claims }) => clearThenThrowSetter(claims[0]!, "text", "") },
      { label: "original tokens", inject: ({ originalTokens }) => Object.freeze(originalTokens[0]!) },
      { label: "current tokens", inject: ({ currentTokens }) => Object.freeze(currentTokens[0]!) },
      { label: "requirements array", inject: ({ requirements }) => Object.freeze(requirements) },
      { label: "solutionClaims array", inject: ({ solutionClaims }) => Object.freeze(solutionClaims) },
      { label: "payload text", inject: ({ payloads }) => clearThenThrowSetter(payloads[0]!, "text", undefined) },
      { label: "table cells", inject: ({ cells }) => clearThenThrowSetter(cells[0]!, "value", "") },
      {
        label: "buffers",
        inject: ({ buffers }) => { structuredClone(buffers[0]!, { transfer: [buffers[0]!.buffer] }); }
      }
    ];

    for (const testCase of cases) {
      const fixture = createCleanupFixture();
      testCase.inject(fixture);

      expect(() => fixture.analysis.clear(), testCase.label).toThrowError(expect.objectContaining({ code: "INTERNAL_ERROR", message: "Internal error" }));
      for (const claim of fixture.claims) {
        expect(claim.text, `${testCase.label} claim text`).toBe("");
        expect(claim.key, `${testCase.label} claim key`).toBe("");
        expect(claim.value, `${testCase.label} claim value`).toBeUndefined();
        expect(claim.tokens, `${testCase.label} current claim tokens`).toEqual([]);
      }
      fixture.originalTokens.forEach((tokens, index) => {
        if (testCase.label !== "original tokens" || index !== 0) expect(tokens, `${testCase.label} original tokens ${index}`).toHaveLength(0);
      });
      fixture.currentTokens.forEach((tokens, index) => {
        if (testCase.label !== "current tokens" || index !== 0) expect(tokens, `${testCase.label} current tokens ${index}`).toHaveLength(0);
      });
      if (testCase.label !== "requirements array") expect(fixture.requirements).toHaveLength(0);
      if (testCase.label !== "solutionClaims array") expect(fixture.solutionClaims).toHaveLength(0);
      expect(fixture.payloads.every((payload) => payload.text === undefined && payload.tableCells === undefined && payload.bytes === undefined), testCase.label).toBe(true);
      expect(fixture.cells.every((cell) => cell.value === ""), testCase.label).toBe(true);
      expect(fixture.buffers[1], `${testCase.label} later buffer`).toEqual(new Uint8Array([0, 0]));
      if (testCase.label !== "buffers") expect(fixture.buffers[0], `${testCase.label} first buffer`).toEqual(new Uint8Array([0, 0]));
      if (testCase.label === "original tokens") expect(fixture.originalTokens[0]).not.toHaveLength(0);
      if (testCase.label === "current tokens") expect(fixture.currentTokens[0]).not.toHaveLength(0);
      if (testCase.label === "requirements array") expect(fixture.requirements).not.toHaveLength(0);
      if (testCase.label === "solutionClaims array") expect(fixture.solutionClaims).not.toHaveLength(0);
      if (testCase.label === "buffers") expect(fixture.buffers[0]!.byteLength).toBe(0);
    }
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
