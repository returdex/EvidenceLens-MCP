import { ProviderError } from "./errors.js";
import { ProviderRequestBudgetError } from "./request-budget.js";
import type { DiagnosticFeature, DiagnosticSink } from "./diagnostics.js";

export interface RetryClock {
  now(): number;
  sleep(ms: number): Promise<void>;
  random(): number;
}

export const systemRetryClock: RetryClock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  random: () => Math.random()
};

export interface RetryOptions {
  retryPolicy?: "bounded" | "none";
  maxRetries: number;
  timeoutMs: number;
  maxTotalWaitMs: number;
  requestId?: string;
  clock?: RetryClock;
  diagnostics?: DiagnosticSink;
  operation: (signal: AbortSignal) => Promise<Response>;
}

const transportPath = ["provider", "transport", "fetch"] as const;
const causeKeysets = new Set([
  "code", "code,errno,hostname,syscall", "address,code,errno,port,syscall", "code,errno,syscall"
]);
const causeCategories = new Map<string, DiagnosticFeature["code"]>([
  ["ENOTFOUND", "dns"], ["EAI_AGAIN", "dns"],
  ["CERT_HAS_EXPIRED", "tls"], ["DEPTH_ZERO_SELF_SIGNED_CERT", "tls"],
  ["SELF_SIGNED_CERT_IN_CHAIN", "tls"], ["UNABLE_TO_VERIFY_LEAF_SIGNATURE", "tls"],
  ["ERR_TLS_CERT_ALTNAME_INVALID", "tls"],
  ["ECONNREFUSED", "connection"], ["ECONNRESET", "connection"], ["EHOSTUNREACH", "connection"],
  ["ENETUNREACH", "connection"], ["EPIPE", "connection"], ["UND_ERR_SOCKET", "connection"],
  ["ETIMEDOUT", "network_timeout"], ["UND_ERR_CONNECT_TIMEOUT", "network_timeout"],
  ["UND_ERR_HEADERS_TIMEOUT", "network_timeout"], ["UND_ERR_BODY_TIMEOUT", "network_timeout"]
]);

function transportErrorFeature(error: unknown): DiagnosticFeature | undefined {
  try {
    if (!(error instanceof TypeError) || Object.getPrototypeOf(error) !== TypeError.prototype || Object.keys(error).length !== 0) return undefined;
    const causeDescriptor = Object.getOwnPropertyDescriptor(error, "cause");
    if (causeDescriptor === undefined || !("value" in causeDescriptor) || causeDescriptor.enumerable || causeDescriptor.get !== undefined || causeDescriptor.set !== undefined) return undefined;
    const cause = causeDescriptor.value;
    if (!(cause instanceof Error)) return undefined;
    const causePrototype = Object.getPrototypeOf(cause);
    const directSystemErrorSubclass = causePrototype !== null
      && Object.getPrototypeOf(causePrototype) === Error.prototype
      && Reflect.ownKeys(causePrototype).length === 1
      && Reflect.ownKeys(causePrototype)[0] === "constructor";
    if (causePrototype !== Error.prototype && !directSystemErrorSubclass) return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(cause);
    const enumerableKeys = Object.entries(descriptors).filter(([, descriptor]) => descriptor.enumerable).map(([key]) => key).sort();
    if (!causeKeysets.has(enumerableKeys.join(","))) return undefined;
    const codeDescriptor = descriptors.code;
    if (codeDescriptor === undefined || !("value" in codeDescriptor) || typeof codeDescriptor.value !== "string") return undefined;
    const code = causeCategories.get(codeDescriptor.value);
    return code === undefined ? undefined : { path: transportPath, code };
  } catch {
    return undefined;
  }
}

function emit(diagnostics: DiagnosticSink | undefined, feature: DiagnosticFeature | undefined): void {
  if (feature !== undefined) diagnostics?.emit(feature);
}

export function isTransientStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

export function isTransientTransportError(error: unknown): boolean {
  return error instanceof TypeError || (error instanceof Error && /(?:network|socket|connection|fetch|econn|enotfound|reset|timed out)/iu.test(error.message));
}

function backoffMs(attempt: number, random: number): number {
  const base = Math.min(2_000, 250 * 2 ** attempt);
  return Math.round(base * (0.5 + Math.max(0, Math.min(1, random))));
}

function timeoutError(requestId: string | undefined): ProviderError {
  return new ProviderError("PROVIDER_TIMEOUT", { retryable: true, requestId });
}

export async function fetchWithRetry(options: RetryOptions): Promise<Response> {
  const clock = options.clock ?? systemRetryClock;
  const retryPolicy = options.retryPolicy ?? "bounded";
  if (retryPolicy === "none" && options.maxRetries !== 0) {
    throw new Error("PROVIDER_RETRY_POLICY_INVALID");
  }
  const maxRetries = retryPolicy === "none" ? 0 : Math.min(2, Math.max(0, Math.floor(options.maxRetries)));
  const started = clock.now();
  let retries = 0;

  while (true) {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, options.timeoutMs);
    try {
      const response = await options.operation(controller.signal);
      if (!isTransientStatus(response.status)) {
        if (!response.ok) {
          emit(options.diagnostics, { path: transportPath, code: "http_error" });
          throw new ProviderError("PROVIDER_REQUEST_FAILED", { retryable: false, requestId: options.requestId });
        }
        return response;
      }
      if (retries >= maxRetries) {
        emit(options.diagnostics, { path: transportPath, code: response.status === 429 ? "rate_limited" : "server_error" });
        throw new ProviderError("PROVIDER_RETRY_EXHAUSTED", { retryable: true, retryCount: retries, requestId: options.requestId });
      }
    } catch (error) {
      if (error instanceof ProviderError || error instanceof ProviderRequestBudgetError) throw error;
      if (timedOut) {
        if (retries >= maxRetries) {
          emit(options.diagnostics, { path: transportPath, code: "timeout" });
          throw new ProviderError("PROVIDER_RETRY_EXHAUSTED", { retryable: true, retryCount: retries, requestId: options.requestId });
        }
      } else if (!isTransientTransportError(error)) {
        emit(options.diagnostics, transportErrorFeature(error));
        throw new ProviderError("PROVIDER_REQUEST_FAILED", { retryable: false, requestId: options.requestId });
      } else if (retries >= maxRetries) {
        emit(options.diagnostics, transportErrorFeature(error));
        throw new ProviderError("PROVIDER_RETRY_EXHAUSTED", { retryable: true, retryCount: retries, requestId: options.requestId });
      }
    } finally {
      clearTimeout(timer);
    }

    const delay = backoffMs(retries, clock.random());
    if (clock.now() - started + delay > options.maxTotalWaitMs) {
      emit(options.diagnostics, { path: transportPath, code: "retry_budget" });
      throw new ProviderError("PROVIDER_RETRY_EXHAUSTED", { retryable: true, retryCount: retries, requestId: options.requestId });
    }
    retries += 1;
    await clock.sleep(delay);
  }
}
