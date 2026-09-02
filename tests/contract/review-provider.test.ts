import { describe, expect, it } from "vitest";
import { reviewResponseSchema, reviewToolResultSchema, type ReviewFinding } from "../../src/contracts/review.js";
import { ProviderError } from "../../src/providers/errors.js";
import { PROVIDER_PROMPT_VERSION, type ProviderReviewResult, type ReviewProvider } from "../../src/providers/types.js";
import { handleReviewRequest } from "../../src/tools/review.js";

const request = {
  reviewId: "provider-contract-001",
  objective: "Check the submitted solution against the rubric.",
  evidence: [
    { id: "brief-1", role: "assignment_brief", type: "text", content: "The solution must include a conclusion." },
    { id: "rubric-1", role: "rubric", type: "text", content: "The solution must include a conclusion." },
    { id: "instructions-1", role: "teacher_instructions", type: "text", content: "The solution must include a conclusion." },
    { id: "solution-1", role: "solution", type: "text", content: "The solution includes a conclusion." }
  ]
} as const;

function fakeProviderFinding(evidence: { evidenceId: string; role: ReviewFinding["citations"][number]["role"]; contentHash: string; sourceReference: string; location: ReviewFinding["citations"][number]["location"] }): ReviewFinding {
  return {
    id: "finding-1",
    type: "evidence_quality",
    severity: "low",
    confidence: "medium",
    title: "Provider observation",
    summary: "A provider observation was returned.",
    observation: "The provider returned a structurally valid finding.",
    interpretation: "The observation can be inspected against the cited evidence.",
    uncertainty: "The provider wording is not independently verified.",
    followUpChecks: ["Inspect the cited evidence."],
    evidenceIds: [evidence.evidenceId],
    citations: [{ ...evidence, visual: false }]
  };
}

function fakeProvider(name = "local-reviewer", findingId?: string): ReviewProvider {
  return {
    name,
    async review(providerRequest) {
      const source = providerRequest.evidence[0]!;
      const finding = fakeProviderFinding({
        evidenceId: source.evidenceId,
        role: source.role,
        contentHash: source.contentHash,
        sourceReference: source.sourceReference,
        location: source.references[0]!
      });
      return {
        provider: name,
        model: providerRequest.inference.model,
        promptVersion: PROVIDER_PROMPT_VERSION,
        inputFingerprint: providerRequest.inputFingerprint,
        modelFindings: [{ ...finding, ...(findingId === undefined ? {} : { id: findingId }) }],
        deterministicFindings: []
      } satisfies ProviderReviewResult;
    }
  };
}

function payload(result: unknown): Record<string, unknown> {
  const wrapped = reviewToolResultSchema.parse(result);
  return JSON.parse(wrapped.content[0]!.text) as Record<string, unknown>;
}

describe("provider review MCP boundary", () => {
  it("accepts additive provider attribution while retaining deterministic metadata compatibility", async () => {
    const deterministic = payload(await handleReviewRequest(request));
    const parsedDeterministic = reviewResponseSchema.parse(deterministic);
    expect(Object.keys(parsedDeterministic.metadata)).toEqual([
      "serverName",
      "serverVersion",
      "analyzerName",
      "analyzerVersion",
      "generatedAt"
    ]);

    const attributed = structuredClone(deterministic);
    (attributed.metadata as Record<string, unknown>).provider = {
      name: "deepseek",
      model: "deepseek-v4-flash-vision-exp"
    };
    expect(reviewResponseSchema.parse(attributed).metadata).toHaveProperty("provider", {
      name: "deepseek",
      model: "deepseek-v4-flash-vision-exp"
    });

    const invalidProviders = [
      { name: "DeepSeek", model: "deepseek-v4-pro" },
      { name: "deepseek", model: "deepseek v4" },
      { name: "deepseek", model: "deepseek\n-v4" },
      { name: "deepseek", model: "https://provider.invalid/model" },
      { name: "deepseek", model: "models/deepseek-v4" },
      { name: "deepseek", model: "models\\deepseek-v4" },
      { name: "deepseek", model: "x".repeat(129) },
      { name: "deepseek", model: "deepseek-v4-pro", promptVersion: "secret" }
    ];
    for (const provider of invalidProviders) {
      const candidate = structuredClone(deterministic);
      (candidate.metadata as Record<string, unknown>).provider = provider;
      expect(reviewResponseSchema.safeParse(candidate).success).toBe(false);
    }
  });

  it("retains citation bindings to normalized evidence", async () => {
    const result = payload(await handleReviewRequest(request, {
      provider: fakeProvider(),
      providerConfig: { model: "deepseek-v4-pro", temperature: 0.2, maxTokens: 4000 }
    }));

    for (const citationPatch of [
      { contentHash: "0".repeat(64) },
      { sourceReference: "different-reference" },
      { location: { kind: "text", startLine: 2, endLine: 2 } }
    ]) {
      const candidate = structuredClone(result);
      Object.assign(
        ((candidate.findings as Record<string, unknown>[])[0]!.citations as Record<string, unknown>[])[0],
        citationPatch
      );
      expect(reviewResponseSchema.safeParse(candidate).success).toBe(false);
    }
  });

  it("injects a compatible provider while preserving the public response schema", async () => {
    const result = payload(await handleReviewRequest(request, {
      provider: fakeProvider(),
      providerConfig: { model: "deepseek-v4-pro", temperature: 0.2, maxTokens: 4000 }
    }));
    const parsed = reviewResponseSchema.parse(result);
    expect(parsed.findings.some((finding) => finding.id === "provider:local-reviewer:finding-1")).toBe(true);
    expect(parsed.metadata).not.toHaveProperty("provider");
    expect(parsed.metadata).not.toHaveProperty("model");
    expect(JSON.stringify(parsed)).not.toContain("inputFingerprint");
    expect(JSON.stringify(parsed)).not.toContain("promptVersion");
  });

  it("maps provider failures to stable sanitized MCP errors", async () => {
    const result = payload(await handleReviewRequest(request, {
      provider: {
        name: "local-reviewer",
        async review() { throw new ProviderError("PROVIDER_REQUEST_FAILED", { requestId: "/Users/private/secret", retryCount: 2 }); }
      }
    }));
    expect(result).toEqual({ ok: false, code: "PROVIDER_FAILURE", message: "Provider failure" });
    expect(JSON.stringify(result)).not.toContain("/Users/private/secret");
  });

  it("rejects duplicate or oversized namespaced provider ids without dropping findings", async () => {
    const duplicate = fakeProvider("local-reviewer");
    const duplicateResult = payload(await handleReviewRequest(request, {
      provider: {
        ...duplicate,
        async review(providerRequest) {
          const result = await duplicate.review(providerRequest);
          return { ...result, modelFindings: [result.modelFindings[0]!, result.modelFindings[0]!] };
        }
      }
    }));
    expect(duplicateResult).toMatchObject({ ok: false, code: "PROVIDER_FAILURE" });

    const oversizedResult = payload(await handleReviewRequest(request, {
      provider: fakeProvider("local-reviewer", "x".repeat(128))
    }));
    expect(oversizedResult).toMatchObject({ ok: false, code: "PROVIDER_FAILURE" });
  });
});
