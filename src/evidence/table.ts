import type { NormalizedEvidence } from "../contracts/review.js";
import { sha256Hex } from "./hash.js";
import { EVIDENCE_LIMITS, type EvidenceParserLimits } from "./limits.js";

export type TableEvidenceInput = {
  id: string;
  role: string;
  type: "table";
  reference: string;
  format?: "csv" | "tsv";
  sheetName?: string;
  bytes?: Uint8Array;
  text?: string;
  limits?: EvidenceParserLimits;
  generatedAt?: string;
};

function inputBytes(input: TableEvidenceInput): Uint8Array {
  if (input.bytes !== undefined) return input.bytes;
  if (input.text !== undefined) return Buffer.from(input.text, "utf8");
  throw new TypeError("table evidence requires bytes or text");
}

function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      if (character === "\r" && text[index + 1] === "\n") index += 1;
    } else {
      cell += character;
    }
  }

  if (cell !== "" || row.length > 0 || text.endsWith(delimiter)) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function columnLabel(column: number): string {
  let value = column;
  let label = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }
  return label;
}

export function normalizeTableEvidence(input: TableEvidenceInput): NormalizedEvidence {
  const originalBytes = inputBytes(input);
  const maxBytes = input.limits?.maxTableBytes ?? EVIDENCE_LIMITS.maxTableBytes;
  const maxRows = input.limits?.maxRows ?? EVIDENCE_LIMITS.maxRows;
  const maxColumns = input.limits?.maxColumns ?? EVIDENCE_LIMITS.maxColumns;
  const partial = originalBytes.byteLength > maxBytes;
  const extractedText = new TextDecoder().decode(partial ? originalBytes.slice(0, maxBytes) : originalBytes);
  const delimiter = input.format === "tsv" ? "\t" : ",";
  const rows = parseDelimited(extractedText, delimiter);
  const sheetName = input.sheetName ?? "Sheet1";
  const warnings: NormalizedEvidence["warnings"] = [];

  if (partial) {
    warnings.push({ code: "TABLE_SIZE_LIMIT", message: `Table input exceeds the maximum of ${maxBytes} bytes and was partially extracted.` });
  }

  const references: NormalizedEvidence["references"] = [];
  rows.slice(0, maxRows).forEach((row, rowIndex) => {
    row.slice(0, maxColumns).forEach((value, columnIndex) => {
      const rowNumber = rowIndex + 1;
      const columnNumber = columnIndex + 1;
      const cell = `${columnLabel(columnNumber)}${rowNumber}`;
      references.push({ kind: "table", sheetName, row: rowNumber, column: columnNumber, cell });
      if (/^[=+\-@]/u.test(value)) {
        warnings.push({
          code: "CELL_FORMULA_LITERAL",
          message: `${sheetName}!${cell} begins with a formula-like character and was preserved as literal text.`
        });
      }
    });
  });

  if (rows.length > maxRows) {
    warnings.push({ code: "TABLE_ROW_LIMIT", message: `Table input exceeds the maximum of ${maxRows} rows and was partially extracted.` });
  }
  if (rows.some((row) => row.length > maxColumns)) {
    warnings.push({ code: "TABLE_COLUMN_LIMIT", message: `Table input exceeds the maximum of ${maxColumns} columns and was partially extracted.` });
  }

  if (references.length === 0) {
    throw new TypeError("table evidence contains no cells");
  }

  return {
    source: { id: input.id, type: input.type, reference: input.reference },
    contentHash: sha256Hex(originalBytes),
    extraction: {
      extractor: "table-normalizer",
      extractorVersion: "1.0.0",
      generatedAt: input.generatedAt ?? new Date().toISOString(),
      partial: partial || rows.length > maxRows || rows.some((row) => row.length > maxColumns)
    },
    references,
    warnings
  };
}
