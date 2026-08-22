import type { ImageReference, NormalizedEvidence } from "../contracts/review.js";
import { sha256Hex } from "./hash.js";
import { EVIDENCE_LIMITS, type EvidenceParserLimits } from "./limits.js";

export type ImageEvidenceInput = {
  id: string;
  role: string;
  type: "image" | "screenshot";
  reference: string;
  bytes: Uint8Array;
  limits?: EvidenceParserLimits;
  generatedAt?: string;
};

type ImageMetadata = { mimeType: "image/png" | "image/jpeg"; width: number; height: number };

function readUInt32BE(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, false);
}

function parsePng(bytes: Uint8Array): ImageMetadata | undefined {
  if (bytes.byteLength < 24 || !bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index])) return undefined;
  if (new TextDecoder().decode(bytes.slice(12, 16)) !== "IHDR") return undefined;
  return { mimeType: "image/png", width: readUInt32BE(bytes, 16), height: readUInt32BE(bytes, 20) };
}

function parseJpeg(bytes: Uint8Array): ImageMetadata | undefined {
  if (bytes.byteLength < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return undefined;
  let offset = 2;
  while (offset + 9 < bytes.byteLength) {
    if (bytes[offset] !== 0xff) return undefined;
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > bytes.byteLength) return undefined;
    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > bytes.byteLength) return undefined;
    const isSizeMarker = (marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf);
    if (isSizeMarker && segmentLength >= 7) {
      return { mimeType: "image/jpeg", width: (bytes[offset + 5] << 8) | bytes[offset + 6], height: (bytes[offset + 3] << 8) | bytes[offset + 4] };
    }
    offset += segmentLength;
  }
  return undefined;
}

function imageMetadata(bytes: Uint8Array): ImageMetadata {
  const metadata = parsePng(bytes) ?? parseJpeg(bytes);
  if (!metadata || metadata.width < 1 || metadata.height < 1) throw new TypeError("unsupported or invalid image bytes");
  return metadata;
}

export function normalizeImageEvidence(input: ImageEvidenceInput): NormalizedEvidence {
  const maxBytes = input.limits?.maxImageBytes ?? EVIDENCE_LIMITS.maxImageBytes;
  const maxPixels = input.limits?.maxImagePixels ?? EVIDENCE_LIMITS.maxImagePixels;
  const maxVisualBytes = input.limits?.maxVisualPayloadBytes ?? EVIDENCE_LIMITS.maxVisualPayloadBytes;
  if (input.bytes.byteLength > maxBytes) throw new RangeError(`image exceeds the maximum of ${maxBytes} bytes`);

  const metadata = imageMetadata(input.bytes);
  if (metadata.width * metadata.height > maxPixels) throw new RangeError(`image dimensions exceed the maximum of ${maxPixels} pixels`);
  const contentHash = sha256Hex(input.bytes);
  const warnings: NormalizedEvidence["warnings"] = [];
  const partial = input.bytes.byteLength > maxVisualBytes;
  if (partial) warnings.push({ code: "IMAGE_VISUAL_PAYLOAD_LIMIT", message: `Image visual payload exceeds the maximum of ${maxVisualBytes} bytes and was not retained.` });

  const reference: ImageReference = { kind: "image", width: metadata.width, height: metadata.height, mimeType: metadata.mimeType };
  return {
    source: { id: input.id, type: input.type, reference: input.reference },
    contentHash,
    extraction: { extractor: "image-normalizer", extractorVersion: "1.0.0", generatedAt: input.generatedAt ?? new Date().toISOString(), partial },
    references: [reference],
    ...(partial ? {} : { visualPayload: { ...metadata, byteLength: input.bytes.byteLength, sha256: contentHash, base64: Buffer.from(input.bytes).toString("base64") } }),
    warnings
  };
}
