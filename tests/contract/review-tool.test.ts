import { describe, expect, it } from "vitest";
import { InMemoryTransport, LATEST_PROTOCOL_VERSION, type JSONRPCMessage } from "@modelcontextprotocol/server";
import {
  reviewResponseSchema,
  reviewRequestSchema,
  reviewToolResultSchema,
  type ReviewToolResult
} from "../../src/contracts/review.js";
import { EvidenceLensError, toToolErrorResult } from "../../src/errors.js";
import { createServer } from "../../src/server.js";
import { handleReviewRequest } from "../../src/tools/review.js";

const validRequest = {
  reviewId: "review-001",
  objective: "Check the submitted solution against the rubric.",
  evidence: [
    {
      id: "brief-1",
      role: "assignment_brief",
      type: "text",
      reference: "course/assignment-brief"
    }
  ],
  limits: {
    maxEvidenceItems: 20,
    maxObjectiveLength: 4000
  }
};

const completeFindingRequest = {
  reviewId: "review-findings-001",
  objective: "Check the submitted solution against the rubric.",
  evidence: [
    { id: "brief-1", role: "assignment_brief", type: "text", content: "The solution must include a conclusion." },
    { id: "rubric-1", role: "rubric", type: "text", content: "The solution must include a conclusion." },
    { id: "instructions-1", role: "teacher_instructions", type: "text", content: "The solution must include a conclusion." },
    { id: "solution-1", role: "solution", type: "text", content: "The solution cannot include a conclusion." }
  ]
};

const requiredMetadataEvidence = [
  { id: "brief-required", role: "assignment_brief", type: "text" },
  { id: "rubric-required", role: "rubric", type: "text" },
  { id: "instructions-required", role: "teacher_instructions", type: "text" },
  { id: "solution-required", role: "solution", type: "text" }
] as const;

function completeReview(evidence: readonly Record<string, unknown>[]) {
  const roles = new Set(evidence.map((item) => item.role));
  return {
    ...validRequest,
    evidence: [...evidence, ...requiredMetadataEvidence.filter((item) => !roles.has(item.role))]
  };
}

describe("review_evidence schema and error contract", () => {
  it("accepts a valid metadata-only review request schema", () => {
    const parsed = reviewRequestSchema.safeParse(validRequest);

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid schema inputs before handler wiring", () => {
    expect(
      reviewRequestSchema.safeParse({
        ...validRequest,
        evidence: Array.from({ length: 21 }, (_, index) => ({
          id: `evidence-${index}`,
          role: "other",
          type: "text"
        }))
      }).success
    ).toBe(false);

    expect(reviewRequestSchema.safeParse({ ...validRequest, objective: "a".repeat(4001) }).success).toBe(false);
    expect(
      reviewRequestSchema.safeParse({
        ...validRequest,
        evidence: [{ id: "bad-type", role: "other", type: "audio" }]
      }).success
    ).toBe(false);
    expect(
      reviewRequestSchema.safeParse({
        ...validRequest,
        evidence: [{ id: "", role: "other", type: "text" }]
      }).success
    ).toBe(false);
    expect(
      reviewRequestSchema.safeParse({
        ...validRequest,
        evidence: [{ id: "bad-reference", role: "other", type: "text", reference: "safe\u0000unsafe" }]
      }).success
    ).toBe(false);
    expect(
      reviewRequestSchema.safeParse({
        ...validRequest,
        evidence: [{ id: "bad-reference", role: "other", type: "text", reference: "safe\nunsafe" }]
      }).success
    ).toBe(false);
    expect(reviewRequestSchema.safeParse({
      ...validRequest,
      evidence: [{ id: "empty-reference", role: "other", type: "text", reference: "" }]
    }).success).toBe(false);
    expect(reviewRequestSchema.safeParse({
      ...validRequest,
      evidence: [{ id: "long-reference", role: "other", type: "text", reference: "r".repeat(2049) }]
    }).success).toBe(false);
  });

  it("parses MCP text-content wrappers returned by success and error helpers", () => {
    const toolResult: ReviewToolResult = {
      content: [
        {
          type: "text",
          text: JSON.stringify({ ok: true })
        }
      ]
    };

    expect(reviewToolResultSchema.parse(toolResult)).toEqual(toolResult);
    expect(reviewToolResultSchema.parse(toToolErrorResult(new EvidenceLensError("INVALID_REQUEST", "Bad input")))).toEqual(
      toToolErrorResult(new EvidenceLensError("INVALID_REQUEST", "Bad input"))
    );
  });

  it("serializes sanitized stable machine-readable error JSON", () => {
    const result = toToolErrorResult(
      new EvidenceLensError("INVALID_REQUEST", "Bad input\nwith /Users/example/secret.txt details")
    );
    const payload = JSON.parse(result.content[0]?.text ?? "{}");

    expect(payload).toEqual({
      ok: false,
      code: "INVALID_REQUEST",
      message: expect.any(String)
    });
    expect(payload.message).not.toContain("\n");
    expect(payload.message).not.toContain("/Users/example/secret.txt");
  });
});

async function withProtocolClient<T>(run: (request: (method: string, params?: Record<string, unknown>) => Promise<unknown>) => Promise<T>) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer();
  const pending = new Map<string | number, (message: JSONRPCMessage) => void>();
  let requestId = 1;

  clientTransport.onmessage = (message) => {
    if ("id" in message && message.id !== undefined) {
      pending.get(message.id)?.(message);
      pending.delete(message.id);
    }
  };

  await clientTransport.start();
  await server.connect(serverTransport);

  const request = async (method: string, params: Record<string, unknown> = {}) => {
    const id = requestId++;
    const responsePromise = new Promise<JSONRPCMessage>((resolve) => pending.set(id, resolve));

    await clientTransport.send({ jsonrpc: "2.0", id, method, params });
    const response = await responsePromise;

    if ("error" in response) {
      throw new Error(JSON.stringify(response.error));
    }

    if (!("result" in response)) {
      throw new Error(`Missing JSON-RPC result for ${method}`);
    }

    return response.result;
  };

  try {
    return await run(request);
  } finally {
    await server.close();
    await clientTransport.close();
  }
}

function parseToolPayload(toolResult: unknown) {
  const parsedToolResult = reviewToolResultSchema.parse(toolResult);
  return JSON.parse(parsedToolResult.content[0]?.text ?? "{}");
}

describe("review_evidence handler and MCP protocol contract", () => {
  it("requires one distinct complete role set before normalization", async () => {
    const rolePayload = parseToolPayload(await handleReviewRequest({
      ...completeFindingRequest,
      evidence: completeFindingRequest.evidence.filter((item) => item.role !== "rubric")
    }));
    expect(rolePayload).toEqual({ ok: false, code: "INVALID_REVIEW_ROLES", message: "Review evidence roles are invalid" });

    const duplicatePayload = parseToolPayload(await handleReviewRequest({
      ...completeFindingRequest,
      evidence: [...completeFindingRequest.evidence, { id: "brief-1", role: "other", type: "text", content: "duplicate" }]
    }));
    expect(duplicatePayload).toEqual({ ok: false, code: "INVALID_REQUEST", message: "Invalid request" });
  });

  it("returns deterministic actionable findings with unique provenance ids", async () => {
    const first = parseToolPayload(await handleReviewRequest(completeFindingRequest));
    const second = parseToolPayload(await handleReviewRequest(completeFindingRequest));

    expect(first).toEqual(second);
    expect(first.metadata).toMatchObject({ analyzerName: "deterministic-rules", analyzerVersion: "1.0.0" });
    expect(first.findings.length).toBeGreaterThan(0);
    expect(first.findings.some((finding: { type: string }) => finding.type === "contradiction")).toBe(true);
    expect(new Set(first.normalizedEvidence.map((evidence: { source: { id: string } }) => evidence.source.id)).size).toBe(first.normalizedEvidence.length);
    expect(new Set(first.findings.map((finding: { id: string }) => finding.id)).size).toBe(first.findings.length);
    for (const finding of first.findings) {
      expect(finding.evidenceIds).toEqual([...new Set(finding.evidenceIds)].sort());
      expect(finding.citations.map((citation: { evidenceId: string }) => citation.evidenceId)).toEqual([...new Set(finding.citations.map((citation: { evidenceId: string }) => citation.evidenceId))]);
    }
    expect(JSON.stringify(first)).not.toContain("The solution cannot include a conclusion");
    expect(reviewResponseSchema.parse(first)).toEqual(first);
  });

  it("exposes the deterministic findings through the MCP tools/call protocol", async () => {
    await withProtocolClient(async (request) => {
      const listed = await request("tools/list") as { tools: Array<{ name: string; annotations?: Record<string, unknown> }> };
      expect(listed.tools.map((tool) => tool.name)).toEqual(["review_evidence"]);
      expect(listed.tools[0]?.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false, idempotentHint: true });
      const first = parseToolPayload(await request("tools/call", { name: "review_evidence", arguments: completeFindingRequest }));
      const second = parseToolPayload(await request("tools/call", { name: "review_evidence", arguments: completeFindingRequest }));
      expect(first).toEqual(second);
      expect(first.findings.length).toBeGreaterThan(0);
      expect(first.metadata).not.toHaveProperty("provider");
      expect(first.metadata).not.toHaveProperty("model");
    });
  });

  it("returns schema-valid deterministic success from the handler", async () => {
    const request = completeReview(validRequest.evidence);
    const first = await handleReviewRequest(request);
    const second = await handleReviewRequest(request);
    const firstPayload = parseToolPayload(first);

    expect(first).toEqual(second);
    expect(firstPayload.ok).toBe(true);
    expect(firstPayload.requestId).toBe(request.reviewId);
    expect(firstPayload.metadata.generatedAt).toBe("1970-01-01T00:00:00.000Z");
    expect(reviewResponseSchema.parse(firstPayload)).toEqual(firstPayload);
  });

  it("returns machine-readable handler errors for malformed and limit-exceeded requests", async () => {
    const invalidPayload = parseToolPayload(await handleReviewRequest({ ...completeReview(validRequest.evidence), objective: "" }));
    const limitPayload = parseToolPayload(
      await handleReviewRequest({ ...completeReview(Array.from({ length: 2 }, (_, index) => ({
          id: `evidence-${index}`,
          role: "other",
          type: "text"
        }))),
        limits: { maxEvidenceItems: 1 }
      })
    );

    expect(invalidPayload).toMatchObject({ ok: false, code: "INVALID_REQUEST" });
    expect(limitPayload).toMatchObject({ ok: false, code: "LIMIT_EXCEEDED" });
  });

  it("rejects empty content and preserves the bounded reference contract", async () => {
    const payload = parseToolPayload(await handleReviewRequest(completeReview([{ id: "empty-table", role: "other", type: "table", content: "" }])));
    expect(payload).toMatchObject({ ok: false, code: "INVALID_REQUEST" });

    const longReference = parseToolPayload(await handleReviewRequest(completeReview([{ id: "long-reference", role: "other", type: "text", reference: "r".repeat(2049), content: "x" }])));
    expect(longReference).toMatchObject({ ok: false, code: "INVALID_REQUEST" });
  });

  it("propagates the strict TSV format through the MCP handler", async () => {
    const payload = parseToolPayload(await handleReviewRequest(completeReview([{ id: "tsv", role: "other", type: "table", format: "tsv", content: "a\tb\n1\t2" }])));
    expect(payload).toMatchObject({ ok: true });
    expect(payload.normalizedEvidence[0].references).toEqual([
      { kind: "table", sheetName: "Sheet1", row: 1, column: 1, cell: "A1" },
      { kind: "table", sheetName: "Sheet1", row: 1, column: 2, cell: "B1" },
      { kind: "table", sheetName: "Sheet1", row: 2, column: 1, cell: "A2" },
      { kind: "table", sheetName: "Sheet1", row: 2, column: 2, cell: "B2" }
    ]);
  });

  it("returns a stable unsupported-evidence-type error code", async () => {
    const payload = parseToolPayload(
      await handleReviewRequest({
        ...validRequest,
        evidence: [{ id: "audio-1", role: "other", type: "audio" }]
      })
    );

    expect(payload).toMatchObject({ ok: false, code: "UNSUPPORTED_EVIDENCE_TYPE" });
  });

  it("keeps malformed evidence type values as invalid requests", async () => {
    const missingType = parseToolPayload(
      await handleReviewRequest({
        ...validRequest,
        evidence: [{ id: "missing-type", role: "other" }]
      })
    );
    const nonStringType = parseToolPayload(
      await handleReviewRequest({
        ...validRequest,
        evidence: [{ id: "numeric-type", role: "other", type: 42 }]
      })
    );

    expect(missingType).toMatchObject({ ok: false, code: "INVALID_REQUEST" });
    expect(nonStringType).toMatchObject({ ok: false, code: "INVALID_REQUEST" });
  });

  it("initializes, discovers review_evidence through tools/list, and invokes it with tools/call", async () => {
    await withProtocolClient(async (request) => {
      const initializeResult = await request("initialize", {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "contract-test", version: "0.0.0" }
      });
      expect(initializeResult).toMatchObject({ serverInfo: { name: "evidencelens", version: "0.1.2" } });

      const toolsListResult = (await request("tools/list")) as {
        tools: Array<{ name: string; annotations?: Record<string, unknown> }>;
      };
      const toolNames = toolsListResult.tools.map((tool) => tool.name);
      expect(toolNames).toEqual(["review_evidence"]);
      expect(toolNames.some((name) => /write|delete|mutat/i.test(name))).toBe(false);
      expect(toolsListResult.tools[0]?.annotations).toMatchObject({
        readOnlyHint: true,
        destructiveHint: false
      });

      const toolResult = await request("tools/call", {
        name: "review_evidence",
        arguments: completeReview(validRequest.evidence)
      });
      const payload = parseToolPayload(toolResult);

      expect(payload.ok).toBe(true);
      expect(payload.requestId).toBe(validRequest.reviewId);
      expect(reviewResponseSchema.parse(payload)).toEqual(payload);
    });
  });
});
