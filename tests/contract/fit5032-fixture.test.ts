import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { reviewResponseSchema, type ReviewRequest } from "../../src/contracts/review.js";
import { handleReviewRequest } from "../../src/tools/review.js";

const fixtureUrl = new URL("../fixtures/reviews/fit5032-week4-library-review.json", import.meta.url);

async function loadFixture(): Promise<ReviewRequest> {
  return JSON.parse(await readFile(fixtureUrl, "utf8")) as ReviewRequest;
}

async function runFixture(request: ReviewRequest) {
  const result = await handleReviewRequest(request);
  expect(result.content).toHaveLength(1);
  expect(result.content[0]?.type).toBe("text");
  const payload = JSON.parse(result.content[0]?.text ?? "{}");
  expect(reviewResponseSchema.safeParse(payload).success).toBe(true);
  return payload as ReturnType<typeof reviewResponseSchema.parse>;
}

describe("FIT5032 Week 4 Library review fixture", () => {
  it("produces a schema-valid deterministic review with typed provenance", async () => {
    const request = await loadFixture();
    const first = await runFixture(request);
    const second = await runFixture(request);

    expect(first).toEqual(second);
    expect(first.ok).toBe(true);
    expect(first.requestId).toBe("fit5032-week4-library-review-001");
    expect(first.normalizedEvidence).toHaveLength(4);
    expect(new Set(first.normalizedEvidence.map((item) => item.role))).toEqual(
      new Set(["assignment_brief", "rubric", "teacher_instructions", "solution"])
    );

    const findingTypes = new Set(first.findings.map((finding) => finding.type));
    expect(findingTypes).toEqual(new Set(["contradiction", "omission", "requirement_conflict"]));

    const citations = first.findings.flatMap((finding) => finding.citations);
    expect(citations.some((citation) => citation.location.kind === "text")).toBe(true);
    expect(citations.some((citation) => citation.location.kind === "table" && citation.location.cell === "B4")).toBe(true);
  });
});
