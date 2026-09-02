import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

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

describe("public attribution and determinism documentation contract", () => {
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
    expect(contract).toContain('"provider": {');
    expect(contract).toContain('"name": "deepseek"');
    expect(contract).toContain('"model": "deepseek-v4-pro"');
  });
});
