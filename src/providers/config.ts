import { lstatSync, readFileSync } from "node:fs";
import { ProviderError } from "./errors.js";

export const PROVIDER_CONFIG_FILE = ".evidencelens.local.json" as const;
export const DEEPSEEK_MODELS = ["deepseek-v4-pro", "deepseek-v4-flash", "deepseek-v4-flash-vision-exp"] as const;
const DEFAULTS = { baseUrl: "https://api.deepseek.com", model: "deepseek-v4-pro", timeoutMs: 30_000, maxRetries: 2, maxTotalWaitMs: 10_000, temperature: 0.2 } as const;
const CONFIG_KEYS = ["apiKey", "baseUrl", "model", "timeoutMs", "maxRetries", "maxTotalWaitMs", "temperature", "maxTokens"] as const;
type ConfigKey = typeof CONFIG_KEYS[number];

export interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  model: typeof DEEPSEEK_MODELS[number];
  timeoutMs: number;
  maxRetries: number;
  maxTotalWaitMs: number;
  temperature: number;
  maxTokens?: number;
}

export interface ProviderConfigOptions {
  localConfig?: unknown;
  env?: NodeJS.ProcessEnv;
  request?: unknown;
}

export function hasProviderCredentialSource(path = PROVIDER_CONFIG_FILE, env = process.env): boolean {
  if (Object.prototype.hasOwnProperty.call(env, "DEEPSEEK_API_KEY")) return true;
  try {
    lstatSync(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

function invalid(): never {
  throw new ProviderError("PROVIDER_CONFIGURATION", { retryable: false });
}

function objectRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function parseFiniteNumber(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) invalid();
  return value;
}

function parseInteger(value: unknown, min: number, max: number): number {
  const parsed = parseFiniteNumber(value, min, max);
  if (!Number.isInteger(parsed)) invalid();
  return parsed;
}

function parseEnvironment(env: NodeJS.ProcessEnv): { values: Partial<Record<ConfigKey, unknown>>; supplied: Set<ConfigKey> } {
  const mappings: Record<string, ConfigKey> = {
    DEEPSEEK_API_KEY: "apiKey", DEEPSEEK_BASE_URL: "baseUrl", DEEPSEEK_MODEL: "model", DEEPSEEK_TIMEOUT_MS: "timeoutMs",
    DEEPSEEK_MAX_RETRIES: "maxRetries", DEEPSEEK_MAX_TOTAL_WAIT_MS: "maxTotalWaitMs", DEEPSEEK_TEMPERATURE: "temperature", DEEPSEEK_MAX_TOKENS: "maxTokens"
  };
  const values: Partial<Record<ConfigKey, unknown>> = {};
  const supplied = new Set<ConfigKey>();
  for (const [name, key] of Object.entries(mappings)) {
    const raw = env[name];
    if (raw === undefined) continue;
    if (raw.trim() === "") invalid();
    supplied.add(key);
    values[key] = ["timeoutMs", "maxRetries", "maxTotalWaitMs", "temperature", "maxTokens"].includes(key) ? Number(raw) : raw;
  }
  return { values, supplied };
}

function rejectSecretBearingRequest(request: unknown): void {
  if (request === undefined) return;
  const visit = (value: unknown, depth: number): void => {
    if (depth > 8 || value === null || typeof value !== "object") return;
    if (Array.isArray(value)) { value.slice(0, 100).forEach((item) => visit(item, depth + 1)); return; }
    for (const [key, child] of Object.entries(value)) {
      if (/^(?:apiKey|api_key|DEEPSEEK_API_KEY|authorization|x-api-key)$/iu.test(key)) invalid();
      visit(child, depth + 1);
    }
  };
  visit(request, 0);
}

function validateUrl(value: unknown): string {
  if (typeof value !== "string" || value.length > 2048) invalid();
  let url: URL;
  try { url = new URL(value); } catch { invalid(); }
  const loopback = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(loopback && url.protocol === "http:")) invalid();
  return url.toString().replace(/\/$/u, "");
}

export function parseProviderConfig(options: ProviderConfigOptions = {}): ProviderConfig {
  rejectSecretBearingRequest(options.request);
  const local = objectRecord(options.localConfig ?? {});
  if (Object.keys(local).some((key) => !CONFIG_KEYS.includes(key as ConfigKey))) invalid();
  const environment = parseEnvironment(options.env ?? process.env);
  for (const key of CONFIG_KEYS) if (hasOwn(local, key) && environment.supplied.has(key)) invalid();
  const merged = { ...DEFAULTS, ...environment.values, ...local } as Record<string, unknown>;
  if (typeof merged.apiKey !== "string" || merged.apiKey.trim() === "" || merged.apiKey.length > 512 || /[\u0000-\u001F\u007F]/u.test(merged.apiKey)) invalid();
  if (typeof merged.model !== "string" || !DEEPSEEK_MODELS.includes(merged.model as typeof DEEPSEEK_MODELS[number])) invalid();
  return {
    apiKey: merged.apiKey,
    baseUrl: validateUrl(merged.baseUrl),
    model: merged.model as ProviderConfig["model"],
    timeoutMs: parseInteger(merged.timeoutMs, 1_000, 120_000),
    maxRetries: parseInteger(merged.maxRetries, 0, 2),
    maxTotalWaitMs: parseInteger(merged.maxTotalWaitMs, 1_000, 60_000),
    temperature: parseFiniteNumber(merged.temperature, 0, 2),
    ...(merged.maxTokens === undefined ? {} : { maxTokens: parseInteger(merged.maxTokens, 1, 393_216) })
  };
}

export function loadProviderConfig(path = PROVIDER_CONFIG_FILE, env?: NodeJS.ProcessEnv): ProviderConfig {
  let localConfig: unknown = {};
  try {
    localConfig = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") invalid();
  }
  return parseProviderConfig({ localConfig, env });
}
