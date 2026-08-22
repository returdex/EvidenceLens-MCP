import type { ReviewToolResult } from "./contracts/review.js";

export type EvidenceLensErrorCode =
  | "INVALID_REQUEST"
  | "UNSUPPORTED_EVIDENCE_TYPE"
  | "UNSUPPORTED_FORMAT"
  | "LIMIT_EXCEEDED"
  | "ACCESS_DENIED"
  | "PROVIDER_FAILURE"
  | "INTERNAL_ERROR";

export class EvidenceLensError extends Error {
  readonly code: EvidenceLensErrorCode;

  constructor(code: EvidenceLensErrorCode, message: string) {
    super(message);
    this.name = "EvidenceLensError";
    this.code = code;
  }
}

function sanitizeMessage(message: string): string {
  return message
    .replace(/[\u0000-\u001F\u007F]+/gu, " ")
    .replace(/(?:[A-Za-z]:)?\/(?:Users|home|var|tmp|private|etc)\/[^\s"]+/gu, "[redacted-path]")
    .replace(/\b[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)[A-Z0-9_]*=[^\s"]+/giu, "[redacted-secret]")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 500);
}

function stableMessage(code: EvidenceLensErrorCode): string {
  switch (code) {
    case "ACCESS_DENIED": return "Filesystem access denied";
    case "UNSUPPORTED_FORMAT": return "Unsupported evidence format";
    case "PROVIDER_FAILURE": return "Provider failure";
    case "LIMIT_EXCEEDED": return "Evidence exceeds the configured limit";
    case "UNSUPPORTED_EVIDENCE_TYPE": return "Unsupported evidence type";
    case "INVALID_REQUEST": return "Invalid request";
    case "INTERNAL_ERROR": return "Internal error";
  }
}

function normalizeError(error: unknown): EvidenceLensError {
  if (error instanceof EvidenceLensError) {
    return new EvidenceLensError(error.code, stableMessage(error.code));
  }

  if (error instanceof Error) {
    return new EvidenceLensError("INTERNAL_ERROR", "Internal error");
  }

  return new EvidenceLensError("INTERNAL_ERROR", "Internal error");
}

export function toToolErrorResult(error: unknown): ReviewToolResult {
  const normalized = normalizeError(error);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          ok: false,
          code: normalized.code,
          message: sanitizeMessage(normalized.message)
        })
      }
    ]
  };
}
