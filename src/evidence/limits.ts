export const EVIDENCE_LIMITS = {
  maxTextBytes: 1_000_000,
  maxTableBytes: 5_000_000,
  maxRows: 10_000,
  maxColumns: 256,
  maxPdfBytes: 25_000_000,
  maxPdfPages: 500,
  maxImageBytes: 25_000_000,
  maxImagePixels: 100_000_000,
  maxVisualPayloadBytes: 25_000_000
} as const;

export const MAX_TEXT_BYTES = EVIDENCE_LIMITS.maxTextBytes;
export const MAX_TABLE_BYTES = EVIDENCE_LIMITS.maxTableBytes;
export const MAX_PDF_BYTES = EVIDENCE_LIMITS.maxPdfBytes;
export const MAX_IMAGE_BYTES = EVIDENCE_LIMITS.maxImageBytes;

export type EvidenceParserLimits = Partial<typeof EVIDENCE_LIMITS>;
