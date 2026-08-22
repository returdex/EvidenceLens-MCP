import type { NormalizedEvidence } from "../contracts/review.js";
import { sha256Hex } from "./hash.js";
import { EVIDENCE_LIMITS, type EvidenceParserLimits } from "./limits.js";

export type TextEvidenceInput = {
  id: string;
  role: string;
  type: "text";
  reference: string;
  bytes?: Uint8Array;
  text?: string;
  limits?: EvidenceParserLimits;
  generatedAt?: string;
};

function inputBytes(input: TextEvidenceInput): Uint8Array {
  if (input.bytes !== undefined) return input.bytes;
  if (input.text !== undefined) return Buffer.from(input.text, "utf8");
  throw new TypeError("text evidence requires bytes or text");
}

export function normalizeTextEvidence(input: TextEvidenceInput): NormalizedEvidence {
  const originalBytes = inputBytes(input);
  const maxBytes = input.limits?.maxTextBytes ?? EVIDENCE_LIMITS.maxTextBytes;
  const partial = originalBytes.byteLength > maxBytes;
  const extractedText = new TextDecoder().decode(partial ? originalBytes.slice(0, maxBytes) : originalBytes);
  const lines = extractedText.split(/\r\n|\n|\r/u);
  if (lines.at(-1) === "" && lines.length > 1) lines.pop();

  const warnings = partial
    ? [{ code: "TEXT_SIZE_LIMIT", message: `Text input exceeds the maximum of ${maxBytes} bytes and was partially extracted.` }]
    : [];

  return {
    source: { id: input.id, type: input.type, reference: input.reference },
    role: input.role as NormalizedEvidence["role"],
    contentHash: sha256Hex(originalBytes),
    extraction: {
      extractor: "text-normalizer",
      extractorVersion: "1.0.0",
      generatedAt: input.generatedAt ?? new Date().toISOString(),
      partial
    },
    references: lines.map((_, index) => ({ kind: "text" as const, startLine: index + 1, endLine: index + 1 })),
    warnings
  };
}
