import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Phase 1 review contract", () => {
  it("exports the documented request, response, finding, and tool result types", async () => {
    const source = await readFile("src/contracts/review.ts", "utf8");

    expect(source).toContain("export type EvidenceRole");
    expect(source).toContain("export type EvidenceType");
    expect(source).toContain("export interface ReviewEvidenceInput");
    expect(source).toContain("export interface ReviewLimits");
    expect(source).toContain("export interface ReviewRequest");
    expect(source).toContain("export type FindingSeverity");
    expect(source).toContain("export interface ReviewFinding");
    expect(source).toContain("export interface ReviewResponse");
    expect(source).toContain("export interface ReviewToolResult");
  });

  it("keeps evidence metadata-only and includes Phase 1 supported evidence types", async () => {
    const source = await readFile("src/contracts/review.ts", "utf8");

    expect(source).toMatch(/EvidenceType[\s\S]*"text"[\s\S]*"pdf"[\s\S]*"image"[\s\S]*"screenshot"[\s\S]*"table"/);
    expect(source).toContain("id: string");
    expect(source).toContain("role: EvidenceRole");
    expect(source).toContain("type: EvidenceType");
    expect(source).toContain("reference?: string");
    expect(source).not.toContain("path:");
    expect(source).not.toContain("content:");
    expect(source).not.toContain("Buffer");
  });

  it("requires deterministic response metadata with accepted skeleton status", async () => {
    const source = await readFile("src/contracts/review.ts", "utf8");

    expect(source).toContain('status: "accepted"');
    expect(source).toContain("requestId: string");
    expect(source).toContain("findings: ReviewFinding[]");
    expect(source).toContain("serverName: string");
    expect(source).toContain("serverVersion: string");
    expect(source).toContain("generatedAt: string");
    expect(source).toContain("maxEvidenceItems?: number");
    expect(source).toContain("maxObjectiveLength?: number");
  });
});
