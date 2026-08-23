export type ProviderErrorCode =
  | "PROVIDER_CONFIGURATION"
  | "PROVIDER_REQUEST_FAILED"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_INVALID_RESPONSE"
  | "PROVIDER_RETRY_EXHAUSTED";

export interface SerializedProviderError {
  code: ProviderErrorCode;
  message: string;
  retryable: boolean;
  retryCount: number;
  requestId?: string;
}

const stableMessages: Record<ProviderErrorCode, string> = {
  PROVIDER_CONFIGURATION: "Provider configuration is invalid",
  PROVIDER_REQUEST_FAILED: "Provider request failed",
  PROVIDER_TIMEOUT: "Provider request timed out",
  PROVIDER_INVALID_RESPONSE: "Provider response is invalid",
  PROVIDER_RETRY_EXHAUSTED: "Provider retries exhausted"
};

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly retryable: boolean;
  readonly retryCount: number;
  readonly requestId?: string;

  constructor(code: ProviderErrorCode, options: { retryable?: boolean; retryCount?: number; requestId?: string } = {}) {
    super(stableMessages[code]);
    this.name = "ProviderError";
    this.code = code;
    this.retryable = options.retryable ?? (code === "PROVIDER_TIMEOUT" || code === "PROVIDER_RETRY_EXHAUSTED");
    this.retryCount = Number.isInteger(options.retryCount) && (options.retryCount ?? 0) >= 0 ? options.retryCount! : 0;
    this.requestId = options.requestId?.replace(/[^A-Za-z0-9._-]/gu, "").slice(0, 128) || undefined;
  }

  toJSON(): SerializedProviderError {
    return { code: this.code, message: stableMessages[this.code], retryable: this.retryable, retryCount: this.retryCount, ...(this.requestId ? { requestId: this.requestId } : {}) };
  }
}

export function serializeProviderError(error: unknown): SerializedProviderError {
  if (error instanceof ProviderError) return error.toJSON();
  return { code: "PROVIDER_REQUEST_FAILED", message: stableMessages.PROVIDER_REQUEST_FAILED, retryable: false, retryCount: 0 };
}
