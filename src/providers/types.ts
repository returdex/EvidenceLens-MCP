import { z } from "zod/v4";
import {
  reviewFindingSchema,
  type ReviewFinding,
  EvidenceRole,
  EvidenceType,
  NormalizedEvidenceReference
} from "../contracts/review.js";

export const PROVIDER_PROMPT_VERSION = "evidencelens-review-v1" as const;
export const MAX_PROVIDER_FINDINGS = 100;

export const providerReviewResultSchema = z
  .object({
    provider: z.string().regex(/^[a-z][a-z0-9-]{0,31}$/u),
    model: z.string().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/u),
    promptVersion: z.string().min(1).max(128),
    inputFingerprint: z.string().regex(/^[a-f0-9]{64}$/u),
    modelFindings: z.array(reviewFindingSchema).max(MAX_PROVIDER_FINDINGS),
    deterministicFindings: z.array(reviewFindingSchema).max(MAX_PROVIDER_FINDINGS)
  })
  .strict();

export interface ProviderTextClaim {
  text: string;
  evidenceId: string;
  role: EvidenceRole;
  location: NormalizedEvidenceReference;
  kind: "requirement" | "solution";
}

export interface ProviderTableCell {
  value: string;
  evidenceId: string;
  role: EvidenceRole;
  location: Extract<NormalizedEvidenceReference, { kind: "table" }>;
}

export interface ProviderVisualPayload {
  mimeType: "image/png" | "image/jpeg";
  base64: string;
  byteLength: number;
  sha256: string;
  width: number;
  height: number;
  evidenceId: string;
  location: Extract<NormalizedEvidenceReference, { kind: "image" | "pdf" }>;
}

export interface ProviderEvidenceItem {
  evidenceId: string;
  role: EvidenceRole;
  type: EvidenceType;
  contentHash: string;
  sourceReference: string;
  references: readonly NormalizedEvidenceReference[];
  text?: string;
  tableCells?: readonly ProviderTableCell[];
  visualPayloads?: readonly ProviderVisualPayload[];
}

export interface ProviderInferenceSettings {
  model: "deepseek-v4-pro" | "deepseek-v4-flash" | "deepseek-v4-flash-vision-exp";
  temperature: number;
  maxTokens: number;
}

export interface ProviderReviewRequest {
  evidence: readonly ProviderEvidenceItem[];
  requirements: readonly ProviderTextClaim[];
  solutionClaims: readonly ProviderTextClaim[];
  objective: string;
  promptVersion: string;
  inference: ProviderInferenceSettings;
  inputFingerprint: string;
}

export interface ProviderReviewResult {
  provider: string;
  model: string;
  promptVersion: string;
  inputFingerprint: string;
  modelFindings: readonly ReviewFinding[];
  deterministicFindings: readonly ReviewFinding[];
}

export interface ReviewProvider {
  readonly name: string;
  review(request: ProviderReviewRequest): Promise<ProviderReviewResult>;
}
