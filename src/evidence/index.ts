import type { ReviewEvidenceInput, NormalizedEvidence } from "../contracts/review.js";
import { readFilesystemEvidence, type FilesystemReadAdapter } from "../filesystem/read.js";
import type { FilesystemPolicy } from "../filesystem/policy.js";
import { EvidenceLensError } from "../errors.js";
import { normalizeImageEvidence } from "./image.js";
import { normalizePdfEvidence } from "./pdf.js";
import { normalizeTableEvidence } from "./table.js";
import { normalizeTextEvidence } from "./text.js";

const sourceReference = (item: ReviewEvidenceInput): string => item.reference ?? `inline://${item.id}`;

export interface NormalizeEvidenceOptions {
  filesystemPolicy?: FilesystemPolicy;
  filesystemReadAdapter?: FilesystemReadAdapter;
  generatedAt?: string;
}

export async function normalizeEvidenceItems(items: ReviewEvidenceInput[], options: NormalizeEvidenceOptions = {}): Promise<NormalizedEvidence[]> {
  const normalized: NormalizedEvidence[] = [];
  for (const item of items) {
    let reference = sourceReference(item);
    let bytes: Buffer | undefined;
    if (item.filesystem !== undefined) {
      if (options.filesystemPolicy === undefined) throw new EvidenceLensError("ACCESS_DENIED", "Filesystem access denied");
      const read = await readFilesystemEvidence(options.filesystemPolicy, item.filesystem, item.type, options.filesystemReadAdapter);
      reference = read.provenanceReference;
      bytes = read.bytes;
    } else if (item.content === undefined && item.contentBase64 === undefined) continue;
    if (item.type === "text") {
      normalized.push(normalizeTextEvidence({ id: item.id, role: item.role, type: "text", reference, ...(bytes ? { bytes } : { text: item.content }), generatedAt: options.generatedAt }));
    } else if (item.type === "table") {
      normalized.push(normalizeTableEvidence({ id: item.id, role: item.role, type: "table", reference, format: item.format, ...(bytes ? { bytes } : { text: item.content }), generatedAt: options.generatedAt }));
    } else if (item.type === "pdf") {
      normalized.push(await normalizePdfEvidence({ id: item.id, role: item.role, type: "pdf", reference, bytes: bytes ?? Buffer.from(item.contentBase64 ?? "", "base64"), generatedAt: options.generatedAt }));
    } else {
      normalized.push(normalizeImageEvidence({ id: item.id, role: item.role, type: item.type, reference, bytes: bytes ?? Buffer.from(item.contentBase64 ?? "", "base64"), generatedAt: options.generatedAt }));
    }
  }
  return normalized;
}
