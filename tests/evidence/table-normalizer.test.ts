import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { normalizedEvidenceSchema } from "../../src/contracts/review.js";
import { sha256Hex } from "../../src/evidence/hash.js";
import { EVIDENCE_LIMITS } from "../../src/evidence/limits.js";
import { normalizeTableEvidence } from "../../src/evidence/table.js";

const fixturePath = new URL("../fixtures/evidence/tables/rubric.csv", import.meta.url);

describe("table evidence normalizer", () => {
  it("preserves sheet, row, column, and A1 cell context for CSV cells", async () => {
    const bytes = await readFile(fixturePath);
    const artifact = normalizeTableEvidence({
      id: "rubric-1",
      role: "rubric",
      type: "table",
      reference: "fixtures/evidence/tables/rubric.csv",
      bytes,
      generatedAt: "2026-08-22T00:00:00.000Z"
    });

    expect(artifact.source).toEqual({
      id: "rubric-1",
      type: "table",
      reference: "fixtures/evidence/tables/rubric.csv"
    });
    expect(artifact.contentHash).toBe(sha256Hex(bytes));
    expect(artifact.references).toHaveLength(16);
    expect(artifact.references.slice(0, 4)).toEqual([
      { kind: "table", sheetName: "Sheet1", row: 1, column: 1, cell: "A1" },
      { kind: "table", sheetName: "Sheet1", row: 1, column: 2, cell: "B1" },
      { kind: "table", sheetName: "Sheet1", row: 1, column: 3, cell: "C1" },
      { kind: "table", sheetName: "Sheet1", row: 1, column: 4, cell: "D1" }
    ]);
    expect(artifact.references.at(-1)).toEqual({
      kind: "table", sheetName: "Sheet1", row: 4, column: 4, cell: "D4"
    });
    expect(artifact.warnings).toEqual([
      { code: "CELL_FORMULA_LITERAL", message: "Sheet1!D2 begins with a formula-like character and was preserved as literal text." },
      { code: "CELL_FORMULA_LITERAL", message: "Sheet1!D4 begins with a formula-like character and was preserved as literal text." }
    ]);
    expect(normalizedEvidenceSchema.safeParse(artifact).success).toBe(true);
  });

  it("reports row and column limits instead of silently returning truncated success", () => {
    const artifact = normalizeTableEvidence({
      id: "limited-table",
      role: "other",
      type: "table",
      reference: "inline.csv",
      text: "a,b\n1,2\n3,4",
      limits: { maxRows: 2, maxColumns: EVIDENCE_LIMITS.maxColumns },
      generatedAt: "2026-08-22T00:00:00.000Z"
    });

    expect(artifact.extraction.partial).toBe(true);
    expect(artifact.warnings).toContainEqual({
      code: "TABLE_ROW_LIMIT",
      message: expect.stringContaining("maximum")
    });
  });
});
