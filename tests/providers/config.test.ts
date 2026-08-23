import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { DEEPSEEK_MODELS, parseProviderConfig } from "../../src/providers/config.js";
import { ProviderError, serializeProviderError } from "../../src/providers/errors.js";

const key = "test-key-only";

describe("provider configuration", () => {
  it("applies defaults and accepts every allowlisted model", () => {
    expect(parseProviderConfig({ localConfig: { apiKey: key }, env: {} })).toMatchObject({ baseUrl: "https://api.deepseek.com", model: DEEPSEEK_MODELS[0], timeoutMs: 30000, maxRetries: 2, maxTotalWaitMs: 10000 });
    for (const model of DEEPSEEK_MODELS) expect(parseProviderConfig({ localConfig: { apiKey: key, model }, env: {} }).model).toBe(model);
  });

  it.each([
    { model: "deepseek-v3" }, { apiKey: "" }, { baseUrl: "http://example.com" }, { baseUrl: "ftp://api.deepseek.com" },
    { timeoutMs: 999 }, { maxRetries: 3 }, { maxTotalWaitMs: 0 }, { temperature: 3 }, { maxTokens: 0 }
  ])("rejects unsafe settings: $model", (settings) => {
    expect(() => parseProviderConfig({ localConfig: { apiKey: key, ...settings }, env: {} })).toThrowError(ProviderError);
  });

  it("fails closed for missing credentials, source conflicts, unknown keys, and request secrets", () => {
    expect(() => parseProviderConfig({ localConfig: {}, env: {} })).toThrowError(ProviderError);
    expect(() => parseProviderConfig({ localConfig: { apiKey: key }, env: { DEEPSEEK_API_KEY: "other" } })).toThrowError(ProviderError);
    expect(() => parseProviderConfig({ localConfig: { apiKey: key, extra: true }, env: {} })).toThrowError(ProviderError);
    expect(() => parseProviderConfig({ localConfig: { apiKey: key }, env: {}, request: { DEEPSEEK_API_KEY: key } })).toThrowError(ProviderError);
  });

  it("serializes only stable safe error metadata and commits a redacted example", async () => {
    const error = new ProviderError("PROVIDER_CONFIGURATION", { requestId: "req-1", retryCount: 0 });
    const serialized = JSON.stringify(serializeProviderError(error));
    expect(serialized).not.toContain(key);
    expect(serialized).not.toContain("api.deepseek.com");
    const example = JSON.parse(await readFile(".evidencelens.local.example.json", "utf8"));
    expect(example).toMatchObject({ apiKey: "REPLACE_WITH_DEEPSEEK_API_KEY", model: DEEPSEEK_MODELS[0], timeoutMs: 30000, maxRetries: 2, maxTotalWaitMs: 10000 });
  });
});
