import { describe, expect, it } from "vitest";
import { EvidenceLensError, toToolErrorResult } from "../../src/errors.js";
import { requiredReviewRoles, validateReviewRoles } from "../../src/review/roles.js";

const evidence = (role: string, id = role) => ({ id, role, type: "text" as const });

describe("required review roles", () => {
  it("exports the four required roles in stable order", () => {
    expect(requiredReviewRoles).toEqual(["assignment_brief", "rubric", "solution", "teacher_instructions"]);
  });

  it("reports missing and duplicate roles deterministically", () => {
    const result = validateReviewRoles({ evidence: [evidence("rubric"), evidence("rubric", "rubric-2")] } as never);
    expect(result).toEqual({ ok: false, missing: ["assignment_brief", "solution", "teacher_instructions"], duplicates: ["rubric"] });
  });

  it("accepts one of each required role regardless of order and ignores other", () => {
    const result = validateReviewRoles({ evidence: [evidence("other"), evidence("solution"), evidence("rubric"), evidence("teacher_instructions"), evidence("assignment_brief")] } as never);
    expect(result).toEqual({ ok: true, missing: [], duplicates: [] });
  });

  it("serializes only the stable generic role error", () => {
    const payload = JSON.parse(toToolErrorResult(new EvidenceLensError("INVALID_REVIEW_ROLES", "role=secret /Users/private.txt")).content[0]!.text);
    expect(payload).toEqual({ ok: false, code: "INVALID_REVIEW_ROLES", message: "Review evidence roles are invalid" });
    expect(JSON.stringify(payload)).not.toContain("secret");
    expect(JSON.stringify(payload)).not.toContain("private.txt");
  });
});
