import { z } from "zod/v4";
import {
  contentHashSchema,
  evidenceRoleSchema,
  normalizedEvidenceReferenceSchema,
  reviewFindingSchema,
  type NormalizedEvidence,
  type NormalizedEvidenceReference,
  type ReviewCitation,
  type ReviewFinding
} from "../contracts/review.js";

export class ProviderValidationError extends Error {
  readonly code = "PROVIDER_INVALID_RESPONSE" as const;

  constructor(message = "Provider response failed local validation") {
    super(message);
    this.name = "ProviderValidationError";
  }
}

const providerCitationDraftSchema = z.object({
  evidenceId: z.string().min(1).max(128),
  role: evidenceRoleSchema,
  contentHash: contentHashSchema,
  sourceReference: z.string().min(1).max(2048),
  location: normalizedEvidenceReferenceSchema,
  visual: z.boolean(),
  visualPayloadSha256: contentHashSchema.optional()
}).strict();

const providerFindingDraftSchema = z.object({
  id: z.string().min(1).max(128),
  type: z.enum(["omission", "contradiction", "requirement_conflict", "evidence_quality"]),
  severity: z.enum(["info", "low", "medium", "high"]),
  confidence: z.enum(["high", "medium", "low", "unknown"]),
  title: z.string().min(1).max(4000),
  summary: z.string().min(1).max(4000),
  observation: z.string().min(1).max(4000),
  interpretation: z.string().min(1).max(4000),
  uncertainty: z.string().min(1).max(4000).optional(),
  followUpChecks: z.array(z.string().min(1).max(4000)).min(1).max(10),
  evidenceIds: z.array(z.string().min(1).max(128)).min(1),
  citations: z.array(providerCitationDraftSchema).min(1).max(20)
}).strict();

export type ProviderCitationDraft = z.infer<typeof providerCitationDraftSchema>;
export type ProviderFindingDraft = z.infer<typeof providerFindingDraftSchema>;

function sameReference(left: NormalizedEvidenceReference, right: NormalizedEvidenceReference): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function visualPayloadHash(evidence: NormalizedEvidence, location: NormalizedEvidenceReference): string | undefined {
  if (evidence.source.type === "pdf" && location.kind === "pdf") {
    return evidence.visualPayloads?.find((payload) => payload.pageNumber === location.pageNumber)?.sha256;
  }
  if ((evidence.source.type === "image" || evidence.source.type === "screenshot") && location.kind === "image") {
    return evidence.visualPayload?.sha256;
  }
  return undefined;
}

function fail(message: string): never {
  throw new ProviderValidationError(message);
}

export function resolveProviderCitation(
  normalizedEvidence: readonly NormalizedEvidence[],
  draft: ProviderCitationDraft
): ReviewCitation {
  const parsed = providerCitationDraftSchema.safeParse(draft);
  if (!parsed.success) fail("Provider citation draft is malformed");

  const evidence = normalizedEvidence.find((candidate) => candidate.source.id === parsed.data.evidenceId);
  if (!evidence) fail("Provider citation evidence is not present in normalized evidence");
  if (evidence.role !== parsed.data.role) fail("Provider citation role does not match normalized evidence");
  if (evidence.contentHash !== parsed.data.contentHash) fail("Provider citation content hash does not match normalized evidence");
  if (evidence.source.reference !== parsed.data.sourceReference) fail("Provider citation source reference does not match normalized evidence");
  if (!evidence.references.some((reference) => sameReference(reference, parsed.data.location))) fail("Provider citation location is not present in normalized evidence");

  const payloadHash = visualPayloadHash(evidence, parsed.data.location);
  if (parsed.data.visual && payloadHash === undefined) fail("Provider visual citation has no retained payload");
  if (parsed.data.visualPayloadSha256 !== undefined && parsed.data.visualPayloadSha256 !== payloadHash) fail("Provider visual payload hash does not match normalized evidence");
  if ((evidence.source.type === "image" || evidence.source.type === "screenshot") && !parsed.data.visual) fail("Image citations must be visual");

  return {
    evidenceId: evidence.source.id,
    role: evidence.role,
    contentHash: evidence.contentHash,
    sourceReference: evidence.source.reference,
    location: parsed.data.location,
    visual: parsed.data.visual,
    ...(payloadHash ? { visualPayloadSha256: payloadHash } : {})
  };
}

export function validateProviderFinding(
  normalizedEvidence: readonly NormalizedEvidence[],
  draft: ProviderFindingDraft
): ReviewFinding {
  const parsed = providerFindingDraftSchema.safeParse(draft);
  if (!parsed.success) fail("Provider finding draft is malformed");

  const citations = parsed.data.citations.map((citation) => resolveProviderCitation(normalizedEvidence, citation));
  const citationIds = citations.map((citation) => citation.evidenceId);
  if (new Set(citationIds).size !== citationIds.length) fail("Provider citations must be unique");
  if (citationIds.some((id, index) => index > 0 && id.localeCompare(citationIds[index - 1]!) < 0)) fail("Provider citations must be sorted");
  if (parsed.data.evidenceIds.length !== citations.length || parsed.data.evidenceIds.some((id, index) => id !== citationIds[index])) fail("Provider evidenceIds must match sorted citations");

  const finding = reviewFindingSchema.safeParse({ ...parsed.data, citations });
  if (!finding.success) fail("Provider finding failed strict local validation");
  return finding.data;
}

export function validateProviderFindings(
  normalizedEvidence: readonly NormalizedEvidence[],
  drafts: readonly ProviderFindingDraft[]
): ReviewFinding[] {
  try {
    const findings = drafts.map((draft) => validateProviderFinding(normalizedEvidence, draft));
    if (new Set(findings.map((finding) => finding.id)).size !== findings.length) fail("Provider finding ids must be unique");
    return findings;
  } catch (error) {
    if (error instanceof ProviderValidationError) throw error;
    throw new ProviderValidationError();
  }
}
