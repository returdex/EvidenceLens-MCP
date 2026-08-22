import { sha256Hex } from "../evidence/hash.js";
import type { ReviewFinding, ReviewFindingType } from "../contracts/review.js";
import type { Claim, ReviewAnalysisInput } from "./analysis.js";

export interface ReviewAnalyzer {
  readonly name: "deterministic-rules";
  readonly version: "1.0.0";
  analyze(input: ReviewAnalysisInput): ReviewFinding[];
}

const authoritativeRoles = new Set(["assignment_brief", "rubric", "teacher_instructions"]);

function overlap(left: Claim, right: Claim): number {
  const rightTokens = new Set(right.tokens);
  return left.tokens.filter((token) => rightTokens.has(token)).length;
}

function sameKey(left: Claim, right: Claim): boolean {
  return left.key === right.key || overlap(left, right) >= Math.max(1, Math.min(2, Math.ceil(Math.min(left.tokens.length, right.tokens.length) / 3)));
}

function conflicting(left: Claim, right: Claim): boolean {
  if (!sameKey(left, right)) return false;
  if (left.negated !== right.negated) return true;
  return left.value !== undefined && right.value !== undefined && left.value !== right.value;
}

function visualClaim(input: ReviewAnalysisInput, claim: Claim): boolean {
  const evidence = input.normalizedEvidence.find((candidate) => candidate.source.id === claim.evidenceId);
  if (evidence?.source.type === "image" || evidence?.source.type === "screenshot") return true;
  const location = claim.location;
  if (location.kind !== "pdf") return false;
  return evidence?.visualPayloads?.some((payload) => payload.pageNumber === location.pageNumber) === true;
}

function makeFinding(input: ReviewAnalysisInput, type: ReviewFindingType, claims: Claim[], title: string, summary: string, uncertainty: string): ReviewFinding {
  const sortedClaims = [...claims].sort((a, b) => a.evidenceId.localeCompare(b.evidenceId) || JSON.stringify(a.location).localeCompare(JSON.stringify(b.location)));
  const citations = sortedClaims.map((claim) => input.resolveCitation(claim.evidenceId, claim.location, visualClaim(input, claim)));
  const uniqueCitations = citations.filter((citation, index) => citations.findIndex((candidate) => candidate.evidenceId === citation.evidenceId) === index).sort((a, b) => a.evidenceId.localeCompare(b.evidenceId));
  const evidenceIds = uniqueCitations.map((citation) => citation.evidenceId).sort();
  const key = [...new Set(claims.map((claim) => claim.key))].sort().join("|");
  const id = `${type}-${sha256Hex(`${type}|${evidenceIds.join(",")}|${key}`).slice(0, 24)}`;
  return {
    id, type, severity: type === "omission" ? "medium" : "high", confidence: "medium",
    title, summary, observation: `Rule ${type} matched normalized claim key ${key}.`,
    interpretation: summary,
    uncertainty,
    followUpChecks: ["Inspect the cited source locations and confirm the intended requirement or value."],
    evidenceIds, citations: uniqueCitations
  };
}

/** Rule precedence: requirement conflicts first, then solution contradictions, then omissions. Stable ids and sort use type, evidence ids, and claim key. */
export function createDeterministicReviewAnalyzer(): ReviewAnalyzer {
  return {
    name: "deterministic-rules",
    version: "1.0.0",
    analyze(input) {
      const findings: ReviewFinding[] = [];
      const requirements = input.requirements.filter((claim) => authoritativeRoles.has(claim.role));
      const conflicts = new Map<string, Claim[]>();
      for (let index = 0; index < requirements.length; index += 1) {
        for (let next = index + 1; next < requirements.length; next += 1) {
          const left = requirements[index];
          const right = requirements[next];
          if (left.role !== right.role && conflicting(left, right)) conflicts.set(left.key, [...(conflicts.get(left.key) ?? [left]), right]);
        }
      }
      for (const claims of conflicts.values()) findings.push(makeFinding(input, "requirement_conflict", claims, "Conflicting requirement", "Authoritative course sources state incompatible obligations or values.", "Lexical comparison cannot establish which authoritative instruction takes precedence."));

      for (const requirement of requirements) {
        const solution = input.solutionClaims.filter((claim) => sameKey(requirement, claim));
        const contradictory = solution.find((claim) => conflicting(requirement, claim));
        if (contradictory) findings.push(makeFinding(input, "contradiction", [requirement, contradictory], "Solution contradicts a requirement", "The solution claim has an opposing negation or incompatible scalar value.", "Lexical comparison cannot establish intent beyond the cited wording; confirm the value and its units."));
        else if (solution.length === 0) findings.push(makeFinding(input, "omission", [requirement], "Required claim may be omitted", "No sufficiently overlapping solution claim was found for this obligation.", "The deterministic lexical rule may miss a semantically equivalent claim; inspect the solution around the cited requirement."));
      }
      return findings.sort((a, b) => a.id.localeCompare(b.id));
    }
  };
}

export function orchestrateReview(input: ReviewAnalysisInput & { reviewId?: string; objective?: string }): ReviewFinding[] {
  const analyzer = createDeterministicReviewAnalyzer();
  try {
    return analyzer.analyze(input);
  } finally {
    input.clear();
  }
}
