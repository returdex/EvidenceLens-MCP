import { describe, expect, it } from "vitest";
import { type ReviewProvider, type ProviderReviewRequest, type ProviderReviewResult } from "../../src/providers/types.js";
import { ProviderValidationError, resolveProviderCitation, validateProviderFinding } from "../../src/providers/provenance.js";
import type { DiagnosticFeature, DiagnosticSink } from "../../src/providers/diagnostics.js";

const hash = "a".repeat(64);
const normalizedEvidence = [{
  source: { id: "brief", type: "text" as const, reference: "inline://brief" },
  role: "assignment_brief" as const,
  contentHash: hash,
  extraction: { extractor: "test", extractorVersion: "1", generatedAt: "1970-01-01T00:00:00.000Z", partial: false },
  references: [{ kind: "text" as const, startLine: 1, endLine: 1 }],
  warnings: []
}];

const request: ProviderReviewRequest = {
  evidence: [], requirements: [], solutionClaims: [], objective: "review", promptVersion: "v1",
  inference: { model: "deepseek-v4-pro", temperature: 0, maxTokens: 100 }, inputFingerprint: "b".repeat(64)
};

describe("provider contract", () => {
  it("allows an independent implementation to satisfy the provider seam", async () => {
    const fake: ReviewProvider = {
      name: "fake",
      async review(input) {
        expect(input).toBe(request);
        const result: ProviderReviewResult = { provider: "fake", model: "test", promptVersion: "v1", inputFingerprint: input.inputFingerprint, modelFindings: [], deterministicFindings: [] };
        return result;
      }
    };
    await expect(fake.review(request)).resolves.toMatchObject({ provider: "fake", modelFindings: [], deterministicFindings: [] });
  });

  it("resolves a citation only when every provenance field matches", () => {
    expect(resolveProviderCitation(normalizedEvidence, { evidenceId: "brief", role: "assignment_brief", contentHash: hash, sourceReference: "inline://brief", location: { kind: "text", startLine: 1, endLine: 1 }, visual: false })).toMatchObject({ evidenceId: "brief", role: "assignment_brief", contentHash: hash });
    const base = { evidenceId: "brief", role: "assignment_brief" as const, contentHash: hash, sourceReference: "inline://brief", location: { kind: "text" as const, startLine: 1, endLine: 1 }, visual: false };
    for (const forged of [{ ...base, evidenceId: "missing" }, { ...base, role: "solution" as const }, { ...base, contentHash: "c".repeat(64) }, { ...base, sourceReference: "inline://other" }, { ...base, location: { kind: "text" as const, startLine: 2, endLine: 2 } }]) {
      expect(() => resolveProviderCitation(normalizedEvidence, forged)).toThrowError(ProviderValidationError);
    }
  });

  it("enriches compact citation references from normalized evidence", () => {
    expect(resolveProviderCitation(normalizedEvidence, { evidenceId: "brief", location: { kind: "text", startLine: 1, endLine: 1 }, visual: false })).toEqual({
      evidenceId: "brief", role: "assignment_brief", contentHash: hash, sourceReference: "inline://brief",
      location: { kind: "text", startLine: 1, endLine: 1 }, visual: false
    });
  });

  it("rejects duplicate, unsorted, and incomplete findings", () => {
    const citation = { evidenceId: "brief", role: "assignment_brief" as const, contentHash: hash, sourceReference: "inline://brief", location: { kind: "text" as const, startLine: 1, endLine: 1 }, visual: false };
    const finding = { id: "f1", type: "omission" as const, severity: "medium" as const, confidence: "medium" as const, title: "Missing", summary: "Missing", observation: "Missing", interpretation: "Missing", followUpChecks: ["Check"], evidenceIds: ["brief"], citations: [citation] };
    expect(validateProviderFinding(normalizedEvidence, finding)).toMatchObject({ id: "f1", evidenceIds: ["brief"] });
    expect(() => validateProviderFinding(normalizedEvidence, { ...finding, citations: [citation, citation], evidenceIds: ["brief", "brief"] })).toThrowError(ProviderValidationError);
    expect(() => validateProviderFinding(normalizedEvidence, { ...finding, evidenceIds: ["missing"] })).toThrowError(ProviderValidationError);
  });

  it("emits one provenance feature at the owning throw site without disclosing details", () => {
    const features: DiagnosticFeature[] = [];
    const sink: DiagnosticSink = { emit(feature) { features.push(feature); return true; } };
    const forged = { evidenceId: "missing-private-path", location: { kind: "text" as const, startLine: 1, endLine: 1 }, visual: false };
    expect(() => resolveProviderCitation(normalizedEvidence, forged, sink)).toThrowError(ProviderValidationError);
    expect(features).toEqual([{ path: ["citations", "evidenceId"], code: "invalid_value" }]);
    expect(JSON.stringify(features)).not.toContain("missing-private-path");
  });
});
