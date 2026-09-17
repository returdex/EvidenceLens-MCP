import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEEPSEEK_MODELS, hasProviderCredentialSource, loadProviderConfig, parseProviderConfig } from "../../src/providers/config.js";
import { ProviderError, serializeProviderError } from "../../src/providers/errors.js";

const key = "test-key-only";
const sanitizedConfigurationError = {
  code: "PROVIDER_CONFIGURATION",
  message: "Provider configuration is invalid",
  retryable: false,
  retryCount: 0
} as const;

function expectSanitizedConfigurationFailure(attempt: () => unknown, hostileValue: string): void {
  let caught: unknown;
  try { attempt(); } catch (error) { caught = error; }
  expect(caught).toBeInstanceOf(ProviderError);
  expect(serializeProviderError(caught)).toEqual(sanitizedConfigurationError);
  const serialized = JSON.stringify(serializeProviderError(caught));
  expect(serialized).not.toMatch(new RegExp(`${key}|stack|cause|evidencelens-integral`, "iu"));
  if (!/^\d+$/u.test(hostileValue)) {
    expect(serialized).not.toContain(hostileValue);
  }
}

describe("provider configuration", () => {
  it("applies defaults and accepts every allowlisted model", () => {
    expect(parseProviderConfig({ localConfig: { apiKey: key }, env: {} })).toMatchObject({ baseUrl: "https://api.deepseek.com", model: DEEPSEEK_MODELS[0], timeoutMs: 30000, maxRetries: 2, maxTotalWaitMs: 10000, maxTokens: 4000 });
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

  it.each([
    ["timeoutMs", 1000.5],
    ["maxRetries", 0.9],
    ["maxTotalWaitMs", 1000.5],
    ["maxTokens", 1.5]
  ] as const)("rejects fractional local %s values with the sanitized contract", (field, value) => {
    expectSanitizedConfigurationFailure(
      () => parseProviderConfig({ localConfig: { apiKey: key, [field]: value }, env: {} }),
      String(value)
    );
  });

  it.each([
    ["DEEPSEEK_TIMEOUT_MS", "1000.5"],
    ["DEEPSEEK_MAX_RETRIES", "0.9"],
    ["DEEPSEEK_MAX_TOTAL_WAIT_MS", "1000.5"],
    ["DEEPSEEK_MAX_TOKENS", "1.5"]
  ] as const)("rejects fractional environment %s values with the sanitized contract", (field, value) => {
    expectSanitizedConfigurationFailure(
      () => parseProviderConfig({ localConfig: {}, env: { DEEPSEEK_API_KEY: key, [field]: value } }),
      value
    );
  });

  it("rejects fractional integral values loaded from a local file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "evidencelens-integral-"));
    try {
      for (const [field, value] of [
        ["timeoutMs", 1000.5],
        ["maxRetries", 0.9],
        ["maxTotalWaitMs", 1000.5],
        ["maxTokens", 1.5]
      ] as const) {
        const path = join(directory, `${field}.json`);
        await writeFile(path, JSON.stringify({ apiKey: key, [field]: value }));
        expectSanitizedConfigurationFailure(() => loadProviderConfig(path, {}), String(value));
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it.each([
    ["timeoutMs", -1], ["timeoutMs", Number.NaN], ["timeoutMs", Number.POSITIVE_INFINITY], ["timeoutMs", "1000"], ["timeoutMs", 120001],
    ["maxRetries", -1], ["maxRetries", Number.NaN], ["maxRetries", Number.POSITIVE_INFINITY], ["maxRetries", "0"], ["maxRetries", 3],
    ["maxTotalWaitMs", -1], ["maxTotalWaitMs", Number.NaN], ["maxTotalWaitMs", Number.POSITIVE_INFINITY], ["maxTotalWaitMs", "1000"], ["maxTotalWaitMs", 60001],
    ["maxTokens", -1], ["maxTokens", Number.NaN], ["maxTokens", Number.POSITIVE_INFINITY], ["maxTokens", "1"], ["maxTokens", 20001]
  ] as const)("rejects invalid local %s value %#", (field, value) => {
    expectSanitizedConfigurationFailure(
      () => parseProviderConfig({ localConfig: { apiKey: key, [field]: value }, env: {} }),
      String(value)
    );
  });

  it("preserves integral bounds and fractional temperature", () => {
    expect(parseProviderConfig({ localConfig: { apiKey: key, timeoutMs: 1000, maxRetries: 0, maxTotalWaitMs: 1000, maxTokens: 1, temperature: 0.25 }, env: {} }))
      .toMatchObject({ timeoutMs: 1000, maxRetries: 0, maxTotalWaitMs: 1000, maxTokens: 1, temperature: 0.25 });
    expect(parseProviderConfig({ localConfig: { apiKey: key, timeoutMs: 120000, maxRetries: 2, maxTotalWaitMs: 60000, maxTokens: 20000, temperature: 1.75 }, env: {} }))
      .toMatchObject({ timeoutMs: 120000, maxRetries: 2, maxTotalWaitMs: 60000, maxTokens: 20000, temperature: 1.75 });
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
    expect(liveTest).toContain("hasProviderCredentialSource(undefined, process.env)");
    expect(liveTest).toContain("loadProviderConfig(undefined, process.env)");
    expect(liveTest.indexOf("hasProviderCredentialSource(undefined, process.env)")).toBeLessThan(liveTest.indexOf("loadProviderConfig(undefined, process.env)"));
    expect(liveTest).not.toMatch(/try\s*\{[^}]*loadProviderConfig[\s\S]*?catch/gu);
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

  it("distinguishes absent credential sources from every supplied-but-defective source", async () => {
    const directory = await mkdtemp(join(tmpdir(), "evidencelens-presence-"));
    const missing = join(directory, "missing.json");
    const malformed = join(directory, "malformed.json");
    const conflicting = join(directory, "conflicting.json");
    const unreadable = join(directory, "unreadable.json");
    const invalidModel = join(directory, "invalid-model.json");
    const invalidUrl = join(directory, "invalid-url.json");
    const invalidNumber = join(directory, "invalid-number.json");
    await writeFile(malformed, "{not-json SECRET-PRESENCE-MARKER}");
    await writeFile(conflicting, JSON.stringify({ apiKey: "local-presence-marker" }));
    await writeFile(unreadable, JSON.stringify({ apiKey: "file-presence-marker" }));
    await writeFile(invalidModel, JSON.stringify({ apiKey: key, model: "deepseek-invalid" }));
    await writeFile(invalidUrl, JSON.stringify({ apiKey: key, baseUrl: "http://external.invalid" }));
    await writeFile(invalidNumber, JSON.stringify({ apiKey: key, timeoutMs: 999 }));
    await chmod(unreadable, 0o000);

    try {
      expect(hasProviderCredentialSource(missing, {})).toBe(false);
      expect(hasProviderCredentialSource(missing, { DEEPSEEK_API_KEY: "" })).toBe(true);
      expect(hasProviderCredentialSource(missing, { DEEPSEEK_API_KEY: undefined })).toBe(true);

      const defectiveSources = [
        { path: malformed, env: {} },
        { path: conflicting, env: { DEEPSEEK_API_KEY: "env-presence-marker" } },
        { path: unreadable, env: {} },
        { path: directory, env: {} },
        { path: invalidModel, env: {} },
        { path: invalidUrl, env: {} },
        { path: invalidNumber, env: {} }
      ];
      for (const source of defectiveSources) {
        expect(hasProviderCredentialSource(source.path, source.env)).toBe(true);
        let caught: unknown;
        try { loadProviderConfig(source.path, source.env); } catch (error) { caught = error; }
        expect(caught).toBeInstanceOf(ProviderError);
        expect(serializeProviderError(caught)).toEqual({
          code: "PROVIDER_CONFIGURATION",
          message: "Provider configuration is invalid",
          retryable: false,
          retryCount: 0
        });
        expect(JSON.stringify(serializeProviderError(caught))).not.toMatch(/presence-marker|SECRET-PRESENCE-MARKER|external\.invalid|malformed|unreadable|stack|cause/iu);
      }
    } finally {
      await chmod(unreadable, 0o600);
      await rm(directory, { recursive: true, force: true });
    }
  });
});
