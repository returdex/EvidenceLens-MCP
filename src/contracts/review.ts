import { z } from "zod/v4";

const noAsciiControlCharacters = /^[^\u0000-\u001F\u007F]*$/u;

export const evidenceRoleSchema = z.enum([
  "assignment_brief",
  "rubric",
  "teacher_instructions",
  "solution",
  "other"
]);

export const evidenceTypeSchema = z.enum(["text", "pdf", "image", "screenshot", "table"]);

export const contentHashSchema = z.string().regex(/^[a-f0-9]{64}$/u, "content hash must be a lowercase SHA-256 hex digest");

export const evidenceSourceIdentitySchema = z
  .object({
    id: z.string().min(1).max(128),
    type: evidenceTypeSchema,
    reference: z.string().min(1).max(2048).regex(noAsciiControlCharacters, "reference must not contain ASCII control characters")
  })
  .strict();

export const extractionMetadataSchema = z
  .object({
    extractor: z.string().min(1).max(128),
    extractorVersion: z.string().min(1).max(64),
    generatedAt: z.string().datetime(),
    partial: z.boolean()
  })
  .strict();

export const extractionWarningSchema = z
  .object({
    code: z.string().min(1).max(128).regex(/^[A-Z0-9_]+$/u),
    message: z.string().min(1).max(1000).regex(noAsciiControlCharacters, "warning message must not contain ASCII control characters")
  })
  .strict();

const positiveInt = z.number().int().min(1);
const boundedDimension = positiveInt.max(100_000);

export const textReferenceSchema = z
  .object({ kind: z.literal("text"), startLine: positiveInt, endLine: positiveInt })
  .strict()
  .refine((reference) => reference.endLine >= reference.startLine, "endLine must be greater than or equal to startLine");

export const pdfPageReferenceSchema = z
  .object({ kind: z.literal("pdf"), pageNumber: positiveInt, pageCount: positiveInt.optional() })
  .strict()
  .superRefine((reference, ctx) => {
    if (reference.pageCount !== undefined && reference.pageNumber > reference.pageCount) {
      ctx.addIssue({ code: "too_big", maximum: reference.pageCount, origin: "number", path: ["pageNumber"], inclusive: true, message: "pageNumber exceeds pageCount" });
    }
  });

export const imageReferenceSchema = z
  .object({
    kind: z.literal("image"),
    width: boundedDimension.optional(),
    height: boundedDimension.optional(),
    mimeType: z.string().regex(/^image\/(?:png|jpeg)$/u).optional()
  })
  .strict();

export const tableCellReferenceSchema = z
  .object({
    kind: z.literal("table"),
    sheetName: z.string().min(1).max(128),
    row: positiveInt,
    column: positiveInt,
    cell: z.string().regex(/^[A-Z]+[1-9][0-9]*$/u)
  })
  .strict();

export const normalizedEvidenceReferenceSchema = z.discriminatedUnion("kind", [
  textReferenceSchema,
  pdfPageReferenceSchema,
  imageReferenceSchema,
  tableCellReferenceSchema
]);

export const visualPayloadSchema = z
  .object({
    mimeType: z.string().regex(/^image\/(?:png|jpeg)$/u),
    byteLength: z.number().int().min(1).max(100_000_000),
    width: boundedDimension,
    height: boundedDimension,
    sha256: contentHashSchema
  })
  .strict()
  .refine((payload) => payload.width * payload.height <= 100_000_000, "visual dimensions exceed the maximum pixel count");

export const normalizedEvidenceSchema = z
  .object({
    source: evidenceSourceIdentitySchema,
    contentHash: contentHashSchema,
    extraction: extractionMetadataSchema,
    references: z.array(normalizedEvidenceReferenceSchema).min(1),
    visualPayload: visualPayloadSchema.optional(),
    warnings: z.array(extractionWarningSchema)
  })
  .strict();

export const reviewEvidenceInputSchema = z
  .object({
    id: z.string().min(1).max(128),
    role: evidenceRoleSchema,
    type: evidenceTypeSchema,
    reference: z.string().regex(noAsciiControlCharacters, "reference must not contain ASCII control characters").optional()
  })
  .strict();

export const reviewLimitsSchema = z
  .object({
    maxEvidenceItems: z.number().int().min(1).max(20).optional(),
    maxObjectiveLength: z.number().int().min(1).max(4000).optional()
  })
  .strict();

export const reviewRequestSchema = z
  .object({
    reviewId: z.string().min(1).max(128),
    objective: z.string().min(1).max(4000),
    evidence: z.array(reviewEvidenceInputSchema).max(20).default([]),
    limits: reviewLimitsSchema.optional()
  })
  .strict()
  .superRefine((request, ctx) => {
    if (request.limits?.maxEvidenceItems !== undefined && request.evidence.length > request.limits.maxEvidenceItems) {
      ctx.addIssue({
        code: "too_big",
        maximum: request.limits.maxEvidenceItems,
        origin: "array",
        path: ["evidence"],
        inclusive: true,
        message: "evidence exceeds maxEvidenceItems"
      });
    }

    if (request.limits?.maxObjectiveLength !== undefined && request.objective.length > request.limits.maxObjectiveLength) {
      ctx.addIssue({
        code: "too_big",
        maximum: request.limits.maxObjectiveLength,
        origin: "string",
        path: ["objective"],
        inclusive: true,
        message: "objective exceeds maxObjectiveLength"
      });
    }
  });

export const findingSeveritySchema = z.enum(["info", "low", "medium", "high"]);

export const reviewFindingSchema = z
  .object({
    id: z.string().min(1),
    severity: findingSeveritySchema,
    title: z.string().min(1),
    summary: z.string().min(1),
    evidenceIds: z.array(z.string().min(1))
  })
  .strict();

export const reviewResponseSchema = z
  .object({
    ok: z.literal(true),
    requestId: z.string().min(1).max(128),
    status: z.literal("accepted"),
    findings: z.array(reviewFindingSchema),
    normalizedEvidence: z.array(normalizedEvidenceSchema),
    metadata: z
      .object({
        serverName: z.string().min(1),
        serverVersion: z.string().min(1),
        generatedAt: z.string().datetime()
      })
      .strict()
  })
  .strict();

export const reviewToolResultSchema = z
  .object({
    content: z
      .array(
        z
          .object({
            type: z.literal("text"),
            text: z.string()
          })
          .strict()
      )
      .min(1)
  })
  .strict();

export type EvidenceRole = z.infer<typeof evidenceRoleSchema>;
export type EvidenceType = z.infer<typeof evidenceTypeSchema>;
export type ContentHash = z.infer<typeof contentHashSchema>;
export type EvidenceSourceIdentity = z.infer<typeof evidenceSourceIdentitySchema>;
export type ExtractionMetadata = z.infer<typeof extractionMetadataSchema>;
export type ExtractionWarning = z.infer<typeof extractionWarningSchema>;
export type TextReference = z.infer<typeof textReferenceSchema>;
export type PdfPageReference = z.infer<typeof pdfPageReferenceSchema>;
export type ImageReference = z.infer<typeof imageReferenceSchema>;
export type TableCellReference = z.infer<typeof tableCellReferenceSchema>;
export type NormalizedEvidenceReference = z.infer<typeof normalizedEvidenceReferenceSchema>;
export type VisualPayload = z.infer<typeof visualPayloadSchema>;
export type NormalizedEvidence = z.infer<typeof normalizedEvidenceSchema>;
export type ReviewEvidenceInput = z.infer<typeof reviewEvidenceInputSchema>;
export type ReviewLimits = z.infer<typeof reviewLimitsSchema>;
export type ReviewRequest = z.infer<typeof reviewRequestSchema>;
export type FindingSeverity = z.infer<typeof findingSeveritySchema>;
export type ReviewFinding = z.infer<typeof reviewFindingSchema>;
export type ReviewResponse = z.infer<typeof reviewResponseSchema>;
export type ReviewToolResult = z.infer<typeof reviewToolResultSchema>;
