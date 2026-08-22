import type { ReviewEvidenceInput, NormalizedEvidence } from "../contracts/review.js";
import { readFilesystemEvidence, type FilesystemReadAdapter } from "../filesystem/read.js";
import type { FilesystemPolicy } from "../filesystem/policy.js";
import { EvidenceLensError } from "../errors.js";
import { normalizeImageEvidence } from "./image.js";
import { normalizePdfEvidence } from "./pdf.js";
import { normalizeTableEvidence } from "./table.js";
import { normalizeTextEvidence } from "./text.js";
import type { TransientEvidenceAnalysis, ReviewAnalysisBundle } from "../review/analysis.js";

const sourceReference = (item: ReviewEvidenceInput): string => item.reference ?? `inline://${item.id}`;

export interface NormalizeEvidenceOptions {
  filesystemPolicy?: FilesystemPolicy;
  filesystemReadAdapter?: FilesystemReadAdapter;
  generatedAt?: string;
}

export type NormalizedEvidenceBundle = ReviewAnalysisBundle;

function tableCells(text: string, references: NormalizedEvidence["references"]): NonNullable<TransientEvidenceAnalysis["tableCells"]> {
  const rows = text.split(/\r\n|\n|\r/u).map((row) => row.split(","));
  return references.filter((reference): reference is Extract<typeof reference, { kind: "table" }> => reference.kind === "table").map((reference) => ({
    value: rows[reference.row - 1]?.[reference.column - 1] ?? "",
    location: reference
  }));
}

export async function normalizeEvidenceBundle(items: ReviewEvidenceInput[], options: NormalizeEvidenceOptions = {}): Promise<NormalizedEvidenceBundle> {
  const normalizedEvidence: NormalizedEvidence[] = [];
  const analysisPayloads: TransientEvidenceAnalysis[] = [];
  let transientBytes = 0;
  for (const item of items) {
    let reference = sourceReference(item);
    let bytes: Buffer | undefined;
    if (item.filesystem !== undefined) {
      if (options.filesystemPolicy === undefined) throw new EvidenceLensError("ACCESS_DENIED", "Filesystem access denied");
      const read = await readFilesystemEvidence(options.filesystemPolicy, item.filesystem, item.type, options.filesystemReadAdapter);
      reference = read.provenanceReference;
      bytes = read.bytes;
    } else if (item.content === undefined && item.contentBase64 === undefined) continue;
    const sourceBytes = bytes ?? (item.content !== undefined ? Buffer.from(item.content, "utf8") : Buffer.from(item.contentBase64 ?? "", "base64"));
    transientBytes += sourceBytes.byteLength;
    if (transientBytes > 32_000_000) throw new RangeError("Transient analysis payload exceeds the configured limit");
    let evidence: NormalizedEvidence;
    if (item.type === "text") evidence = normalizeTextEvidence({ id: item.id, role: item.role, type: "text", reference, ...(bytes ? { bytes } : { text: item.content }), generatedAt: options.generatedAt });
    else if (item.type === "table") evidence = normalizeTableEvidence({ id: item.id, role: item.role, type: "table", reference, format: item.format, ...(bytes ? { bytes } : { text: item.content }), generatedAt: options.generatedAt });
    else if (item.type === "pdf") evidence = await normalizePdfEvidence({ id: item.id, role: item.role, type: "pdf", reference, bytes: sourceBytes, generatedAt: options.generatedAt });
    else evidence = normalizeImageEvidence({ id: item.id, role: item.role, type: item.type, reference, bytes: sourceBytes, generatedAt: options.generatedAt });
    normalizedEvidence.push(evidence);
    const payload: TransientEvidenceAnalysis = { evidenceId: item.id, role: item.role, type: item.type, reference, contentHash: evidence.contentHash, references: evidence.references, byteLength: sourceBytes.byteLength };
    if (item.type === "text") payload.text = new TextDecoder().decode(sourceBytes.slice(0, 1_000_000));
    if (item.type === "table") payload.tableCells = tableCells(new TextDecoder().decode(sourceBytes.slice(0, 5_000_000)), evidence.references);
    if (item.type === "pdf" || item.type === "image" || item.type === "screenshot") payload.bytes = new Uint8Array(sourceBytes);
    analysisPayloads.push(payload);
  }
  return { normalizedEvidence, analysisPayloads };
}

export async function normalizeEvidenceItems(items: ReviewEvidenceInput[], options: NormalizeEvidenceOptions = {}): Promise<NormalizedEvidence[]> {
  return (await normalizeEvidenceBundle(items, options)).normalizedEvidence;
}
