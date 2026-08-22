import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { sha256Hex } from "../../src/evidence/hash.js";
import { EVIDENCE_LIMITS } from "../../src/evidence/limits.js";
import { normalizeTextEvidence } from "../../src/evidence/text.js";

const fixturePath = new URL("../fixtures/evidence/text/assignment.txt", import.meta.url);

describe("text evidence normalizer", () => {
  it("normalizes fixture lines with source identity and the original-byte hash", async () => {
    const bytes = await readFile(fixturePath);
    const artifact = normalizeTextEvidence({
      id: "assignment-1",
      role: "assignment_brief",
      type: "text",
      reference: "fixtures/evidence/text/assignment.txt",
      bytes,
      generatedAt: "2026-08-22T00:00:00.000Z"
    });

    expect(artifact.source).toEqual({
      id: "assignment-1",
      type: "text",
      reference: "fixtures/evidence/text/assignment.txt"
    });
    expect(artifact.contentHash).toBe(sha256Hex(bytes));
    expect(artifact.references).toEqual([
      { kind: "text", startLine: 1, endLine: 1 },
      { kind: "text", startLine: 2, endLine: 2 },
      { kind: "text", startLine: 3, endLine: 3 },
      { kind: "text", startLine: 4, endLine: 4 },
      { kind: "text", startLine: 5, endLine: 5 }
    ]);
    expect(artifact.extraction).toEqual({
      extractor: "text-normalizer",
      extractorVersion: "1.0.0",
      generatedAt: "2026-08-22T00:00:00.000Z",
      partial: false
    });
    expect(artifact.warnings).toEqual([]);
  });

  it("accepts strings and reports oversized input as partial with a warning", () => {
    const artifact = normalizeTextEvidence({
      id: "large-text",
      role: "other",
      type: "text",
      reference: "inline.txt",
      text: "a".repeat(EVIDENCE_LIMITS.maxTextBytes + 1),
      limits: { maxTextBytes: EVIDENCE_LIMITS.maxTextBytes },
      generatedAt: "2026-08-22T00:00:00.000Z"
    });

    expect(artifact.extraction.partial).toBe(true);
    expect(artifact.warnings).toContainEqual({
      code: "TEXT_SIZE_LIMIT",
      message: expect.stringContaining("maximum")
    });
  });
});
