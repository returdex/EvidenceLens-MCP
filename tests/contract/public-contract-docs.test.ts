import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { reviewRequestSchema, reviewResponseSchema, reviewToolResultSchema } from "../../src/contracts/review.js";
import { handleReviewRequest } from "../../src/tools/review.js";

const documents = ["docs/mcp-contract.md", "README.md"] as const;

function clauses(markdown: string): string[] {
  return markdown
    .replace(/[`*#]/gu, "")
    .split(/[.!?](?:\s+|$)|\n+/u)
    .map((clause) => clause.replace(/\s+/gu, " ").trim().toLowerCase())
    .filter(Boolean);
}

function containsAll(clause: string, terms: readonly string[]): boolean {
  return terms.every((term) => clause.includes(term));
}

function findForbiddenDeterminismClaims(markdown: string): string[] {
  const withoutFencedCode = markdown.replace(/```[\s\S]*?```/gu, "");
  return clauses(withoutFencedCode).filter((clause) =>
    /(?:^|\b)(?:all |every |whole )?findings?[^.;]*(?:deterministic(?:ally)? ordered|stable order)/u.test(clause)
    || /(?:all|every) responses?[^.;]*(?:deterministic (?:order|content)|stable order|byte-for-byte)/u.test(clause)
    || /provider-backed[^.;]*(?:byte-for-byte|deterministic(?:ally)? ordered|stable order|deterministic order)/u.test(clause)
    || /provider findings?[^.;]*(?:deterministic(?:ally)? ordered|stable order|deterministic order)/u.test(clause)
  );
}

function providerResultRejectionSemantics(markdown: string): { forbidden: string[]; required: boolean } {
  const withoutFencedCode = markdown.replace(/```[\s\S]*?```/gu, "");
  const prose = clauses(withoutFencedCode);
  const resultClauses = prose.filter((clause) => /provider (?:result|envelope)|provider result\/envelope|strict provider envelopes/u.test(clause));
  return {
    forbidden: resultClauses.filter((clause) =>
      /\b(?:discard|drop|ignore|strip)(?:s|ped)?\b[^.;]*(?:non-public|unknown|private|extra)/u.test(clause)
      || /(?:non-public|unknown|private|extra)[^.;]*\b(?:discard|drop|ignore|strip)(?:s|ped)?\b/u.test(clause)
    ),
    required: resultClauses.some((clause) =>
      containsAll(clause, ["strict", "reject", "entire", "unknown", "private", "extra field", "provider_failure"])
    )
  };
}

function cleanupContractSemantics(markdown: string): { paragraph: string; complete: boolean } {
  const withoutFencedCode = markdown.replace(/```[\s\S]*?```/gu, "");
  const paragraph = withoutFencedCode
    .split(/\n\s*\n/gu)
    .map((candidate) => candidate.replace(/[`*#]/gu, "").replace(/\s+/gu, " ").trim().toLowerCase())
    .find((candidate) => candidate.includes("cleanup") && candidate.includes("best-effort") && candidate.includes("internal_error")) ?? "";
  const required = [
    /original and analyzer-isolated requirement and solution claim objects/u,
    /claim text, key, and value/u,
    /captured original and current token arrays/u,
    /top-level requirements and solutionclaims arrays/u,
    /payload text/u,
    /table-cell values/u,
    /mutable byte buffers/u,
    /best-effort/u,
    /continues after (?:an|any) individual cleanup (?:action )?fails/u,
    /sanitized internal_error only when no earlier error is pending/u,
    /earlier error (?:keeps|retains) precedence/u
  ];
  return { paragraph, complete: paragraph.length > 0 && required.every((pattern) => pattern.test(paragraph)) };
}

function jsonBlocksUnderHeading(markdown: string, heading: string): unknown[] {
  const headingStart = markdown.indexOf(`## ${heading}`);
  if (headingStart < 0) throw new Error(`Missing ${heading} heading`);
  const remainder = markdown.slice(headingStart + heading.length + 3);
  const nextHeading = remainder.search(/\n##\s/u);
  const section = nextHeading < 0 ? remainder : remainder.slice(0, nextHeading);
  const blocks = [...section.matchAll(/```json\s*([\s\S]*?)```/gu)].map((match) => JSON.parse(match[1]!));
  if (blocks.length === 0) throw new Error(`Missing JSON block under ${heading}`);
  return blocks;
}

describe("public attribution and determinism documentation contract", () => {
  it("rejects silent provider-result discard claims and requires whole-result rejection", async () => {
    const forbidden = [
      "Strict provider result envelopes discard non-public fields.",
      "Provider results drop unknown fields and continue.",
      "The provider envelope may ignore private extras.",
      "Provider result validation will strip extras and continue."
    ];
    for (const fixture of forbidden) {
      expect(providerResultRejectionSemantics(fixture).forbidden, fixture).toEqual(clauses(fixture));
    }
    const required = "Strict provider result/envelope validation rejects the entire result when unknown or private extra fields are present and returns sanitized PROVIDER_FAILURE.";
    expect(providerResultRejectionSemantics(required)).toEqual({ forbidden: [], required: true });

    const actual = providerResultRejectionSemantics(await readFile("docs/mcp-contract.md", "utf8"));
    expect(actual.forbidden).toEqual([]);
    expect(actual.required).toBe(true);
  });

  it("requires the complete cleanup category and precedence contract in one normative paragraph", async () => {
    const complete = "Cleanup makes a best-effort pass over original and analyzer-isolated requirement and solution claim objects, claim text, key, and value, captured original and current token arrays, top-level requirements and solutionClaims arrays, payload text, table-cell values, and mutable byte buffers; cleanup continues after any individual cleanup action fails, returns sanitized INTERNAL_ERROR only when no earlier error is pending, and an earlier error keeps precedence.";
    expect(cleanupContractSemantics(complete).complete).toBe(true);

    const incomplete = `${complete.replace("captured original and current token arrays, ", "")}\n\nToken arrays are discussed elsewhere.\n\n\`\`\`text\ncaptured original and current token arrays\n\`\`\``;
    expect(cleanupContractSemantics(incomplete).complete).toBe(false);
    expect(cleanupContractSemantics("Cleanup is best-effort and returns INTERNAL_ERROR. Other prose names claim text, token arrays, payload text, table-cell values, and buffers.").complete).toBe(false);

    const actual = cleanupContractSemantics(await readFile("docs/mcp-contract.md", "utf8"));
    expect(actual.paragraph).not.toBe("");
    expect(actual.complete).toBe(true);
  });

  it("detects forbidden guarantees while allowing scoped deterministic-analyzer language", () => {
    const forbidden = [
      "Findings are deterministically ordered.",
      "The whole findings list has stable order.",
      "All responses have deterministic content.",
      "Every response is byte-for-byte stable.",
      "Provider-backed results are byte-for-byte equal.",
      "Provider-backed findings have stable order.",
      "Provider findings are deterministically ordered."
    ];
    for (const clause of forbidden) expect(findForbiddenDeterminismClaims(clause)).toEqual(clauses(clause));

    const allowed = [
      "Deterministic analyzer finding order/content is stable for identical offline inputs.",
      "Provider findings use a provider namespace.",
      "Provider attribution includes name and model.",
      "Provider-backed responses receive strict schema validation.",
      "```text\nProvider-backed findings are deterministically ordered.\n```"
    ];
    for (const clause of allowed) expect(findForbiddenDeterminismClaims(clause)).toEqual([]);
  });

  it.each(documents)("contains no contradictory determinism guarantees in %s", async (path) => {
    expect(findForbiddenDeterminismClaims(await readFile(path, "utf8"))).toEqual([]);
  });

  it.each(documents)("scopes identical-input equality in %s to deterministic-only output", async (path) => {
    const text = await readFile(path, "utf8");
    const normalized = text.replace(/[`*#]/gu, "").replace(/\s+/gu, " ").toLowerCase();
    const equalityClauses = clauses(text).filter((clause) =>
      /byte-for-byte|deterministic for identical input|identical inputs? (?:produce|return|remain)/u.test(clause)
    );

    expect(normalized).not.toContain("review_evidence is read-only, idempotent, deterministic for identical input");
    expect(normalized).not.toContain("identical requests produce byte-for-byte equal deterministic json");
    expect(equalityClauses.length).toBeGreaterThan(0);
    for (const clause of equalityClauses) {
      expect(clause).toMatch(/offline|deterministic-only/u);
      expect(clause).not.toMatch(/provider-backed[^.;]*byte-for-byte/u);
      expect(clause).not.toMatch(/(?:all|every|successful) responses?[^.;]*(?:byte-for-byte|deterministic for identical input)/u);
      expect(clause).not.toMatch(/review_evidence[^.;]*(?:byte-for-byte|deterministic for identical input)/u);
    }
  });

  it.each(documents)("states provider variability and only the four guarantees in %s", async (path) => {
    const documentClauses = clauses(await readFile(path, "utf8"));
    const guarantee = documentClauses.find((clause) =>
      containsAll(clause, [
        "provider-backed responses guarantee only",
        "strict schema validation",
        "safe attribution",
        "provider finding namespacing",
        "locally validated citation/hash provenance"
      ])
    );

    expect(guarantee).toBeDefined();
    expect(documentClauses.some((clause) =>
      clause.includes("provider-backed finding content may vary between calls")
    )).toBe(true);
  });

  it.each(documents)("keeps the complete internal provider data list non-public in %s", async (path) => {
    const documentClauses = clauses(await readFile(path, "utf8"));
    const exclusion = documentClauses.find((clause) =>
      containsAll(clause, [
        "credentials/api keys",
        "endpoint/base url",
        "prompt text/version",
        "input fingerprint",
        "provider request/result envelope",
        "raw upstream response",
        "retry/transport internals",
        "never public",
        "never serialized"
      ])
    );
    const allowlist = documentClauses.find((clause) =>
      containsAll(clause, ["only provider name and model", "public attribution"])
    );

    expect(exclusion).toBeDefined();
    expect(allowlist).toBeDefined();
  });

  it("defines additive provider attribution compatibility and presence semantics", async () => {
    const contract = (await readFile("docs/mcp-contract.md", "utf8"))
      .replace(/[`*#]/gu, "")
      .replace(/\s+/gu, " ")
      .toLowerCase();

    expect(contract).toContain("optional additive metadata.provider");
    expect(contract).toContain("if and only if provider findings are returned");
    expect(contract).toContain("all prior fields and deterministic-only response bytes are retained");
    expect(contract).toContain("consumers should tolerate the optional provider child on provider-backed responses");
    expect(contract).toContain("contains exactly provider name and model");
    expect(contract).toContain("only provider name and model are public attribution");
  });

  it("keeps the documented INVALID_REQUEST example equal to stable runtime output", async () => {
    const [documented] = jsonBlocksUnderHeading(await readFile("docs/mcp-contract.md", "utf8"), "Error response");
    const runtime = await handleReviewRequest({ reviewId: "docs-invalid-request", objective: "", evidence: [] });
    const actual = JSON.parse(reviewToolResultSchema.parse(runtime).content[0]!.text) as unknown;
    const expected = { ok: false, code: "INVALID_REQUEST", message: "Invalid request" };

    expect(documented).toEqual(expected);
    expect(actual).toEqual(expected);
    expect(documented).toEqual(actual);
  });

  it("keeps the documented four-role request exactly equal to its deterministic runtime response", async () => {
    const blocks = jsonBlocksUnderHeading(
      await readFile("docs/mcp-contract.md", "utf8"),
      "Deterministic analysis and success response"
    );
    expect(blocks).toHaveLength(2);
    const documentedRequest = reviewRequestSchema.parse(blocks[0]);
    const documentedResponse = blocks[1];
    const runtime = await handleReviewRequest(documentedRequest);
    const actual = JSON.parse(reviewToolResultSchema.parse(runtime).content[0]!.text) as unknown;
    const parsed = reviewResponseSchema.parse(actual);

    expect(actual).toEqual(documentedResponse);
    expect(reviewResponseSchema.parse(documentedResponse)).toEqual(parsed);
    expect(parsed.findings.length).toBeGreaterThan(0);
    expect(parsed.metadata.analyzerName).toBe("deterministic-rules");
    expect(parsed.metadata.analyzerVersion).toBe("1.0.0");
    expect(parsed.metadata).not.toHaveProperty("provider");
    expect(parsed.requestId).toBe(documentedRequest.reviewId);
    expect(parsed.metadata.generatedAt).toBe("1970-01-01T00:00:00.000Z");
  });
});
