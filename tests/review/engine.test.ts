import { describe, expect, it } from "vitest";
import { createDeterministicReviewAnalyzer, orchestrateReview } from "../../src/review/engine.js";
import { buildReviewAnalysisInput } from "../../src/review/analysis.js";

const hash = (id: string) => id.padEnd(64, "0");
function evidence(id: string, role: "assignment_brief" | "rubric" | "teacher_instructions" | "solution", text: string) {
  const lines = text.split("\n");
  return {
    normalizedEvidence: [{ source: { id, type: "text" as const, reference: `inline://${id}` }, contentHash: hash(id), extraction: { extractor: "text", extractorVersion: "1", generatedAt: "1970-01-01T00:00:00.000Z", partial: false }, references: lines.map((_, index) => ({ kind: "text" as const, startLine: index + 1, endLine: index + 1 })), warnings: [] }],
    analysisPayloads: [{ evidenceId: id, role, type: "text" as const, reference: `inline://${id}`, contentHash: hash(id), text, byteLength: text.length, references: lines.map((_, index) => ({ kind: "text" as const, startLine: index + 1, endLine: index + 1 })) }]
  };
}

describe("deterministic review engine", () => {
  it("exposes a provider-neutral analyzer boundary", () => {
    expect(createDeterministicReviewAnalyzer().name).toBe("deterministic-rules");
    expect(createDeterministicReviewAnalyzer().version).toBe("1.0.0");
  });

  it("emits stable omission and suppresses it for an ordinary solution claim", () => {
    const result = orchestrateReview(buildReviewAnalysisInput({ normalizedEvidence: [], analysisPayloads: [] }));
    expect(result).toEqual([]);
  });

  it("emits omission, solution contradiction, and cross-role conflict deterministically", () => {
    const sources = [evidence("brief", "assignment_brief", "Students must include a conclusion.\nStudents must achieve coverage = 80%"), evidence("rubric", "rubric", "Students must achieve coverage = 90%"), evidence("teacher", "teacher_instructions", "Students must include a conclusion."), evidence("solution", "solution", "coverage = 70%")];
    const bundle = { normalizedEvidence: sources.flatMap((source) => source.normalizedEvidence), analysisPayloads: sources.flatMap((source) => source.analysisPayloads) };
    const fresh = () => buildReviewAnalysisInput(JSON.parse(JSON.stringify(bundle)));
    const first = orchestrateReview(fresh());
    const second = orchestrateReview(fresh());
    expect(first).toEqual(second);
    expect(first.map((finding) => finding.type)).toEqual(expect.arrayContaining(["omission", "contradiction", "requirement_conflict"]));
    expect(first.every((finding) => finding.followUpChecks.length > 0 && finding.observation && finding.interpretation && finding.uncertainty)).toBe(true);
    expect(new Set(first.map((finding) => finding.id)).size).toBe(first.length);
  });

  it("suppresses an ordinary statement and assignment when they satisfy requirements", () => {
    const requirement = evidence("brief", "assignment_brief", "Students must include a conclusion.\nStudents must achieve coverage = 80%");
    const solution = evidence("solution", "solution", "The report includes a conclusion.\ncoverage = 80%");
    const findings = orchestrateReview(buildReviewAnalysisInput({ normalizedEvidence: [...requirement.normalizedEvidence, ...solution.normalizedEvidence], analysisPayloads: [...requirement.analysisPayloads, ...solution.analysisPayloads] }));
    expect(findings).toHaveLength(0);
  });

  it.each(["The conclusion is absent.", "The report does not include a conclusion.", "The report lacks a conclusion.", "There is no conclusion."])("detects negative predicate: %s", (solutionText) => {
    const requirement = evidence("brief", "assignment_brief", "Students must include a conclusion.");
    const solution = evidence("solution", "solution", solutionText);
    const findings = orchestrateReview(buildReviewAnalysisInput({ normalizedEvidence: [...requirement.normalizedEvidence, ...solution.normalizedEvidence], analysisPayloads: [...requirement.analysisPayloads, ...solution.analysisPayloads] }));
    expect(findings.map((finding) => finding.type)).toEqual(["contradiction"]);
  });

  it("does not match unrelated claims with one shared token", () => {
    const requirement = evidence("brief", "assignment_brief", "Students must include a conclusion.");
    const solution = evidence("solution", "solution", "The conclusion discusses unrelated historical context.");
    const findings = orchestrateReview(buildReviewAnalysisInput({ normalizedEvidence: [...requirement.normalizedEvidence, ...solution.normalizedEvidence], analysisPayloads: [...requirement.analysisPayloads, ...solution.analysisPayloads] }));
    expect(findings.map((finding) => finding.type)).toEqual(["omission"]);
  });
});
