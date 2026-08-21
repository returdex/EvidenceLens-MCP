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
export type ReviewEvidenceInput = z.infer<typeof reviewEvidenceInputSchema>;
export type ReviewLimits = z.infer<typeof reviewLimitsSchema>;
export type ReviewRequest = z.infer<typeof reviewRequestSchema>;
export type FindingSeverity = z.infer<typeof findingSeveritySchema>;
export type ReviewFinding = z.infer<typeof reviewFindingSchema>;
export type ReviewResponse = z.infer<typeof reviewResponseSchema>;
export type ReviewToolResult = z.infer<typeof reviewToolResultSchema>;
