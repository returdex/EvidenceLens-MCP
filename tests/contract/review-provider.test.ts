import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { reviewProviderAttributionSchema, reviewResponseSchema, reviewToolResultSchema, type ReviewFinding, type ReviewRequest } from "../../src/contracts/review.js";
import { ProviderError } from "../../src/providers/errors.js";
import { MAX_PROVIDER_FINDINGS, PROVIDER_PROMPT_VERSION, providerReviewResultSchema, type ProviderReviewRequest, type ProviderReviewResult, type ReviewProvider } from "../../src/providers/types.js";
import type { ProviderConfig } from "../../src/providers/config.js";
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
  it("runtime-projects a production ProviderConfig into an owned frozen three-key inference", async () => {
    const holder = { marker: "nested-caller-holder" };
    const config: ProviderConfig & { holder: typeof holder } = {
      apiKey: "config-api-key-sentinel",
      baseUrl: "https://config-endpoint-sentinel.invalid/v1",
      model: "deepseek-v4-pro",
      timeoutMs: 31_337,
      maxRetries: 2,
      maxTotalWaitMs: 9_999,
      temperature: 0.2,
      maxTokens: 4_001,
      holder
    };
    let capturedRequest: ProviderReviewRequest | undefined;
    let forbiddenReads: unknown[] = [];
    const provider: ReviewProvider = {
      name: "local-reviewer",
      async review(providerRequest) {
        capturedRequest = providerRequest;
        const inference = providerRequest.inference as unknown as Record<string, unknown>;
        forbiddenReads = [inference.apiKey, inference.baseUrl, inference.timeoutMs, inference.maxRetries, inference.maxTotalWaitMs];
        return {
          provider: "local-reviewer",
          model: providerRequest.inference.model,
          promptVersion: providerRequest.promptVersion,
          inputFingerprint: providerRequest.inputFingerprint,
          modelFindings: [],
          deterministicFindings: []
        };
      }
    };

    const result = payload(await handleReviewRequest(request, { provider, providerConfig: config }));
    expect(result).toMatchObject({ ok: true });
    expect(Object.keys(capturedRequest!.inference).sort()).toEqual(["maxTokens", "model", "temperature"]);
    expect(forbiddenReads).toEqual([undefined, undefined, undefined, undefined, undefined]);
    const visit = (value: unknown, seen = new Set<object>()): boolean => {
      if (value === null || typeof value !== "object" || seen.has(value)) return true;
      seen.add(value);
      return Object.isFrozen(value) && Object.values(value).every((child) => visit(child, seen));
    };
    expect(visit(capturedRequest)).toBe(true);
    const serialized = JSON.stringify({ request: capturedRequest, result });
    for (const sentinel of [
      config.apiKey,
      config.baseUrl,
      `\"timeoutMs\":${config.timeoutMs}`,
      `\"maxRetries\":${config.maxRetries}`,
      `\"maxTotalWaitMs\":${config.maxTotalWaitMs}`,
      holder.marker
    ]) {
      expect(serialized).not.toContain(sentinel);
    }
    expect(Object.isFrozen(config)).toBe(false);
    expect(Object.isFrozen(holder)).toBe(false);
    expect(holder.marker).toBe("nested-caller-holder");
    config.temperature = 0.3;
    holder.marker = "caller-remains-writable";
    expect(config.temperature).toBe(0.3);
    expect(holder.marker).toBe("caller-remains-writable");

    const failureHolder = { marker: "failure-holder" };
    const failureConfig = { ...config, temperature: 0.2, holder: failureHolder };
    const failed = payload(await handleReviewRequest(request, {
      provider: { name: "local-reviewer", async review() { throw new ProviderError("PROVIDER_REQUEST_FAILED"); } },
      providerConfig: failureConfig
    }));
    expect(failed).toEqual({ ok: false, code: "PROVIDER_FAILURE", message: "Provider failure" });
    expect(Object.isFrozen(failureConfig)).toBe(false);
    expect(Object.isFrozen(failureHolder)).toBe(false);
    failureConfig.maxTokens = 4_002;
    failureHolder.marker = "failure-remains-writable";
    expect(failureConfig.maxTokens).toBe(4_002);
    expect(failureHolder.marker).toBe("failure-remains-writable");
  });

  it("rejects invalid runtime inference before invoking the provider", async () => {
    const invalidValues: Array<{ field: "model" | "temperature" | "maxTokens"; value: unknown }> = [
      { field: "model", value: undefined },
      { field: "model", value: "unknown-model" },
      { field: "temperature", value: undefined },
      { field: "temperature", value: "0.2" },
      { field: "temperature", value: Number.NaN },
      { field: "temperature", value: Number.POSITIVE_INFINITY },
      { field: "temperature", value: -0.01 },
      { field: "temperature", value: 2.01 },
      { field: "maxTokens", value: undefined },
      { field: "maxTokens", value: "4000" },
      { field: "maxTokens", value: Number.NaN },
      { field: "maxTokens", value: Number.POSITIVE_INFINITY },
      { field: "maxTokens", value: 0 },
      { field: "maxTokens", value: 20_001 },
      { field: "maxTokens", value: 1.5 }
    ];
    for (const testCase of invalidValues) {
      const review = vi.fn(async () => { throw new Error("provider-must-not-run"); });
      const config = {
        model: "deepseek-v4-pro",
        temperature: 0.2,
        maxTokens: 4_000,
        [testCase.field]: testCase.value
      } as unknown as ProviderConfig;
      expect(payload(await handleReviewRequest(request, { provider: { name: "local-reviewer", review }, providerConfig: config })), `${testCase.field}:${String(testCase.value)}`).toEqual({
        ok: false,
        code: "INTERNAL_ERROR",
        message: "Internal error"
      });
      expect(review).not.toHaveBeenCalled();
    }
  });

  it("registers original and isolated cleanup before hostile provider setup", async () => {
    const reviewModule = await import("../../src/tools/review.js");
    const testHandler = (reviewModule as Record<string, unknown>).handleReviewRequestForTest as
      | ((input: unknown, options: Parameters<typeof handleReviewRequest>[1], observer: (stage: "original" | "isolated", analysis: Parameters<ReviewAnalyzer["analyze"]>[0]) => void) => ReturnType<typeof handleReviewRequest>)
      | undefined;
    expect(testHandler).toBeTypeOf("function");
    const stages: string[] = [];
    const retained: Array<Parameters<ReviewAnalyzer["analyze"]>[0]> = [];
    const providerConfig = {
      get model() { throw new TypeError("hostile-config-secret-sentinel"); },
      temperature: 0.2,
      maxTokens: 4_000
    } as unknown as ProviderConfig;
    const result = payload(await testHandler!(request, { provider: fakeProvider(), providerConfig }, (stage, analysis) => {
      stages.push(stage);
      retained.push(analysis);
    }));
    expect(result).toEqual({ ok: false, code: "INTERNAL_ERROR", message: "Internal error" });
    expect(stages).toEqual(["original", "isolated"]);
    expect(retained).toHaveLength(2);
    for (const analysis of retained) {
      expect(analysis.payloads.every((entry) => entry.text === undefined && entry.tableCells === undefined && entry.bytes === undefined)).toBe(true);
    }
    expect(JSON.stringify(result)).not.toMatch(/hostile|sentinel|stack/iu);
  });

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

    const baselineProviderFinding = (attributed.findings as Array<{ id: string }>).find((finding) => finding.id.startsWith("provider:"))!;
    expect(baselineProviderFinding).toBeDefined();
    const validNames = ["a", `a${"b".repeat(31)}`];
    for (const name of validNames) {
      const candidate = structuredClone(attributed);
      ((candidate.metadata as Record<string, unknown>).provider as Record<string, unknown>).name = name;
      const finding = (candidate.findings as Array<{ id: string }>).find((item) => item.id.startsWith("provider:"))!;
      finding.id = `provider:${name}:finding-1`;
      expect(reviewProviderAttributionSchema.safeParse({ name, model: "deepseek-v4-pro" }).success).toBe(true);
      expect(reviewResponseSchema.safeParse(candidate).success).toBe(true);
    }

    const invalidNames = ["", "DeepSeek", "1deepseek", "deep_seek", `a${"b".repeat(32)}`];
    for (const name of invalidNames) {
      const candidate = structuredClone(attributed);
      ((candidate.metadata as Record<string, unknown>).provider as Record<string, unknown>).name = name;
      const finding = (candidate.findings as Array<{ id: string }>).find((item) => item.id.startsWith("provider:"))!;
      finding.id = `provider:${name}:finding-1`;
      expect(reviewProviderAttributionSchema.safeParse({ name, model: "deepseek-v4-pro" }).success).toBe(false);
      expect(reviewResponseSchema.safeParse(candidate).success).toBe(false);
    }

    const validModels = ["a", "x".repeat(128)];
    for (const model of validModels) {
      const candidate = structuredClone(attributed);
      ((candidate.metadata as Record<string, unknown>).provider as Record<string, unknown>).model = model;
      expect((candidate.findings as Array<{ id: string }>).find((finding) => finding.id.startsWith("provider:"))!.id).toBe(baselineProviderFinding.id);
      expect(reviewProviderAttributionSchema.safeParse({ name: "local-reviewer", model }).success).toBe(true);
      expect(reviewResponseSchema.safeParse(candidate).success).toBe(true);
    }

    const invalidModels = ["", "deepseek v4", "deepseek\n-v4", "https://provider.invalid/model", "models/deepseek-v4", "models\\deepseek-v4", "x".repeat(129)];
    for (const model of invalidModels) {
      const candidate = structuredClone(attributed);
      ((candidate.metadata as Record<string, unknown>).provider as Record<string, unknown>).model = model;
      expect((candidate.findings as Array<{ id: string }>).find((finding) => finding.id.startsWith("provider:"))!.id).toBe(baselineProviderFinding.id);
      expect(reviewProviderAttributionSchema.safeParse({ name: "local-reviewer", model }).success).toBe(false);
      expect(reviewResponseSchema.safeParse(candidate).success).toBe(false);
    }

    const extraField = { name: "local-reviewer", model: "deepseek-v4-pro", promptVersion: "secret" };
    expect(reviewProviderAttributionSchema.safeParse(extraField).success).toBe(false);
    const candidate = structuredClone(attributed);
    (candidate.metadata as Record<string, unknown>).provider = extraField;
    expect(reviewResponseSchema.safeParse(candidate).success).toBe(false);
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

    const validPageTwoCitation = structuredClone(exactMatch);
    const pageTwoEvidence = validPageTwoCitation.normalizedEvidence.find((evidence) => evidence.source.id === "pdf-1")!;
    const pageTwoLocation = { kind: "pdf" as const, pageNumber: 2, pageCount: 2 };
    pageTwoEvidence.references = [
      { kind: "pdf", pageNumber: 1, pageCount: 2 },
      pageTwoLocation
    ];
    const pageTwoFinding = validPageTwoCitation.findings.find((finding) => finding.id === "provider:local-reviewer:pdf-finding")!;
    pageTwoFinding.citations[0] = {
      ...pageTwoFinding.citations[0]!,
      location: pageTwoLocation,
      visual: false
    };
    delete pageTwoFinding.citations[0].visualPayloadSha256;
    expect(reviewResponseSchema.safeParse(validPageTwoCitation).success, "non-visual citation to retained page-two reference").toBe(true);

    const visualWrongPage = structuredClone(validPageTwoCitation);
    const wrongPageFinding = visualWrongPage.findings.find((finding) => finding.id === "provider:local-reviewer:pdf-finding")!;
    wrongPageFinding.citations[0] = {
      ...wrongPageFinding.citations[0]!,
      visual: true,
      visualPayloadSha256: pageOneHash
    };
    const wrongPageResult = reviewResponseSchema.safeParse(visualWrongPage);
    expect(wrongPageResult.success, "visual PDF wrong retained page").toBe(false);
    if (wrongPageResult.success) throw new Error("visual PDF wrong-page fixture unexpectedly parsed");
    const wrongPageIssues = wrongPageResult.error.issues.map((issue) => issue.message);
    expect(wrongPageIssues).toContain("visual PDF citation must match a retained page payload");
    expect(wrongPageIssues).not.toContain("citation location must reference normalized evidence");
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

  it("maps every injected analyzer exception source to one sanitized internal error", async () => {
    const sentinels: unknown[] = [
      new TypeError("analyzer-type-sentinel"),
      new RangeError("analyzer-range-sentinel"),
      new Error("analyzer-error-sentinel"),
      "analyzer-non-error-sentinel"
    ];
    for (const sentinel of sentinels) {
      const analyzer: ReviewAnalyzer = {
        name: "deterministic-rules",
        version: "1.0.0",
        analyze() { throw sentinel; }
      };
      const result = payload(await handleReviewRequest(request, { analyzer }));
      expect(result).toEqual({ ok: false, code: "INTERNAL_ERROR", message: "Internal error" });
      expect(result.code).not.toBe("INVALID_REQUEST");
      expect(result.code).not.toBe("LIMIT_EXCEEDED");
      expect(result.code).not.toBe("PROVIDER_FAILURE");
      expect(JSON.stringify(result)).not.toMatch(/sentinel|stack|deterministic-rules/iu);
    }
  });

  it("maps analyzer name and version getter failures to one sanitized internal error", async () => {
    const failures = [
      () => new TypeError("analyzer-metadata-type-sentinel"),
      () => new RangeError("analyzer-metadata-range-sentinel"),
      () => new Error("analyzer-metadata-error-sentinel"),
      () => "analyzer-metadata-non-error-sentinel"
    ];
    for (const metadata of ["name", "version"] as const) {
      for (const failure of failures) {
        const analyzer = metadata === "name"
          ? {
              get name() { throw failure(); },
              version: "1.0.0",
              analyze() { return []; }
            }
          : {
              name: "deterministic-rules",
              get version() { throw failure(); },
              analyze() { return []; }
            };
        const result = payload(await handleReviewRequest(request, { analyzer: analyzer as ReviewAnalyzer }));
        expect(result, `${metadata} getter`).toEqual({ ok: false, code: "INTERNAL_ERROR", message: "Internal error" });
        expect(result.code).not.toBe("INVALID_REQUEST");
        expect(result.code).not.toBe("LIMIT_EXCEEDED");
        expect(result.code).not.toBe("PROVIDER_FAILURE");
        expect(JSON.stringify(result)).not.toMatch(/sentinel|stack|deterministic-rules/iu);
      }
    }
  });

  it("rejects spoofed analyzer identities, reads changing getters once, and publishes only the server identity", async () => {
    const failure = { ok: false, code: "INTERNAL_ERROR", message: "Internal error" };
    const sentinel = "analyzer-secret-sentinel";
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      const spoofedAnalyzers = [
        { name: sentinel, version: "9.9.9", analyze() { return []; } },
        { get name() { return sentinel; }, version: "1.0.0", analyze() { return []; } },
        { name: "deterministic-rules", get version() { return "9.9.9"; }, analyze() { return []; } }
      ];
      for (const analyzer of spoofedAnalyzers) {
        const result = payload(await handleReviewRequest(request, { analyzer: analyzer as ReviewAnalyzer }));
        expect(result).toEqual(failure);
        expect(JSON.stringify(result)).not.toMatch(/sentinel|9\.9\.9|stack/iu);
      }

      let nameReads = 0;
      let versionReads = 0;
      const changingAnalyzer = {
        get name() {
          nameReads += 1;
          return nameReads === 1 ? "deterministic-rules" : sentinel;
        },
        get version() {
          versionReads += 1;
          return versionReads === 1 ? "1.0.0" : "9.9.9";
        },
        analyze() { return []; }
      } as ReviewAnalyzer;
      const success = reviewResponseSchema.parse(payload(await handleReviewRequest(request, { analyzer: changingAnalyzer })));
      expect(nameReads).toBe(1);
      expect(versionReads).toBe(1);
      expect(success.metadata.analyzerName).toBe("deterministic-rules");
      expect(success.metadata.analyzerVersion).toBe("1.0.0");
      expect(JSON.stringify(success)).not.toMatch(/sentinel|9\.9\.9/iu);

      const consoleOutput = [...log.mock.calls, ...warn.mock.calls, ...error.mock.calls].flat().join(" ");
      expect(consoleOutput).not.toMatch(/sentinel|9\.9\.9|stack/iu);
      expect(log).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
      warn.mockRestore();
      error.mockRestore();
    }
  });

  it("keeps provider requests, fingerprints, and final provenance isolated from analyzer mutations", async () => {
    type MutableAnalysis = Parameters<ReviewAnalyzer["analyze"]>[0];
    const captureRun = async (mutate?: (analysis: MutableAnalysis) => void) => {
      let captured: ProviderReviewRequest | undefined;
      let providerRequestFrozen = false;
      const provider: ReviewProvider = {
        name: "local-reviewer",
        async review(providerRequest) {
          providerRequestFrozen = [
            providerRequest,
            providerRequest.evidence,
            ...providerRequest.evidence,
            ...providerRequest.evidence.flatMap((evidence) => [evidence.references, ...evidence.references]),
            providerRequest.requirements,
            ...providerRequest.requirements,
            providerRequest.solutionClaims,
            ...providerRequest.solutionClaims,
            providerRequest.inference
          ].every(Object.isFrozen);
          captured = structuredClone(providerRequest);
          return {
            provider: "local-reviewer",
            model: providerRequest.inference.model,
            promptVersion: providerRequest.promptVersion,
            inputFingerprint: providerRequest.inputFingerprint,
            modelFindings: [],
            deterministicFindings: []
          };
        }
      };
      const analyzer: ReviewAnalyzer = {
        name: "deterministic-rules",
        version: "1.0.0",
        analyze(analysis) {
          mutate?.(analysis);
          return [];
        }
      };
      const response = reviewResponseSchema.parse(payload(await handleReviewRequest(request, { analyzer, provider })));
      return { captured: captured!, providerRequestFrozen, response };
    };

    const oracle = await captureRun();
    expect(oracle.providerRequestFrozen).toBe(true);
    const mutations: Array<{ label: string; mutate: (analysis: MutableAnalysis) => void }> = [
      { label: "replace payloads", mutate: (analysis) => { analysis.payloads = []; } },
      { label: "modify payload", mutate: (analysis) => { analysis.payloads[0]!.reference = "analyzer-mutated-reference"; } },
      { label: "replace requirements", mutate: (analysis) => { analysis.requirements = []; } },
      { label: "modify requirements", mutate: (analysis) => { if (analysis.requirements[0]) analysis.requirements[0].text = "analyzer-mutated-requirement"; } },
      { label: "replace solution claims", mutate: (analysis) => { analysis.solutionClaims = []; } },
      { label: "modify solution claims", mutate: (analysis) => { analysis.solutionClaims[0]!.text = "analyzer-mutated-solution"; } },
      { label: "replace normalized evidence", mutate: (analysis) => { analysis.normalizedEvidence = []; } },
      { label: "modify normalized evidence", mutate: (analysis) => { analysis.normalizedEvidence[0]!.source.reference = "analyzer-mutated-provenance"; } }
    ];

    for (const mutation of mutations) {
      const actual = await captureRun(mutation.mutate);
      expect(actual.providerRequestFrozen, mutation.label).toBe(true);
      expect(actual.captured, mutation.label).toEqual(oracle.captured);
      expect(actual.captured.inputFingerprint, mutation.label).toBe(oracle.captured.inputFingerprint);
      expect(actual.response.normalizedEvidence, mutation.label).toEqual(oracle.response.normalizedEvidence);
    }
  });

  it("publishes only the validated deterministic snapshot after microtask and timer mutations", async () => {
    let returnedFinding: ReviewFinding | undefined;
    let oracle: ReviewFinding | undefined;
    const analyzer: ReviewAnalyzer = {
      name: "deterministic-rules",
      version: "1.0.0",
      analyze(analysis) {
        const claim = analysis.requirements[0]!;
        const finding: ReviewFinding = {
          id: "snapshot-local-finding",
          type: "omission",
          severity: "medium",
          confidence: "medium",
          title: "Trusted title",
          summary: "Trusted summary",
          observation: "Trusted observation",
          interpretation: "Trusted interpretation",
          uncertainty: "Trusted uncertainty",
          followUpChecks: ["Trusted follow-up"],
          evidenceIds: [claim.evidenceId],
          citations: [analysis.resolveCitation(claim.evidenceId, claim.location)]
        };
        const findings = [finding];
        returnedFinding = finding;
        oracle = structuredClone(finding);
        queueMicrotask(() => {
          finding.title = "ASYNC-MUTATION-SENTINEL-microtask";
          finding.citations[0]!.sourceReference = "ASYNC-MUTATION-SENTINEL-reference";
          findings.push({ ...finding, id: "ASYNC-MUTATION-SENTINEL-push" });
        });
        setTimeout(() => {
          finding.summary = "ASYNC-MUTATION-SENTINEL-timer";
          finding.citations[0]!.location = { kind: "text", startLine: 99, endLine: 99 };
          findings[0] = { ...finding, id: "ASYNC-MUTATION-SENTINEL-replace" };
        }, 0);
        return findings;
      }
    };
    const provider: ReviewProvider = {
      name: "local-reviewer",
      async review(providerRequest) {
        await new Promise<void>((resolve) => setTimeout(resolve, 5));
        return {
          provider: "local-reviewer",
          model: providerRequest.inference.model,
          promptVersion: providerRequest.promptVersion,
          inputFingerprint: providerRequest.inputFingerprint,
          modelFindings: [],
          deterministicFindings: []
        };
      }
    };

    const result = reviewResponseSchema.parse(payload(await handleReviewRequest(request, { analyzer, provider })));
    expect(returnedFinding).toBeDefined();
    expect(result.findings).toEqual([oracle]);
    expect(JSON.stringify(result)).not.toContain("ASYNC-MUTATION-SENTINEL");
  });

  it("clears isolated analyzer claim references on provider failure", async () => {
    let retained: Parameters<ReviewAnalyzer["analyze"]>[0] | undefined;
    const originalTokenArrays: string[][] = [];
    const analyzer: ReviewAnalyzer = {
      name: "deterministic-rules",
      version: "1.0.0",
      analyze(analysis) {
        retained = analysis;
        originalTokenArrays.push(...[...analysis.requirements, ...analysis.solutionClaims].map((claim) => claim.tokens));
        return [];
      }
    };
    const provider: ReviewProvider = { name: "local-reviewer", async review() { throw new ProviderError("PROVIDER_REQUEST_FAILED"); } };
    expect(payload(await handleReviewRequest(request, { analyzer, provider }))).toEqual({ ok: false, code: "PROVIDER_FAILURE", message: "Provider failure" });
    expect(retained).toBeDefined();
    expect(retained!.requirements).toHaveLength(0);
    expect(retained!.solutionClaims).toHaveLength(0);
    expect(originalTokenArrays.every((tokens) => tokens.length === 0)).toBe(true);
    expect(retained!.payloads.every((entry) => entry.text === undefined && entry.tableCells === undefined && entry.bytes === undefined)).toBe(true);
  });

  it("clears isolated claims after success, analyzer failure, and snapshot failure", async () => {
    for (const mode of ["success", "analyzer", "snapshot"] as const) {
      let retained: Parameters<ReviewAnalyzer["analyze"]>[0] | undefined;
      const tokenArrays: string[][] = [];
      const providerReview = vi.fn(async () => { throw new Error("provider-must-not-run"); });
      const analyzer: ReviewAnalyzer = {
        name: "deterministic-rules",
        version: "1.0.0",
        analyze(analysis) {
          retained = analysis;
          tokenArrays.push(...[...analysis.requirements, ...analysis.solutionClaims].map((claim) => claim.tokens));
          if (mode === "analyzer") throw new TypeError("analyzer-cleanup-sentinel");
          if (mode === "snapshot") {
            const claim = analysis.requirements[0]!;
            const hostile = {
              id: "hostile-snapshot",
              type: "omission",
              severity: "medium",
              confidence: "medium",
              get title() { throw new RangeError("snapshot-cleanup-sentinel"); },
              summary: "summary",
              observation: "observation",
              interpretation: "interpretation",
              followUpChecks: ["follow up"],
              evidenceIds: [claim.evidenceId],
              citations: [analysis.resolveCitation(claim.evidenceId, claim.location)]
            };
            return [hostile] as unknown as ReviewFinding[];
          }
          return [];
        }
      };
      const result = payload(await handleReviewRequest(request, {
        analyzer,
        ...(mode === "snapshot" ? { provider: { name: "local-reviewer", review: providerReview } } : {})
      }));
      expect(result, mode).toEqual(mode === "success"
        ? expect.objectContaining({ ok: true })
        : { ok: false, code: "INTERNAL_ERROR", message: "Internal error" });
      expect(retained, mode).toBeDefined();
      expect(retained!.requirements, mode).toHaveLength(0);
      expect(retained!.solutionClaims, mode).toHaveLength(0);
      expect(tokenArrays.every((tokens) => tokens.length === 0), mode).toBe(true);
      expect(retained!.payloads.every((entry) => entry.text === undefined && entry.tableCells === undefined && entry.bytes === undefined), mode).toBe(true);
      if (mode === "snapshot") expect(providerReview).not.toHaveBeenCalled();
      expect(JSON.stringify(result), mode).not.toMatch(/sentinel|stack/iu);
    }
  });

  it("does not access analyzer-installed throwing getters while building the provider request", async () => {
    const analyzer: ReviewAnalyzer = {
      name: "deterministic-rules",
      version: "1.0.0",
      analyze(analysis) {
        const payloadEntry = analysis.payloads[0]!;
        analysis.payloads[0] = new Proxy(payloadEntry, {
          get(target, property, receiver) {
            if (property === "evidenceId") throw new TypeError("analyzer-access-sentinel");
            return Reflect.get(target, property, receiver) as unknown;
          }
        });
        return [];
      }
    };
    const result = reviewResponseSchema.parse(payload(await handleReviewRequest(request, { analyzer, provider: fakeProvider() })));
    expect(result.ok).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/sentinel|stack/iu);
  });

  it("uses the saved trusted cleanup instead of an analyzer replacement", async () => {
    const replacement = vi.fn(() => { throw new Error("replacement-clear-sentinel"); });
    const analyzer: ReviewAnalyzer = {
      name: "deterministic-rules",
      version: "1.0.0",
      analyze(analysis) {
        analysis.clear = replacement;
        return [];
      }
    };

    expect(payload(await handleReviewRequest(request, { analyzer }))).toMatchObject({ ok: true });
    expect(replacement).not.toHaveBeenCalled();
  });

  it("maps failures from the saved trusted cleanup path to one sanitized internal error", async () => {
    const failures: unknown[] = [
      new TypeError("cleanup-type-sentinel"),
      new RangeError("cleanup-range-sentinel"),
      new Error("cleanup-error-sentinel"),
      "cleanup-non-error-sentinel"
    ];
    for (const failure of failures) {
      const analyzer: ReviewAnalyzer = {
        name: "deterministic-rules",
        version: "1.0.0",
        analyze(analysis) {
          const payloadEntry = analysis.payloads[0]!;
          Object.defineProperty(payloadEntry, "text", {
            configurable: true,
            get() { return "retained-cleanup-text"; },
            set() { throw failure; }
          });
          return [];
        }
      };
      const result = payload(await handleReviewRequest(request, { analyzer }));
      expect(result).toEqual({ ok: false, code: "INTERNAL_ERROR", message: "Internal error" });
      expect(result.code).not.toBe("INVALID_REQUEST");
      expect(result.code).not.toBe("LIMIT_EXCEEDED");
      expect(result.code).not.toBe("PROVIDER_FAILURE");
      expect(JSON.stringify(result)).not.toMatch(/sentinel|stack|deterministic-rules/iu);
    }
  });

  it("wipes every retained analyzer payload reference before reporting a cleanup fault", async () => {
    const imageBytes = await readFile(new URL("../fixtures/evidence/images/rubric-screenshot.png", import.meta.url));
    const cleanupRequest = {
      reviewId: "cleanup-retained-reference-matrix",
      objective: "Verify transient cleanup.",
      evidence: [
        { id: "brief-cleanup", role: "assignment_brief", type: "text", content: "Threshold must be 4." },
        { id: "rubric-cleanup", role: "rubric", type: "table", content: "criterion,requirement\nthreshold,Threshold must be 4." },
        { id: "instructions-cleanup", role: "teacher_instructions", type: "text", content: "Teacher guidance." },
        { id: "solution-cleanup", role: "solution", type: "text", content: "Threshold = 3." },
        { id: "image-cleanup", role: "other", type: "image", mimeType: "image/png", contentBase64: imageBytes.toString("base64") }
      ]
    } as const;
    const retainedPayloads: Parameters<ReviewAnalyzer["analyze"]>[0]["payloads"] = [];
    const retainedCells: Array<{ value: string }> = [];
    const retainedBuffers: Uint8Array[] = [];
    const analyzer: ReviewAnalyzer = {
      name: "deterministic-rules",
      version: "1.0.0",
      analyze(analysis) {
        retainedPayloads.push(...analysis.payloads);
        for (const payloadEntry of analysis.payloads) {
          retainedCells.push(...(payloadEntry.tableCells ?? []));
          if (payloadEntry.bytes !== undefined) retainedBuffers.push(payloadEntry.bytes);
        }
        const first = analysis.payloads[0]!;
        const originalText = first.text;
        Object.defineProperty(first, "text", {
          configurable: true,
          get() { return originalText; },
          set(value: string | undefined) {
            Object.defineProperty(first, "text", { configurable: true, writable: true, value });
            throw new Error("cleanup-setter-sentinel");
          }
        });
        return [];
      }
    };

    const result = payload(await handleReviewRequest(cleanupRequest, { analyzer }));
    expect(result).toEqual({ ok: false, code: "INTERNAL_ERROR", message: "Internal error" });
    expect(JSON.stringify(result)).not.toMatch(/sentinel|stack/iu);
    expect(retainedPayloads.length).toBe(cleanupRequest.evidence.length);
    for (const retained of retainedPayloads) {
      expect(retained.text).toBeUndefined();
      expect(retained.tableCells).toBeUndefined();
      expect(retained.bytes).toBeUndefined();
    }
    expect(retainedCells.length).toBeGreaterThan(0);
    expect(retainedCells.every((cell) => cell.value === "")).toBe(true);
    expect(retainedBuffers.length).toBeGreaterThan(0);
    expect(retainedBuffers.every((buffer) => buffer.every((byte) => byte === 0))).toBe(true);
  });

  it("preserves a pending provider failure when trusted cleanup also fails", async () => {
    const analyzer: ReviewAnalyzer = {
      name: "deterministic-rules",
      version: "1.0.0",
      analyze(analysis) {
        const payloadEntry = analysis.payloads[0]!;
        Object.defineProperty(payloadEntry, "text", {
          configurable: true,
          get() { return "retained-cleanup-text"; },
          set() { throw new TypeError("cleanup-precedence-sentinel"); }
        });
        return [];
      }
    };
    const provider: ReviewProvider = {
      name: "local-reviewer",
      async review() { throw new ProviderError("PROVIDER_REQUEST_FAILED"); }
    };

    const result = payload(await handleReviewRequest(request, { analyzer, provider }));
    expect(result).toEqual({ ok: false, code: "PROVIDER_FAILURE", message: "Provider failure" });
    expect(JSON.stringify(result)).not.toMatch(/cleanup-precedence-sentinel|stack/iu);
  });

  it("preserves exact malformed-request and recognized-limit classifications", async () => {
    expect(payload(await handleReviewRequest({ ...request, objective: "" }))).toEqual({
      ok: false,
      code: "INVALID_REQUEST",
      message: "Invalid request"
    });
    expect(payload(await handleReviewRequest({ ...request, limits: { maxEvidenceItems: 1 } }))).toEqual({
      ok: false,
      code: "LIMIT_EXCEEDED",
      message: "Evidence exceeds the configured limit"
    });
    expect(payload(await handleReviewRequest({ ...request, limits: { maxObjectiveLength: 10 } }))).toEqual({
      ok: false,
      code: "LIMIT_EXCEEDED",
      message: "Evidence exceeds the configured limit"
    });

    const largeTable = "😀".repeat(1_150_000);
    const parserLimitRequest = {
      ...request,
      reviewId: "parser-content-limit",
      evidence: [
        { id: "brief-limit", role: "assignment_brief", type: "table", content: largeTable },
        { id: "rubric-limit", role: "rubric", type: "table", content: largeTable },
        { id: "instructions-limit", role: "teacher_instructions", type: "table", content: largeTable },
        { id: "solution-limit", role: "solution", type: "table", content: largeTable },
        { id: "other-limit-1", role: "other", type: "table", content: largeTable },
        { id: "other-limit-2", role: "other", type: "table", content: largeTable },
        { id: "other-limit-3", role: "other", type: "table", content: largeTable }
      ]
    } as const;
    expect(payload(await handleReviewRequest(parserLimitRequest))).toEqual({
      ok: false,
      code: "LIMIT_EXCEEDED",
      message: "Evidence exceeds the configured limit"
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
    const invalidEnvelope = payload(await handleReviewRequest(request, { provider }));
    expect(invalidEnvelope).toEqual({ ok: false, code: "PROVIDER_FAILURE", message: "Provider failure" });
    const invalidEnvelopeText = JSON.stringify(invalidEnvelope);
    const errorText = rawText(await handleReviewRequest(request, {
      provider: {
        name: "local-reviewer",
        async review() {
          throw new ProviderError("PROVIDER_REQUEST_FAILED", Object.fromEntries(sentinels.map((sentinel, index) => [`detail${index}`, sentinel])));
        }
      }
    }));

    for (const sentinel of sentinels) {
      expect(invalidEnvelopeText).not.toContain(sentinel);
      expect(errorText).not.toContain(sentinel);
    }
  });

  it("strictly rejects each otherwise-valid provider result extra field", async () => {
    const extraFields = ["apiKey", "baseUrl", "providerRequestEnvelope", "providerResultEnvelope", "rawResponse", "retryTransport"] as const;
    let validResult: ProviderReviewResult | undefined;
    const base = fakeProvider();
    const validControl = reviewResponseSchema.parse(payload(await handleReviewRequest(request, {
      provider: {
        ...base,
        async review(providerRequest) {
          validResult = await base.review(providerRequest);
          return validResult;
        }
      }
    })));
    expect(validResult).toBeDefined();
    expect(providerReviewResultSchema.safeParse(validResult).success).toBe(true);
    expect(validControl.metadata.provider).toEqual({ name: "local-reviewer", model: "deepseek-v4-pro" });
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      for (const field of extraFields) {
        const sentinel = `private-${field}-sentinel`;
        const candidate = { ...validResult!, [field]: sentinel };
        expect(providerReviewResultSchema.safeParse(candidate).success, `direct ${field}`).toBe(false);
        const review = vi.fn(async (providerRequest: ProviderReviewRequest) => ({
          ...(await base.review(providerRequest)),
          [field]: sentinel
        }));
        const result = payload(await handleReviewRequest(request, { provider: { name: "local-reviewer", review } }));
        expect(review, field).toHaveBeenCalledTimes(1);
        expect(result, field).toEqual({ ok: false, code: "PROVIDER_FAILURE", message: "Provider failure" });
        expect(JSON.stringify(result), field).not.toContain(sentinel);
      }
      const consoleOutput = [...log.mock.calls, ...warn.mock.calls, ...error.mock.calls].flat().join(" ");
      expect(consoleOutput).not.toMatch(/private-(?:apiKey|baseUrl|providerRequestEnvelope|providerResultEnvelope|rawResponse|retryTransport)-sentinel/u);
      expect(log).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
      warn.mockRestore();
      error.mockRestore();
    }
  });

  it("rejects current private request tokens from every provider-authored public string without logging them", async () => {
    const failure = { ok: false, code: "PROVIDER_FAILURE", message: "Provider failure" };
    const sentinel = "provider-public-echo-sentinel";
    const fields = [
      { label: "id suffix", mutate: (finding: ReviewFinding, value: string) => ({ ...finding, id: value }) },
      { label: "title", mutate: (finding: ReviewFinding, value: string) => ({ ...finding, title: value }) },
      { label: "summary", mutate: (finding: ReviewFinding, value: string) => ({ ...finding, summary: value }) },
      { label: "observation", mutate: (finding: ReviewFinding, value: string) => ({ ...finding, observation: value }) },
      { label: "interpretation", mutate: (finding: ReviewFinding, value: string) => ({ ...finding, interpretation: value }) },
      { label: "uncertainty", mutate: (finding: ReviewFinding, value: string) => ({ ...finding, uncertainty: value }) },
      { label: "followUpChecks", mutate: (finding: ReviewFinding, value: string) => ({ ...finding, followUpChecks: [value] }) }
    ] as const;
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      for (const privateToken of ["inputFingerprint", "promptVersion"] as const) {
        for (const field of fields) {
          const base = fakeProvider();
          const baseline = payload(await handleReviewRequest(request, {
            provider: {
              ...base,
              async review(providerRequest) {
                const providerResult = await base.review(providerRequest);
                return {
                  ...providerResult,
                  modelFindings: [field.mutate(providerResult.modelFindings[0]!, `safe-${field.label.replace(" ", "-")}`)]
                };
              }
            }
          }));
          expect(reviewResponseSchema.safeParse(baseline).success, `${privateToken} ${field.label} baseline schema`).toBe(true);
          expect(baseline, `${privateToken} ${field.label} baseline handler`).toMatchObject({ ok: true });

          let forbiddenValue = "";
          const result = payload(await handleReviewRequest(request, {
            provider: {
              ...base,
              async review(providerRequest) {
                const providerResult = await base.review(providerRequest);
                forbiddenValue = providerRequest[privateToken];
                const value = `${sentinel}:${forbiddenValue}`;
                return {
                  ...providerResult,
                  modelFindings: [field.mutate(providerResult.modelFindings[0]!, value)]
                };
              }
            }
          }));
          const serialized = JSON.stringify(result);
          expect(result, `${privateToken} in ${field.label}`).toEqual(failure);
          expect(serialized, `${privateToken} in ${field.label}`).not.toContain(sentinel);
          expect(serialized, `${privateToken} in ${field.label}`).not.toContain(forbiddenValue);
        }
      }

      const consoleOutput = [...log.mock.calls, ...warn.mock.calls, ...error.mock.calls].flat().join(" ");
      expect(consoleOutput).not.toContain(sentinel);
      expect(consoleOutput).not.toMatch(/inputFingerprint|promptVersion|stack/iu);
      expect(log).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
      warn.mockRestore();
      error.mockRestore();
    }
  });

  it("allows locally-bound evidence ids and source references equal to the provider prompt version", async () => {
    const collisionRequests = [
      {
        label: "evidence id",
        input: {
          ...request,
          reviewId: "provider-evidence-id-collision",
          evidence: request.evidence.map((evidence, index) => index === 0
            ? { ...evidence, id: PROVIDER_PROMPT_VERSION }
            : evidence)
        }
      },
      {
        label: "source reference",
        input: {
          ...request,
          reviewId: "provider-source-reference-collision",
          evidence: request.evidence.map((evidence, index) => index === 0
            ? { ...evidence, reference: PROVIDER_PROMPT_VERSION }
            : evidence)
        }
      }
    ] as const;

    for (const collision of collisionRequests) {
      const result = payload(await handleReviewRequest(collision.input, { provider: fakeProvider() }));
      expect(result, collision.label).toMatchObject({ ok: true });
      expect(reviewResponseSchema.safeParse(result).success, collision.label).toBe(true);
    }
  });

  it("allows a schema-valid locally-bound table sheet collision through the provider-authored guard", async () => {
    const tableRequest = {
      ...request,
      reviewId: "provider-table-sheet-collision",
      evidence: request.evidence.map((evidence, index) => index === 0
        ? { id: evidence.id, role: evidence.role, type: "table" as const, reference: "fixture://assignment.csv", content: "criterion,requirement\nthreshold,Threshold must be 4." }
        : evidence)
    };
    const baseline = reviewResponseSchema.parse(payload(await handleReviewRequest(tableRequest, { provider: fakeProvider() })));
    const candidate = structuredClone(baseline);
    const normalized = candidate.normalizedEvidence.find((evidence) => evidence.source.id === "brief-1")!;
    const normalizedTableReference = normalized.references.find((reference) => reference.kind === "table")!;
    normalizedTableReference.sheetName = PROVIDER_PROMPT_VERSION;
    const providerFinding = candidate.findings.find((finding) => finding.id.startsWith("provider:"))!;
    const providerCitation = providerFinding.citations.find((citation) => citation.evidenceId === "brief-1")!;
    if (providerCitation.location.kind !== "table") throw new Error("expected table citation");
    providerCitation.location.sheetName = PROVIDER_PROMPT_VERSION;
    const schemaValid = reviewResponseSchema.parse(candidate);
    const reviewModule = await import("../../src/tools/review.js");
    const guard = (reviewModule as Record<string, unknown>).assertNoForbiddenProviderAuthoredStrings as
      | ((findings: readonly ReviewFinding[], forbiddenValues: ReadonlySet<string>) => void)
      | undefined;

    expect(guard).toBeTypeOf("function");
    expect(() => guard!(
      schemaValid.findings.filter((finding) => finding.id.startsWith("provider:")),
      new Set([PROVIDER_PROMPT_VERSION])
    )).not.toThrow();
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

  it("contains hostile provider getter and Proxy access inside the provider failure boundary", async () => {
    const hostileResults: Array<{ label: string; value: unknown }> = [
      {
        label: "provider getter TypeError",
        value: Object.defineProperty({}, "provider", {
          enumerable: true,
          get() { throw new TypeError("provider-getter-type-sentinel"); }
        })
      },
      {
        label: "provider getter RangeError",
        value: Object.defineProperty({}, "provider", {
          enumerable: true,
          get() { throw new RangeError("provider-getter-range-sentinel"); }
        })
      },
      {
        label: "provider Proxy ordinary Error",
        value: new Proxy({}, {
          ownKeys() { throw new Error("provider-proxy-error-sentinel"); }
        })
      },
      {
        label: "provider Proxy non-Error",
        value: new Proxy({}, {
          get() { throw "provider-proxy-non-error-sentinel"; }
        })
      }
    ];
    for (const hostile of hostileResults) {
      const result = payload(await handleReviewRequest(request, { provider: unsafeProvider(hostile.value) }));
      expect(result, hostile.label).toEqual({ ok: false, code: "PROVIDER_FAILURE", message: "Provider failure" });
      expect(result.code).not.toBe("INVALID_REQUEST");
      expect(result.code).not.toBe("LIMIT_EXCEEDED");
      expect(result.code).not.toBe("INTERNAL_ERROR");
      expect(JSON.stringify(result)).not.toMatch(/sentinel|stack|provider-getter|provider-proxy|local-reviewer/iu);
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
