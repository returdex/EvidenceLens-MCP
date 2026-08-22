import type { EvidenceRole, ReviewRequest } from "../contracts/review.js";

export const requiredReviewRoles = [
  "assignment_brief",
  "rubric",
  "solution",
  "teacher_instructions"
] as const satisfies readonly EvidenceRole[];

export type ReviewRoleValidation =
  | { ok: true; missing: []; duplicates: [] }
  | { ok: false; missing: EvidenceRole[]; duplicates: EvidenceRole[] };

export function validateReviewRoles(request: Pick<ReviewRequest, "evidence">): ReviewRoleValidation {
  const counts = new Map<EvidenceRole, number>();
  for (const evidence of request.evidence) counts.set(evidence.role, (counts.get(evidence.role) ?? 0) + 1);
  const missing = requiredReviewRoles.filter((role) => (counts.get(role) ?? 0) === 0);
  const duplicates = requiredReviewRoles.filter((role) => (counts.get(role) ?? 0) > 1);
  return missing.length === 0 && duplicates.length === 0
    ? { ok: true, missing: [], duplicates: [] }
    : { ok: false, missing: [...missing].sort(), duplicates: [...duplicates].sort() };
}
