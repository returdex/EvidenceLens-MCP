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

const EXPECTED_DETERMINISTIC_FINDINGS = [
  { id: "contradiction-00d17cb0b688fe200fba0671", type: "contradiction", title: "Solution contradicts a requirement", summary: "The solution claim has an opposing negation or incompatible scalar value." },
  { id: "contradiction-3a1ad120495174fc0b9b3368", type: "contradiction", title: "Solution contradicts a requirement", summary: "The solution claim has an opposing negation or incompatible scalar value." },
  { id: "contradiction-985eac0b927db735c7ad9e85", type: "contradiction", title: "Solution contradicts a requirement", summary: "The solution claim has an opposing negation or incompatible scalar value." },
  { id: "contradiction-d3b5b45f1977ef2b9dd9a8c3", type: "contradiction", title: "Solution contradicts a requirement", summary: "The solution claim has an opposing negation or incompatible scalar value." },
  { id: "contradiction-e50b4ff5b2d14475163b719d", type: "contradiction", title: "Solution contradicts a requirement", summary: "The solution claim has an opposing negation or incompatible scalar value." },
  { id: "omission-12497d4bfe8bccf275ab3155", type: "omission", title: "Required claim may be omitted", summary: "No sufficiently overlapping solution claim was found for this obligation." },
  { id: "omission-1d321a5aa1dcb42b6affcd70", type: "omission", title: "Required claim may be omitted", summary: "No sufficiently overlapping solution claim was found for this obligation." },
  { id: "omission-55ebc7f281308203a8eeff3d", type: "omission", title: "Required claim may be omitted", summary: "No sufficiently overlapping solution claim was found for this obligation." },
  { id: "omission-6fa3ab6eac33eb1ae7f4e02a", type: "omission", title: "Required claim may be omitted", summary: "No sufficiently overlapping solution claim was found for this obligation." },
  { id: "omission-80e3e472d8a3bdb12f425261", type: "omission", title: "Required claim may be omitted", summary: "No sufficiently overlapping solution claim was found for this obligation." },
  { id: "omission-883e8766546249b1204f8129", type: "omission", title: "Required claim may be omitted", summary: "No sufficiently overlapping solution claim was found for this obligation." },
  { id: "omission-991bb8a3384f6f34e7bb7f7a", type: "omission", title: "Required claim may be omitted", summary: "No sufficiently overlapping solution claim was found for this obligation." },
  { id: "omission-9c0d354245262d7082e26de8", type: "omission", title: "Required claim may be omitted", summary: "No sufficiently overlapping solution claim was found for this obligation." },
  { id: "omission-cac99a802a2ff8ff9f71c934", type: "omission", title: "Required claim may be omitted", summary: "No sufficiently overlapping solution claim was found for this obligation." },
  { id: "requirement_conflict-7e7df131c5bab5cafcd50177", type: "requirement_conflict", title: "Conflicting requirement", summary: "Authoritative course sources state incompatible obligations or values." }
] as const;

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

  it("enforces non-visual PDF arbitrary/retained hashes and visual PDF payload page/hash binding", async () => {
    const [textPdf, scannedPdf] = await Promise.all([
      readFile(new URL("../fixtures/evidence/pdfs/text-page.pdf", import.meta.url)),
      readFile(new URL("../fixtures/evidence/pdfs/scanned-page.pdf", import.meta.url))
    ]);
    const pdfRequest = (reviewId: string, contentBase64: string) => ({
      ...request,
      reviewId,
      evidence: [
        ...request.evidence,
        { id: "pdf-1", role: "other", type: "pdf", reference: `fixture://${reviewId}.pdf`, mimeType: "application/pdf", contentBase64 }
      ]
    } as const);
    const textPdfRequest = pdfRequest("text-pdf-citation", textPdf.toString("base64"));
    const scannedPdfRequest = pdfRequest("scanned-pdf-citation", scannedPdf.toString("base64"));
    type PdfCitationSpec = { visual: boolean; pageNumber: number; visualPayloadSha256?: string };
    const providerWithPdfCitation = (spec: (source: Parameters<ReviewProvider["review"]>[0]["evidence"][number]) => PdfCitationSpec): ReviewProvider => {
      const base = fakeProvider();
      return {
        ...base,
        async review(providerRequest) {
          const result = await base.review(providerRequest);
          const source = providerRequest.evidence.find((evidence) => evidence.evidenceId === "pdf-1")!;
          const citation = spec(source);
          const location = source.references.find((reference) => reference.kind === "pdf" && reference.pageNumber === citation.pageNumber)
            ?? { kind: "pdf" as const, pageNumber: citation.pageNumber };
          return {
            ...result,
            modelFindings: [{
              ...result.modelFindings[0]!,
              id: "pdf-finding",
              evidenceIds: [source.evidenceId],
              citations: [{
                evidenceId: source.evidenceId,
                role: source.role,
                contentHash: source.contentHash,
                sourceReference: source.sourceReference,
                location,
                visual: citation.visual,
                ...(citation.visualPayloadSha256 === undefined ? {} : { visualPayloadSha256: citation.visualPayloadSha256 })
              }]
            }]
          };
        }
      };
    };
    const normalizedScanned = reviewResponseSchema.parse(payload(await handleReviewRequest(scannedPdfRequest)));
    const scannedEvidence = normalizedScanned.normalizedEvidence.find((evidence) => evidence.source.id === "pdf-1")!;
    const pageOneHash = scannedEvidence.visualPayloads!.find((visual) => visual.pageNumber === 1)!.sha256;

    const cases = [
      { label: "non-visual PDF arbitrary hash", input: textPdfRequest, spec: { visual: false, pageNumber: 1, visualPayloadSha256: "0".repeat(64) } },
      { label: "non-visual PDF retained hash", input: scannedPdfRequest, spec: { visual: false, pageNumber: 1, visualPayloadSha256: pageOneHash } },
      { label: "visual PDF missing payload", input: textPdfRequest, spec: { visual: true, pageNumber: 1, visualPayloadSha256: pageOneHash } },
      { label: "visual PDF wrong page", input: scannedPdfRequest, spec: { visual: true, pageNumber: 2, visualPayloadSha256: pageOneHash } },
      { label: "visual PDF missing hash", input: scannedPdfRequest, spec: { visual: true, pageNumber: 1 } },
      { label: "visual PDF wrong hash", input: scannedPdfRequest, spec: { visual: true, pageNumber: 1, visualPayloadSha256: "0".repeat(64) } }
    ] as const;
    const failure = { ok: false, code: "PROVIDER_FAILURE", message: "Provider failure" };
    for (const testCase of cases) {
      const provider = providerWithPdfCitation(() => testCase.spec);
      const result = payload(await handleReviewRequest(testCase.input, { provider }));
      expect(result, testCase.label).toEqual(failure);
    }

    const matchingProvider = providerWithPdfCitation((source) => ({
      visual: true,
      pageNumber: 1,
      visualPayloadSha256: source.visualPayloads!.find((visual) => visual.location.kind === "pdf" && visual.location.pageNumber === 1)!.sha256
    }));
    const exactMatch = payload(await handleReviewRequest(scannedPdfRequest, { provider: matchingProvider }));
    const parsedExactMatch = reviewResponseSchema.parse(exactMatch);
    const exactCitation = parsedExactMatch.findings.find((finding) => finding.id === "provider:local-reviewer:pdf-finding")!.citations[0]!;
    const exactEvidence = parsedExactMatch.normalizedEvidence.find((evidence) => evidence.source.id === "pdf-1")!;
    expect(exactCitation.visualPayloadSha256, "visual PDF exact page/hash match").toBe(exactEvidence.visualPayloads!.find((visual) => visual.pageNumber === 1)!.sha256);

    const textBaseline = payload(await handleReviewRequest(textPdfRequest, {
      provider: providerWithPdfCitation(() => ({ visual: false, pageNumber: 1 }))
    }));
    const directCases = cases.map((testCase) => ({
      label: `direct ${testCase.label}`,
      base: testCase.input === textPdfRequest ? textBaseline : exactMatch,
      spec: testCase.spec
    }));
    for (const testCase of directCases) {
      const candidate = structuredClone(testCase.base ?? textBaseline);
      const finding = (candidate.findings as Array<{ id: string; citations: Array<Record<string, unknown>> }>).find((item) => item.id.startsWith("provider:"))!;
      const currentLocation = finding.citations[0]!.location as Record<string, unknown>;
      const location = { ...currentLocation, pageNumber: testCase.spec.pageNumber };
      if (testCase.spec.pageNumber !== currentLocation.pageNumber) delete location.pageCount;
      finding.citations[0] = {
        ...finding.citations[0],
        visual: testCase.spec.visual,
        location,
        ...(testCase.spec.visualPayloadSha256 === undefined ? {} : { visualPayloadSha256: testCase.spec.visualPayloadSha256 })
      };
      if (testCase.spec.visualPayloadSha256 === undefined) delete finding.citations[0]!.visualPayloadSha256;
      expect(reviewResponseSchema.safeParse(candidate).success, testCase.label).toBe(false);
    }
    expect(reviewResponseSchema.safeParse(exactMatch).success, "direct visual PDF exact page/hash match").toBe(true);
  });

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
