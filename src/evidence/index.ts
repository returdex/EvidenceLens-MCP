import type { ReviewEvidenceInput, NormalizedEvidence } from "../contracts/review.js";
import { normalizeImageEvidence } from "./image.js";
import { normalizePdfEvidence } from "./pdf.js";
import { normalizeTableEvidence } from "./table.js";
import { normalizeTextEvidence } from "./text.js";

const sourceReference = (item: ReviewEvidenceInput): string => item.reference ?? `inline://${item.id}`;

export async function normalizeEvidenceItems(items: ReviewEvidenceInput[]): Promise<NormalizedEvidence[]> {
  const normalized: NormalizedEvidence[] = [];
  for (const item of items) {
    const reference = sourceReference(item);
    if (item.content === undefined && item.contentBase64 === undefined) continue;
    if (item.type === "text") {
      normalized.push(normalizeTextEvidence({ id: item.id, role: item.role, type: "text", reference, text: item.content }));
    } else if (item.type === "table") {
      normalized.push(normalizeTableEvidence({ id: item.id, role: item.role, type: "table", reference, text: item.content }));
    } else if (item.type === "pdf") {
      normalized.push(await normalizePdfEvidence({ id: item.id, role: item.role, type: "pdf", reference, bytes: Buffer.from(item.contentBase64 ?? "", "base64") }));
    } else {
      normalized.push(normalizeImageEvidence({ id: item.id, role: item.role, type: item.type, reference, bytes: Buffer.from(item.contentBase64 ?? "", "base64") }));
    }
  }
  return normalized;
}
