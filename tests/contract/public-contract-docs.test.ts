import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { reviewResponseSchema, reviewToolResultSchema } from "../../src/contracts/review.js";
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

function firstJsonBlockUnderHeading(markdown: string, heading: string): unknown {
  const headingStart = markdown.indexOf(`## ${heading}`);
  if (headingStart < 0) throw new Error(`Missing ${heading} heading`);
  const remainder = markdown.slice(headingStart + heading.length + 3);
  const nextHeading = remainder.search(/\n##\s/u);
  const section = nextHeading < 0 ? remainder : remainder.slice(0, nextHeading);
  const json = section.match(/```json\s*([\s\S]*?)```/u)?.[1];
  if (json === undefined) throw new Error(`Missing JSON block under ${heading}`);
  return JSON.parse(json);
}

describe("public attribution and determinism documentation contract", () => {
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
    const documented = firstJsonBlockUnderHeading(await readFile("docs/mcp-contract.md", "utf8"), "Error response");
    const runtime = await handleReviewRequest({ reviewId: "docs-invalid-request", objective: "", evidence: [] });
    const actual = JSON.parse(reviewToolResultSchema.parse(runtime).content[0]!.text) as unknown;
    const expected = { ok: false, code: "INVALID_REQUEST", message: "Invalid request" };

    expect(documented).toEqual(expected);
    expect(actual).toEqual(expected);
    expect(documented).toEqual(actual);
  });

  it("keeps the documented success response executable against the public schema", async () => {
    const documented = firstJsonBlockUnderHeading(
      await readFile("docs/mcp-contract.md", "utf8"),
      "Deterministic analysis and success response"
    );

    expect(() => reviewResponseSchema.parse(documented)).not.toThrow();
  });
});
