import { isProxy } from "node:util/types";
import { z } from "zod/v4";
import {
  reviewFindingSchema,
  type ReviewFinding,
  EvidenceRole,
  EvidenceType,
  NormalizedEvidenceReference
} from "../contracts/review.js";
import { DEEPSEEK_MODELS } from "./config.js";

export const PROVIDER_PROMPT_VERSION = "evidencelens-review-v3" as const;
export const MAX_PROVIDER_FINDINGS = 4;
export const MAX_PROVIDER_TITLE_CHARS = 120;
export const MAX_PROVIDER_PROSE_CHARS = 360;
export const MAX_PROVIDER_FOLLOW_UP_CHECKS = 2;
export const MAX_PROVIDER_FOLLOW_UP_CHARS = 240;
export const MAX_PROVIDER_CITATIONS = 4;
export const PROVIDER_REVIEW_RESULT_KEYS = Object.freeze([
  "provider",
  "model",
  "promptVersion",
  "inputFingerprint",
  "modelFindings",
  "deterministicFindings"
] as const);

export function isProviderReviewResultEnvelope(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== PROVIDER_REVIEW_RESULT_KEYS.length
    || keys.some((key) => typeof key !== "string" || !PROVIDER_REVIEW_RESULT_KEYS.includes(key as typeof PROVIDER_REVIEW_RESULT_KEYS[number]))
  ) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  for (const key of PROVIDER_REVIEW_RESULT_KEYS) {
    const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) return false;
  }
  return !isProxy(value);
}

export const providerInferenceSettingsSchema = z
  .object({
    model: z.enum(DEEPSEEK_MODELS),
    temperature: z.number().finite().min(0).max(2),
    maxTokens: z.number().finite().int().min(1).max(393_216).optional()
  })
  .strict();

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

export type ProviderInferenceSettings = z.infer<typeof providerInferenceSettingsSchema>;

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

export interface ProviderRequestReceipt {
  readonly schema: "evidencelens.provider-request-receipt.v1";
  readonly generation: string;
  readonly reservation_count: 1;
  readonly observed_provider_requests: 0 | 1;
  readonly max_retries: 0;
  readonly fallback: false;
  readonly diagnostic_second_call: false;
  readonly mac: string;
}

export interface ProviderRequestBudget {
  acquireHttpSend(): void;
  receipt(): ProviderRequestReceipt;
}
