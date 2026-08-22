import { createCanvas } from "@napi-rs/canvas";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import type { NormalizedEvidence } from "../contracts/review.js";
import { sha256Hex } from "./hash.js";
import { EVIDENCE_LIMITS, type EvidenceParserLimits } from "./limits.js";

export type PdfEvidenceInput = {
  id: string;
  role: string;
  type: "pdf";
  reference: string;
  bytes: Uint8Array;
  limits?: EvidenceParserLimits;
  generatedAt?: string;
};

function safePdfError(): Error {
  return new Error("PDF could not be safely parsed or rendered");
}

export async function normalizePdfEvidence(input: PdfEvidenceInput): Promise<NormalizedEvidence> {
  const maxBytes = input.limits?.maxPdfBytes ?? EVIDENCE_LIMITS.maxPdfBytes;
  const maxPages = input.limits?.maxPdfPages ?? EVIDENCE_LIMITS.maxPdfPages;
  const maxPixels = input.limits?.maxImagePixels ?? EVIDENCE_LIMITS.maxImagePixels;
  const maxVisualBytes = input.limits?.maxVisualPayloadBytes ?? EVIDENCE_LIMITS.maxVisualPayloadBytes;
  if (input.bytes.byteLength > maxBytes) throw new RangeError(`PDF exceeds the maximum of ${maxBytes} bytes`);

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(input.bytes) });
  let document: Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>;
  try {
    // PDF.js rejects Buffer instances; retain an explicit Uint8Array copy at the trust boundary.
    document = await loadingTask.promise;
  } catch {
    throw safePdfError();
  }
  if (document.numPages < 1 || document.numPages > maxPages) throw new RangeError(`PDF page count exceeds the maximum of ${maxPages}`);

  const references: NormalizedEvidence["references"] = [];
  const warnings: NormalizedEvidence["warnings"] = [];
  let partial = false;
  let visualPayload: NormalizedEvidence["visualPayload"];
  const visualPayloads: NonNullable<NormalizedEvidence["visualPayloads"]> = [];
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const hasText = textContent.items.some((item) => "str" in item && item.str.trim().length > 0);
      references.push({ kind: "pdf", pageNumber, pageCount: document.numPages });
      if (hasText) continue;

      partial = true;
      warnings.push({ code: "PDF_PAGE_TEXT_UNAVAILABLE", message: `Page ${pageNumber} has no extractable text; a rendered visual payload was retained.` });
      const viewport = page.getViewport({ scale: 1 });
      const width = Math.max(1, Math.ceil(viewport.width));
      const height = Math.max(1, Math.ceil(viewport.height));
      if (width * height > maxPixels) throw safePdfError();
      const canvas = createCanvas(width, height);
      await page.render({ canvas: canvas as unknown as HTMLCanvasElement, canvasContext: canvas.getContext("2d") as unknown as CanvasRenderingContext2D, viewport }).promise;
      const renderedBytes = canvas.toBuffer("image/png");
      if (renderedBytes.byteLength > maxVisualBytes) throw safePdfError();
      const pageVisualPayload = {
        mimeType: "image/png",
        byteLength: renderedBytes.byteLength,
        width,
        height,
        sha256: sha256Hex(renderedBytes),
        base64: renderedBytes.toString("base64")
      };
      visualPayload ??= pageVisualPayload;
      visualPayloads.push({ ...pageVisualPayload, pageNumber });
    }
  } catch (error) {
    if (error instanceof RangeError) throw error;
    throw safePdfError();
  } finally {
    await loadingTask.destroy();
  }

  return {
    source: { id: input.id, type: input.type, reference: input.reference },
    role: input.role as NormalizedEvidence["role"],
    contentHash: sha256Hex(input.bytes),
    extraction: { extractor: "pdfjs-dist", extractorVersion: "6.2.108", generatedAt: input.generatedAt ?? new Date().toISOString(), partial },
    references,
    ...(visualPayload ? { visualPayload } : {}),
    ...(visualPayloads.length > 0 ? { visualPayloads } : {}),
    warnings
  };
}
