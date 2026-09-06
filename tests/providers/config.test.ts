import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEEPSEEK_MODELS, loadProviderConfig, parseProviderConfig } from "../../src/providers/config.js";
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

  it("accepts an environment-only key for the named live command without disclosing it", async () => {
    const environmentKey = "environment-only-secret-marker";
    const config = parseProviderConfig({ localConfig: {}, env: { DEEPSEEK_API_KEY: environmentKey } });
    expect(config.apiKey).toBe(environmentKey);

    let caught: unknown;
    try {
      parseProviderConfig({ localConfig: { apiKey: "local-secret-marker" }, env: { DEEPSEEK_API_KEY: environmentKey } });
    } catch (error) {
      caught = error;
    }
    const serialized = JSON.stringify(serializeProviderError(caught));
    expect(serialized).not.toContain(environmentKey);
    expect(serialized).not.toContain("local-secret-marker");

    const liveTest = await readFile("tests/providers/deepseek-live.test.ts", "utf8");
    expect(liveTest).toContain("loadProviderConfig(undefined, process.env)");
  });

  it("classifies malformed, conflicting, and unreadable files without leaking inputs", async () => {
    const directory = await mkdtemp(join(tmpdir(), "evidencelens-config-"));
    const hostile = join(directory, "hostile.json");
    const conflict = join(directory, "conflict.json");
    const unreadable = join(directory, "unreadable.json");
    await writeFile(hostile, "{not-json SECRET-MATERIAL https://host.invalid}");
    await writeFile(conflict, JSON.stringify({ apiKey: "local-synthetic" }));
    await writeFile(unreadable, JSON.stringify({ apiKey: "file-synthetic" }));
    await chmod(unreadable, 0o000);
    try {
      const attempts = [
        () => loadProviderConfig(hostile, {}),
        () => loadProviderConfig(conflict, { DEEPSEEK_API_KEY: "env-synthetic" }),
        () => loadProviderConfig(unreadable, {})
      ];
      for (const attempt of attempts) {
        let caught: unknown;
        try { attempt(); } catch (error) { caught = error; }
        expect(caught).toBeInstanceOf(ProviderError);
        const payload = JSON.stringify(serializeProviderError(caught));
        expect(payload).toContain("PROVIDER_CONFIGURATION");
        expect(payload).not.toMatch(/synthetic|SECRET-MATERIAL|host\.invalid|hostile|unreadable|cause|stack/iu);
      }
    } finally {
      await chmod(unreadable, 0o600);
      await rm(directory, { recursive: true, force: true });
    }
  });
});
