import { ProviderError } from "./errors.js";

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
  maxRetries: number;
  timeoutMs: number;
  maxTotalWaitMs: number;
  requestId?: string;
  clock?: RetryClock;
  operation: (signal: AbortSignal) => Promise<Response>;
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
  const started = clock.now();
  let retries = 0;

  while (true) {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, options.timeoutMs);
    try {
      const response = await options.operation(controller.signal);
      if (!isTransientStatus(response.status)) {
        if (!response.ok) throw new ProviderError("PROVIDER_REQUEST_FAILED", { retryable: false, requestId: options.requestId });
        return response;
      }
      if (retries >= options.maxRetries) throw new ProviderError("PROVIDER_RETRY_EXHAUSTED", { retryable: true, retryCount: retries, requestId: options.requestId });
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (timedOut) {
        if (retries >= options.maxRetries) throw new ProviderError("PROVIDER_RETRY_EXHAUSTED", { retryable: true, retryCount: retries, requestId: options.requestId });
      } else if (!isTransientTransportError(error)) {
        throw new ProviderError("PROVIDER_REQUEST_FAILED", { retryable: false, requestId: options.requestId });
      } else if (retries >= options.maxRetries) {
        throw new ProviderError("PROVIDER_RETRY_EXHAUSTED", { retryable: true, retryCount: retries, requestId: options.requestId });
      }
    } finally {
      clearTimeout(timer);
    }

    const delay = backoffMs(retries, clock.random());
    if (clock.now() - started + delay > options.maxTotalWaitMs) {
      throw new ProviderError("PROVIDER_RETRY_EXHAUSTED", { retryable: true, retryCount: retries, requestId: options.requestId });
    }
    retries += 1;
    await clock.sleep(delay);
  }
}

