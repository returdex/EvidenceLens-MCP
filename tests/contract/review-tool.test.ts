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
  it("returns schema-valid deterministic success from the handler", async () => {
    const first = await handleReviewRequest(validRequest);
    const second = await handleReviewRequest(validRequest);
    const firstPayload = parseToolPayload(first);

    expect(first).toEqual(second);
    expect(firstPayload.ok).toBe(true);
    expect(firstPayload.requestId).toBe(validRequest.reviewId);
    expect(firstPayload.metadata.generatedAt).toBe("1970-01-01T00:00:00.000Z");
    expect(reviewResponseSchema.parse(firstPayload)).toEqual(firstPayload);
  });

  it("returns machine-readable handler errors for malformed and limit-exceeded requests", async () => {
    const invalidPayload = parseToolPayload(await handleReviewRequest({ ...validRequest, objective: "" }));
    const limitPayload = parseToolPayload(
      await handleReviewRequest({
        ...validRequest,
        evidence: Array.from({ length: 2 }, (_, index) => ({
          id: `evidence-${index}`,
          role: "other",
          type: "text"
        })),
        limits: { maxEvidenceItems: 1 }
      })
    );

    expect(invalidPayload).toMatchObject({ ok: false, code: "INVALID_REQUEST" });
    expect(limitPayload).toMatchObject({ ok: false, code: "LIMIT_EXCEEDED" });
  });

  it("rejects empty content and preserves the bounded reference contract", async () => {
    const payload = parseToolPayload(await handleReviewRequest({
      ...validRequest,
      evidence: [{ id: "empty-table", role: "other", type: "table", content: "" }]
    }));
    expect(payload).toMatchObject({ ok: false, code: "INVALID_REQUEST" });

    const longReference = parseToolPayload(await handleReviewRequest({
      ...validRequest,
      evidence: [{ id: "long-reference", role: "other", type: "text", reference: "r".repeat(2049), content: "x" }]
    }));
    expect(longReference).toMatchObject({ ok: false, code: "INVALID_REQUEST" });
  });

  it("propagates the strict TSV format through the MCP handler", async () => {
    const payload = parseToolPayload(await handleReviewRequest({
      ...validRequest,
      evidence: [{ id: "tsv", role: "other", type: "table", format: "tsv", content: "a\tb\n1\t2" }]
    }));
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
        arguments: validRequest
      });
      const payload = parseToolPayload(toolResult);

      expect(payload.ok).toBe(true);
      expect(payload.requestId).toBe(validRequest.reviewId);
      expect(reviewResponseSchema.parse(payload)).toEqual(payload);
    });
  });
});
