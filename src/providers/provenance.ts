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
import { ProviderError } from "./errors.js";
import type { DiagnosticFeature, DiagnosticSink } from "./diagnostics.js";
import {
  MAX_PROVIDER_CITATIONS,
  MAX_PROVIDER_FINDINGS,
  MAX_PROVIDER_FOLLOW_UP_CHARS,
  MAX_PROVIDER_FOLLOW_UP_CHECKS,
  MAX_PROVIDER_PROSE_CHARS,
  MAX_PROVIDER_TITLE_CHARS
} from "./types.js";

export class ProviderValidationError extends ProviderError {
  constructor(_message?: string) { super("PROVIDER_INVALID_RESPONSE", { retryable: false }); }
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

const providerCitationReferenceSchema = z.object({
  evidenceId: z.string().min(1).max(128),
  location: normalizedEvidenceReferenceSchema,
  visual: z.boolean()
}).strict();

const providerFindingDraftSchema = z.object({
  id: z.string().min(1).max(128),
  type: z.enum(["omission", "contradiction", "requirement_conflict", "evidence_quality"]),
  severity: z.enum(["info", "low", "medium", "high"]),
  confidence: z.enum(["high", "medium", "low", "unknown"]),
  title: z.string().min(1).max(MAX_PROVIDER_TITLE_CHARS),
  summary: z.string().min(1).max(MAX_PROVIDER_PROSE_CHARS),
  observation: z.string().min(1).max(MAX_PROVIDER_PROSE_CHARS),
  interpretation: z.string().min(1).max(MAX_PROVIDER_PROSE_CHARS),
  uncertainty: z.string().min(1).max(MAX_PROVIDER_PROSE_CHARS).optional(),
  followUpChecks: z.array(z.string().min(1).max(MAX_PROVIDER_FOLLOW_UP_CHARS)).min(1).max(MAX_PROVIDER_FOLLOW_UP_CHECKS),
  evidenceIds: z.array(z.string().min(1).max(128)).min(1),
  citations: z.array(z.union([providerCitationDraftSchema, providerCitationReferenceSchema])).min(1).max(MAX_PROVIDER_CITATIONS)
});

export type ProviderCitationDraft = z.infer<typeof providerCitationDraftSchema> | z.infer<typeof providerCitationReferenceSchema>;
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

function fail(message: string, diagnostics?: DiagnosticSink, feature?: DiagnosticFeature): never {
  if (feature !== undefined) diagnostics?.emit(feature);
  throw new ProviderValidationError(message);
}

function findingSchemaFeature(error: z.ZodError): DiagnosticFeature {
  const issue = error.issues[0];
  if (issue?.code === "unrecognized_keys") return { path: ["findings", "keyset"], code: "unrecognized_keys" };
  const field = issue?.path[0];
  if (field === "id") return { path: ["findings", "id"], code: "invalid_type" };
  if (field === "type") return { path: ["findings", "type"], code: "invalid_value" };
  if (field === "severity" || field === "confidence") return { path: ["findings", "enum"], code: "invalid_value" };
  if (["title", "summary", "observation", "interpretation", "uncertainty"].includes(String(field))) {
    return { path: ["findings", "text"], code: "too_big" };
  }
  if (field === "followUpChecks") return { path: ["findings", "followUpChecks"], code: "too_small" };
  if (field === "evidenceIds") return { path: ["findings", "evidenceIds"], code: "custom" };
  return { path: ["findings", "citations"], code: "custom" };
}

export function resolveProviderCitation(
  normalizedEvidence: readonly NormalizedEvidence[],
  draft: ProviderCitationDraft,
  diagnostics?: DiagnosticSink
): ReviewCitation {
  const parsed = z.union([providerCitationDraftSchema, providerCitationReferenceSchema]).safeParse(draft);
  if (!parsed.success) fail("Provider citation draft is malformed", diagnostics, { path: ["findings", "citations"], code: "custom" });

  const evidence = normalizedEvidence.find((candidate) => candidate.source.id === parsed.data.evidenceId);
  if (!evidence) fail("Provider citation evidence is not present in normalized evidence", diagnostics, { path: ["citations", "evidenceId"], code: "invalid_value" });
  if (!evidence.references.some((reference) => sameReference(reference, parsed.data.location))) fail("Provider citation location is not present in normalized evidence", diagnostics, { path: ["citations", "location"], code: "invalid_value" });

  if ("role" in parsed.data) {
    if (evidence.role !== parsed.data.role) fail("Provider citation role does not match normalized evidence", diagnostics, { path: ["citations", "evidenceId"], code: "invalid_value" });
    if (evidence.contentHash !== parsed.data.contentHash) fail("Provider citation content hash does not match normalized evidence", diagnostics, { path: ["citations", "contentHash"], code: "invalid_value" });
    if (evidence.source.reference !== parsed.data.sourceReference) fail("Provider citation source reference does not match normalized evidence", diagnostics, { path: ["citations", "sourceReference"], code: "invalid_value" });
  }

  const payloadHash = visualPayloadHash(evidence, parsed.data.location);
  if (parsed.data.visual && payloadHash === undefined) fail("Provider visual citation has no retained payload", diagnostics, { path: ["citations", "visual"], code: "custom" });
  if ("visualPayloadSha256" in parsed.data && parsed.data.visualPayloadSha256 !== undefined && parsed.data.visualPayloadSha256 !== payloadHash) fail("Provider visual payload hash does not match normalized evidence", diagnostics, { path: ["citations", "contentHash"], code: "invalid_value" });
  if ((evidence.source.type === "image" || evidence.source.type === "screenshot") && !parsed.data.visual) fail("Image citations must be visual", diagnostics, { path: ["citations", "visual"], code: "custom" });

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
  draft: ProviderFindingDraft,
  diagnostics?: DiagnosticSink
): ReviewFinding {
  const parsed = providerFindingDraftSchema.safeParse(draft);
  if (!parsed.success) fail("Provider finding draft is malformed", diagnostics, findingSchemaFeature(parsed.error));

  const citations = parsed.data.citations.map((citation) => resolveProviderCitation(normalizedEvidence, citation, diagnostics));
  const citationIds = citations.map((citation) => citation.evidenceId);
  if (new Set(citationIds).size !== citationIds.length) fail("Provider citations must be unique", diagnostics, { path: ["provenance", "unique"], code: "custom" });
  if (citationIds.some((id, index) => index > 0 && id.localeCompare(citationIds[index - 1]!) < 0)) fail("Provider citations must be sorted", diagnostics, { path: ["provenance", "order"], code: "custom" });
  if (parsed.data.evidenceIds.length !== citations.length || parsed.data.evidenceIds.some((id, index) => id !== citationIds[index])) fail("Provider evidenceIds must match sorted citations", diagnostics, { path: ["findings", "evidenceIds"], code: "custom" });

  const finding = reviewFindingSchema.safeParse({ ...parsed.data, citations });
  if (!finding.success) fail("Provider finding failed strict local validation", diagnostics, { path: ["findings", "citations"], code: "custom" });
  return finding.data;
}

export function validateProviderFindings(
  normalizedEvidence: readonly NormalizedEvidence[],
  drafts: readonly ProviderFindingDraft[],
  diagnostics?: DiagnosticSink
): ReviewFinding[] {
  try {
    if (drafts.length > MAX_PROVIDER_FINDINGS) fail("Provider returned too many findings", diagnostics, { path: ["findings"], code: "too_big" });
    const findings = drafts.map((draft) => validateProviderFinding(normalizedEvidence, draft, diagnostics));
    if (new Set(findings.map((finding) => finding.id)).size !== findings.length) fail("Provider finding ids must be unique", diagnostics, { path: ["provenance", "unique"], code: "custom" });
    return findings;
  } catch (error) {
    if (error instanceof ProviderValidationError) throw error;
    throw new ProviderValidationError();
  }
}
