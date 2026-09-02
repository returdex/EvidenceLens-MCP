import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { reviewResponseSchema, reviewToolResultSchema, type ReviewFinding, type ReviewRequest } from "../../src/contracts/review.js";
import { ProviderError } from "../../src/providers/errors.js";
import { MAX_PROVIDER_FINDINGS, PROVIDER_PROMPT_VERSION, providerReviewResultSchema, type ProviderReviewResult, type ReviewProvider } from "../../src/providers/types.js";
import type { ReviewAnalyzer } from "../../src/review/engine.js";
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

const deterministicFixtureUrl = new URL("../fixtures/reviews/deterministic-only-mcp-text.fixture.json", import.meta.url);
const deterministicRequestUrl = new URL("../fixtures/reviews/fit5032-week4-library-review.json", import.meta.url);

const EXPECTED_DETERMINISTIC_FINDINGS = [{
  id: "pending-manual-capture",
  type: "omission",
  title: "Pending manual capture",
  summary: "Pending manual capture"
}] as const;

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

function rawText(result: unknown): string {
  return reviewToolResultSchema.parse(result).content[0]!.text;
}

function unsafeProvider(value: unknown): ReviewProvider {
  return {
    name: "local-reviewer",
    async review() {
      return value as ProviderReviewResult;
    }
  };
}

describe("provider review MCP boundary", () => {
  it("keeps deterministic-only MCP text byte-for-byte compatible", async () => {
    const frozen = JSON.parse(await readFile(deterministicFixtureUrl, "utf8")) as string;
    const deterministicRequest = JSON.parse(await readFile(deterministicRequestUrl, "utf8")) as ReviewRequest;
    const first = rawText(await handleReviewRequest(deterministicRequest));
    const second = rawText(await handleReviewRequest(deterministicRequest));
    const actual = reviewResponseSchema.parse(JSON.parse(first));
    const fixture = reviewResponseSchema.parse(JSON.parse(frozen));
    const project = (finding: ReviewFinding) => ({
      id: finding.id,
      type: finding.type,
      title: finding.title,
      summary: finding.summary
    });

    expect(first).toBe(second);
    expect(first).toBe(frozen);
    expect(actual.findings.length).toBeGreaterThan(0);
    expect(fixture.findings.length).toBeGreaterThan(0);
    expect(actual.findings.map(project)).toEqual(EXPECTED_DETERMINISTIC_FINDINGS);
    expect(fixture.findings.map(project)).toEqual(EXPECTED_DETERMINISTIC_FINDINGS);
    expect(actual.metadata).not.toHaveProperty("provider");
    expect(fixture.metadata).not.toHaveProperty("provider");
    expect(Object.keys(actual.metadata)).toEqual([
      "serverName",
      "serverVersion",
      "analyzerName",
      "analyzerVersion",
      "generatedAt"
    ]);
  });

  it("enforces provider attribution iff and namespace integrity", async () => {
    const deterministic = payload(await handleReviewRequest(request));
    const parsedDeterministic = reviewResponseSchema.parse(deterministic);
    expect(Object.keys(parsedDeterministic.metadata)).toEqual([
      "serverName",
      "serverVersion",
      "analyzerName",
      "analyzerVersion",
      "generatedAt"
    ]);

    const attributed = payload(await handleReviewRequest(request, { provider: fakeProvider() }));
    expect(reviewResponseSchema.safeParse(attributed).success).toBe(true);

    const missingAttribution = structuredClone(attributed);
    delete (missingAttribution.metadata as Record<string, unknown>).provider;
    expect(reviewResponseSchema.safeParse(missingAttribution).success).toBe(false);

    const extraneousAttribution = structuredClone(deterministic);
    (extraneousAttribution.metadata as Record<string, unknown>).provider = { name: "deepseek", model: "deepseek-v4-pro" };
    expect(reviewResponseSchema.safeParse(extraneousAttribution).success).toBe(false);

    const wrongNamespace = structuredClone(attributed);
    ((wrongNamespace.metadata as Record<string, unknown>).provider as Record<string, unknown>).name = "deepseek";
    expect(reviewResponseSchema.safeParse(wrongNamespace).success).toBe(false);

    const mixedNamespaces = structuredClone(attributed);
    const providerFinding = ((mixedNamespaces.findings as Record<string, unknown>[]).find((finding) => String(finding.id).startsWith("provider:")))!;
    (mixedNamespaces.findings as Record<string, unknown>[]).push({ ...providerFinding, id: "provider:other-reviewer:finding-2" });
    expect(reviewResponseSchema.safeParse(mixedNamespaces).success).toBe(false);

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

  for (const evidenceType of ["image", "screenshot"] as const) {
    it(`requires ${evidenceType} provider citations to match retained visual payload hashes`, async () => {
      const imageBytes = await readFile(new URL("../fixtures/evidence/images/rubric-screenshot.png", import.meta.url));
      const visualRequest = {
        ...request,
        reviewId: `${evidenceType}-provider-citation`,
        evidence: [
          ...request.evidence,
          { id: "visual-1", role: "other", type: evidenceType, reference: `fixture://${evidenceType}.png`, mimeType: "image/png", contentBase64: imageBytes.toString("base64") }
        ]
      } as const;
      const base = fakeProvider();
      const providerWithHash = (visualPayloadSha256?: string): ReviewProvider => ({
        ...base,
        async review(providerRequest) {
          const result = await base.review(providerRequest);
          const source = providerRequest.evidence.find((evidence) => evidence.evidenceId === "visual-1")!;
          const visual = source.visualPayloads![0]!;
          return {
            ...result,
            modelFindings: [{
              ...result.modelFindings[0]!,
              id: "visual-finding",
              evidenceIds: [source.evidenceId],
              citations: [{
                evidenceId: source.evidenceId,
                role: source.role,
                contentHash: source.contentHash,
                sourceReference: source.sourceReference,
                location: visual.location,
                visual: true,
                ...(visualPayloadSha256 === undefined ? {} : { visualPayloadSha256 })
              }]
            }]
          };
        }
      });
      const failure = { ok: false, code: "PROVIDER_FAILURE", message: "Provider failure" };
      expect(payload(await handleReviewRequest(visualRequest, { provider: providerWithHash() }))).toEqual(failure);
      expect(payload(await handleReviewRequest(visualRequest, { provider: providerWithHash("0".repeat(64)) }))).toEqual(failure);

      const normalized = payload(await handleReviewRequest(visualRequest));
      const expectedHash = ((normalized.normalizedEvidence as Array<{ source: { id: string }; visualPayload?: { sha256: string } }>).find((evidence) => evidence.source.id === "visual-1"))!.visualPayload!.sha256;
      const matching = payload(await handleReviewRequest(visualRequest, { provider: providerWithHash(expectedHash) }));
      const parsed = reviewResponseSchema.parse(matching);
      const citation = parsed.findings.find((finding) => finding.id.startsWith("provider:"))!.citations[0]!;
      const evidence = parsed.normalizedEvidence.find((item) => item.source.id === citation.evidenceId)!;
      expect(citation.visualPayloadSha256).toBe(evidence.visualPayload!.sha256);
    });
  }

  it("does not classify invalid local analyzer output as a provider failure", async () => {
    const invalidAnalyzer: ReviewAnalyzer = {
      name: "deterministic-rules",
      version: "1.0.0",
      analyze() {
        return [{ id: "invalid-local-finding" }] as unknown as ReviewFinding[];
      }
    };
    expect(payload(await handleReviewRequest(request, { analyzer: invalidAnalyzer }))).toEqual({
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Internal error"
    });
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
    expect(parsed.metadata.analyzerName).toBe("deterministic-rules");
    expect(parsed.metadata.analyzerVersion).toBe("1.0.0");
    expect(parsed.metadata.provider).toEqual({ name: "local-reviewer", model: "deepseek-v4-pro" });
    expect(parsed.metadata).not.toHaveProperty("model");
    expect(JSON.stringify(parsed)).not.toContain("inputFingerprint");
    expect(JSON.stringify(parsed)).not.toContain("promptVersion");
  });

  it("omits provider attribution when the provider returns no findings", async () => {
    const provider = fakeProvider();
    const result = payload(await handleReviewRequest(request, {
      provider: {
        ...provider,
        async review(providerRequest) {
          return { ...(await provider.review(providerRequest)), modelFindings: [] };
        }
      }
    }));
    expect(reviewResponseSchema.parse(result).metadata).not.toHaveProperty("provider");
  });

  it("allows provider prose to vary while preserving schema and local provenance", async () => {
    let call = 0;
    const base = fakeProvider();
    const varyingProvider: ReviewProvider = {
      ...base,
      async review(providerRequest) {
        call += 1;
        const result = await base.review(providerRequest);
        return {
          ...result,
          modelFindings: result.modelFindings.map((finding) => ({
            ...finding,
            summary: `Provider wording ${call}`
          }))
        };
      }
    };

    const first = reviewResponseSchema.parse(payload(await handleReviewRequest(request, { provider: varyingProvider })));
    const second = reviewResponseSchema.parse(payload(await handleReviewRequest(request, { provider: varyingProvider })));
    const firstProviderFinding = first.findings.find((finding) => finding.id.startsWith("provider:"))!;
    const secondProviderFinding = second.findings.find((finding) => finding.id.startsWith("provider:"))!;

    expect(firstProviderFinding.summary).not.toBe(secondProviderFinding.summary);
    expect(first.requestId).toBe(request.reviewId);
    expect(first.metadata.generatedAt).toBe("1970-01-01T00:00:00.000Z");
    expect(firstProviderFinding.citations[0]).toMatchObject({
      contentHash: first.normalizedEvidence[0]!.contentHash,
      sourceReference: first.normalizedEvidence[0]!.source.reference,
      location: first.normalizedEvidence[0]!.references[0]
    });
  });

  it("rejects mismatched provider result identity with one sanitized error", async () => {
    const mismatches: Array<(result: ProviderReviewResult) => ProviderReviewResult> = [
      (result) => ({ ...result, provider: "spoofed-provider" }),
      (result) => ({ ...result, model: "deepseek-v4-flash" }),
      (result) => ({ ...result, promptVersion: "spoofed-prompt" }),
      (result) => ({ ...result, inputFingerprint: "0".repeat(64) })
    ];

    for (const mutate of mismatches) {
      const base = fakeProvider();
      const result = payload(await handleReviewRequest(request, {
        provider: {
          ...base,
          async review(providerRequest) {
            return mutate(await base.review(providerRequest));
          }
        }
      }));
      expect(result).toEqual({ ok: false, code: "PROVIDER_FAILURE", message: "Provider failure" });
    }
  });

  it("never serializes provider configuration or internal result envelopes", async () => {
    const sentinels = [
      "secret-api-key-value",
      "https://private.endpoint.invalid/v1",
      "private prompt text",
      "private-prompt-version",
      "private-input-fingerprint",
      "private-provider-request-envelope",
      "private-provider-result-envelope",
      "private-raw-upstream-response",
      "private-retry-transport-state"
    ];
    const base = fakeProvider();
    const provider = {
      ...base,
      apiKey: sentinels[0],
      baseUrl: sentinels[1],
      async review(providerRequest: Parameters<ReviewProvider["review"]>[0]) {
        return {
          ...(await base.review(providerRequest)),
          promptText: sentinels[2],
          privatePromptVersion: sentinels[3],
          privateInputFingerprint: sentinels[4],
          providerRequestEnvelope: sentinels[5],
          providerResultEnvelope: sentinels[6],
          rawResponse: sentinels[7],
          retryTransport: sentinels[8]
        };
      }
    } satisfies ReviewProvider & Record<string, unknown>;
    const successText = rawText(await handleReviewRequest(request, { provider }));
    const errorText = rawText(await handleReviewRequest(request, {
      provider: {
        name: "local-reviewer",
        async review() {
          throw new ProviderError("PROVIDER_REQUEST_FAILED", Object.fromEntries(sentinels.map((sentinel, index) => [`detail${index}`, sentinel])));
        }
      }
    }));

    for (const sentinel of sentinels) {
      expect(successText).not.toContain(sentinel);
      expect(errorText).not.toContain(sentinel);
    }
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

  it("rejects every nullish or structurally incomplete configured-provider result", async () => {
    const invalidResults: unknown[] = [
      null,
      undefined,
      {},
      { provider: "local-reviewer" },
      { provider: "local-reviewer", model: "deepseek-v4-pro", promptVersion: PROVIDER_PROMPT_VERSION, inputFingerprint: "0".repeat(64) },
      { provider: "local-reviewer", model: 42, promptVersion: PROVIDER_PROMPT_VERSION, inputFingerprint: "0".repeat(64), modelFindings: [], deterministicFindings: [] }
    ];
    for (const invalid of invalidResults) {
      const result = payload(await handleReviewRequest(request, { provider: unsafeProvider(invalid) }));
      expect(result).toEqual({ ok: false, code: "PROVIDER_FAILURE", message: "Provider failure" });
    }
  });

  it("wraps native and non-Error provider throws without leaking or misclassification", async () => {
    const sentinels: unknown[] = [
      new TypeError("type-sentinel"),
      new RangeError("range-sentinel"),
      new Error("error-sentinel"),
      "non-error-sentinel"
    ];
    for (const sentinel of sentinels) {
      const result = payload(await handleReviewRequest(request, {
        provider: {
          name: "local-reviewer",
          async review() { throw sentinel; }
        }
      }));
      expect(result).toEqual({ ok: false, code: "PROVIDER_FAILURE", message: "Provider failure" });
      expect(result.code).not.toBe("INVALID_REQUEST");
      expect(result.code).not.toBe("LIMIT_EXCEEDED");
      expect(result.code).not.toBe("INTERNAL_ERROR");
      expect(JSON.stringify(result)).not.toMatch(/sentinel|stack|local-reviewer/iu);
    }
  });

  it("bounds both provider finding arrays at one hundred before projection", async () => {
    const base = fakeProvider();
    let validResult: ProviderReviewResult | undefined;
    const captureProvider: ReviewProvider = {
      ...base,
      async review(providerRequest) {
        validResult = await base.review(providerRequest);
        return validResult;
      }
    };
    await handleReviewRequest(request, { provider: captureProvider });
    const finding = validResult!.modelFindings[0]!;
    const findings = Array.from({ length: MAX_PROVIDER_FINDINGS }, (_, index) => ({ ...finding, id: `finding-${index}` }));
    for (const field of ["modelFindings", "deterministicFindings"] as const) {
      expect(providerReviewResultSchema.safeParse({ ...validResult, [field]: findings }).success).toBe(true);
      expect(providerReviewResultSchema.safeParse({ ...validResult, [field]: [...findings, { ...finding, id: "finding-100" }] }).success).toBe(false);

      const oversized = payload(await handleReviewRequest(request, {
        provider: {
          ...base,
          async review(providerRequest) {
            const result = await base.review(providerRequest);
            return { ...result, [field]: [...findings, { ...finding, id: "finding-100" }] };
          }
        }
      }));
      expect(oversized).toEqual({ ok: false, code: "PROVIDER_FAILURE", message: "Provider failure" });
      expect(JSON.stringify(oversized)).not.toMatch(/finding-100|inputFingerprint|promptVersion|stack/iu);
    }
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
