import { z } from "zod/v4";
import { sha256Hex } from "../evidence/hash.js";
import { inspectImageBytes } from "../evidence/image.js";
import { MAX_IMAGE_BYTES, MAX_PDF_BYTES, MAX_TABLE_BYTES, MAX_TEXT_BYTES } from "../evidence/limits.js";

const noAsciiControlCharacters = /^[^\u0000-\u001F\u007F]*$/u;
const noUnsafeContentControlCharacters = /^[^\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]*$/u;
const filesystemRootIdPattern = /^[A-Za-z][A-Za-z0-9_-]{0,31}$/u;
const filesystemRelativePathPattern = /^[^\u0000-\u001F\u007F\\]+(?:\/[^\u0000-\u001F\u007F\\]+)*$/u;

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
    sha256: contentHashSchema,
    base64: z.string().regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u)
  })
  .strict()
  .superRefine((payload, ctx) => {
    if (payload.width * payload.height > 100_000_000) {
      ctx.addIssue({ code: "custom", message: "visual dimensions exceed the maximum pixel count" });
    }
    const bytes = Buffer.from(payload.base64, "base64");
    if (bytes.byteLength !== payload.byteLength) {
      ctx.addIssue({ code: "custom", path: ["byteLength"], message: "byteLength must match decoded base64 bytes" });
    }
    if (sha256Hex(bytes) !== payload.sha256) {
      ctx.addIssue({ code: "custom", path: ["sha256"], message: "sha256 must match decoded base64 bytes" });
    }
    try {
      const metadata = inspectImageBytes(bytes);
      if (metadata.mimeType !== payload.mimeType) ctx.addIssue({ code: "custom", path: ["mimeType"], message: "mimeType must match decoded image bytes" });
      if (metadata.width !== payload.width) ctx.addIssue({ code: "custom", path: ["width"], message: "width must match decoded image bytes" });
      if (metadata.height !== payload.height) ctx.addIssue({ code: "custom", path: ["height"], message: "height must match decoded image bytes" });
    } catch {
      ctx.addIssue({ code: "custom", path: ["base64"], message: "base64 must contain a valid bounded image" });
    }
  });

export const pdfVisualPayloadSchema = visualPayloadSchema.extend({ pageNumber: positiveInt });

export const normalizedEvidenceSchema = z
  .object({
    source: evidenceSourceIdentitySchema,
    contentHash: contentHashSchema,
    extraction: extractionMetadataSchema,
    references: z.array(normalizedEvidenceReferenceSchema).min(1),
    visualPayload: visualPayloadSchema.optional(),
    visualPayloads: z.array(pdfVisualPayloadSchema).min(1).optional(),
    warnings: z.array(extractionWarningSchema)
  })
  .strict()
  .superRefine((evidence, ctx) => {
    if (evidence.visualPayloads !== undefined && evidence.source.type !== "pdf") {
      ctx.addIssue({ code: "custom", path: ["visualPayloads"], message: "visualPayloads are only valid for PDF evidence" });
    }
  });

export const filesystemSourceSchema = z
  .object({
    kind: z.literal("filesystem"),
    rootId: z.string().regex(filesystemRootIdPattern, "rootId must be a valid configured root id"),
    relativePath: z
      .string()
      .min(1)
      .max(2048)
      .regex(filesystemRelativePathPattern, "relativePath must be a control-safe POSIX relative path")
      .refine((relativePath) => !relativePath.startsWith("/"), "relativePath must not be absolute")
      .refine((relativePath) => !/^[A-Za-z]:[\\/]/u.test(relativePath), "relativePath must not be a Windows absolute path")
      .refine((relativePath) => !relativePath.startsWith("\\\\"), "relativePath must not be a UNC path")
      .refine((relativePath) => !relativePath.split("/").some((segment) => segment === "." || segment === ".."), "relativePath must not contain traversal segments")
  })
  .strict();

export const reviewEvidenceInputSchema = z
  .object({
    id: z.string().min(1).max(128),
    role: evidenceRoleSchema,
    type: evidenceTypeSchema,
    reference: z.string().min(1).max(2048).regex(noAsciiControlCharacters, "reference must not contain ASCII control characters").optional(),
    filesystem: filesystemSourceSchema.optional(),
    format: z.enum(["csv", "tsv"]).optional(),
    content: z.string().regex(noUnsafeContentControlCharacters, "content must not contain unsafe ASCII control characters").optional(),
    contentBase64: z.string().min(1).optional(),
    mimeType: z.string().optional()
  })
  .strict()
  .superRefine((evidence, ctx) => {
    const utf8Bytes = evidence.content === undefined ? 0 : Buffer.byteLength(evidence.content, "utf8");
    const hasContent = evidence.content !== undefined;
    const hasBase64 = evidence.contentBase64 !== undefined;
    const hasFilesystem = evidence.filesystem !== undefined;
    const add = (path: string[], message: string) => ctx.addIssue({ code: "custom", path, message });

    if (hasFilesystem) {
      if (hasContent) add(["content"], "filesystem evidence does not accept content");
      if (hasBase64) add(["contentBase64"], "filesystem evidence does not accept contentBase64");
      if (evidence.format !== undefined) add(["format"], "filesystem evidence does not accept format");
      if (evidence.mimeType !== undefined) add(["mimeType"], "filesystem evidence does not accept mimeType");
    }

    if (evidence.type === "text" || evidence.type === "table") {
      if (hasBase64) add(["contentBase64"], `${evidence.type} evidence does not accept contentBase64`);
      if (evidence.mimeType !== undefined) add(["mimeType"], `${evidence.type} evidence does not accept mimeType`);
      const maxBytes = evidence.type === "text" ? MAX_TEXT_BYTES : MAX_TABLE_BYTES;
      if (utf8Bytes > maxBytes) add(["content"], `${evidence.type} content exceeds the maximum of ${maxBytes} bytes`);
      if (evidence.type === "text" && evidence.format !== undefined) add(["format"], "text evidence does not accept format");
    } else {
      if (evidence.format !== undefined) add(["format"], `${evidence.type} evidence does not accept format`);
      if (hasContent) add(["content"], `${evidence.type} evidence does not accept UTF-8 content`);
      if (hasBase64) {
        if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(evidence.contentBase64 ?? "")) {
          add(["contentBase64"], "contentBase64 must be strict canonical base64");
        } else {
          const maxBytes = evidence.type === "pdf" ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
          if (Buffer.from(evidence.contentBase64 ?? "", "base64").byteLength > maxBytes) {
            add(["contentBase64"], `${evidence.type} content exceeds the maximum of ${maxBytes} bytes`);
          }
        }
      }
      if (evidence.type === "pdf") {
        if (evidence.mimeType !== undefined && evidence.mimeType !== "application/pdf") add(["mimeType"], "PDF mimeType must be application/pdf");
      } else if (evidence.mimeType !== undefined && evidence.mimeType !== "image/png" && evidence.mimeType !== "image/jpeg") {
        add(["mimeType"], "image mimeType must be image/png or image/jpeg");
      }
      if ((evidence.type === "image" || evidence.type === "screenshot") && hasBase64 && evidence.mimeType === undefined) {
        add(["mimeType"], "image and screenshot contentBase64 requires mimeType");
      }
    }
  });

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
export type FilesystemSource = z.infer<typeof filesystemSourceSchema>;
export type ReviewLimits = z.infer<typeof reviewLimitsSchema>;
export type ReviewRequest = z.infer<typeof reviewRequestSchema>;
export type FindingSeverity = z.infer<typeof findingSeveritySchema>;
export type ReviewFinding = z.infer<typeof reviewFindingSchema>;
export type ReviewResponse = z.infer<typeof reviewResponseSchema>;
export type ReviewToolResult = z.infer<typeof reviewToolResultSchema>;
