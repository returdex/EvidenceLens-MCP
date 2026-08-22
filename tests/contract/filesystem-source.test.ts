import { describe, expect, it } from "vitest";
import { filesystemSourceSchema, reviewEvidenceInputSchema } from "../../src/contracts/review.js";

const base = { id: "evidence-1", role: "other" as const, type: "text" as const };

describe("filesystem evidence source contract", () => {
  it("accepts a strict filesystem source and metadata-only evidence", () => {
    expect(filesystemSourceSchema.safeParse({ kind: "filesystem", rootId: "course", relativePath: "brief/assignment.txt" }).success).toBe(true);
    expect(reviewEvidenceInputSchema.safeParse({
      ...base,
      filesystem: { kind: "filesystem", rootId: "course", relativePath: "brief/assignment.txt" }
    }).success).toBe(true);
    expect(reviewEvidenceInputSchema.safeParse(base).success).toBe(true);
  });

  it("rejects source and inline content ambiguity", () => {
    const source = { kind: "filesystem", rootId: "course", relativePath: "brief.txt" };
    expect(reviewEvidenceInputSchema.safeParse({ ...base, filesystem: source, content: "inline" }).success).toBe(false);
    expect(reviewEvidenceInputSchema.safeParse({ ...base, filesystem: source, contentBase64: "aGVsbG8=" }).success).toBe(false);
    expect(reviewEvidenceInputSchema.safeParse({ ...base, filesystem: source, mimeType: "text/plain" }).success).toBe(false);
  });

  it("rejects unsafe root ids and relative paths before any reader exists", () => {
    const invalid = [
      { rootId: "1course", relativePath: "brief.txt" },
      { rootId: "course", relativePath: "" },
      { rootId: "course", relativePath: "/etc/passwd" },
      { rootId: "course", relativePath: "C:\\secret.txt" },
      { rootId: "course", relativePath: "\\\\server\\share\\secret.txt" },
      { rootId: "course", relativePath: "brief/../secret.txt" },
      { rootId: "course", relativePath: "./brief.txt" },
      { rootId: "course", relativePath: "brief/./assignment.txt" },
      { rootId: "course", relativePath: "brief/\u0000.txt" },
      { rootId: "course", relativePath: "brief/\u001f.txt" }
    ];

    for (const filesystem of invalid) {
      expect(reviewEvidenceInputSchema.safeParse({ ...base, filesystem }).success).toBe(false);
    }
  });

  it("keeps opaque references and all Phase 2 explicit content forms valid", () => {
    expect(reviewEvidenceInputSchema.safeParse({ ...base, reference: "/private/opaque", content: "inline text" }).success).toBe(true);
    expect(reviewEvidenceInputSchema.safeParse({ id: "table", role: "rubric", type: "table", format: "csv", content: "criterion,score" }).success).toBe(true);
    expect(reviewEvidenceInputSchema.safeParse({ id: "pdf", role: "solution", type: "pdf", contentBase64: "JVBERi0=" }).success).toBe(true);
    expect(reviewEvidenceInputSchema.safeParse({ id: "image", role: "other", type: "image", mimeType: "image/png", contentBase64: "aGVsbG8=" }).success).toBe(true);
    expect(reviewEvidenceInputSchema.safeParse({ id: "screenshot", role: "other", type: "screenshot", mimeType: "image/jpeg", contentBase64: "aGVsbG8=" }).success).toBe(true);
    expect(reviewEvidenceInputSchema.safeParse({ ...base, reference: "opaque-reference" }).success).toBe(true);
  });
});
