import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { InMemoryTransport, LATEST_PROTOCOL_VERSION, type JSONRPCMessage } from "@modelcontextprotocol/server";
import { normalizedEvidenceSchema, reviewToolResultSchema, type ReviewToolResult } from "../../src/contracts/review.js";
import { EVIDENCE_LIMITS } from "../../src/evidence/limits.js";
import { createServer } from "../../src/server.js";
import { handleReviewRequest } from "../../src/tools/review.js";

const generatedAt = "1970-01-01T00:00:00.000Z";
const textContent = "Assignment brief\n\nUse the rubric.";
const tableContent = "criterion,score,notes\nclarity,4,=literal";
const requiredMetadataEvidence = [
  { id: "brief-required", role: "assignment_brief", type: "text" },
  { id: "rubric-required", role: "rubric", type: "text" },
  { id: "instructions-required", role: "teacher_instructions", type: "text" },
  { id: "solution-required", role: "solution", type: "text" }
] as const;

function parseToolPayload(toolResult: unknown): Record<string, any> {
  const parsed = reviewToolResultSchema.parse({
    content: (toolResult as { content: unknown[] }).content
  });
  return JSON.parse(parsed.content[0]?.text ?? "{}");
}

function requestWithEvidence(evidence: unknown[]) {
  const roles = new Set(evidence.map((item) => (item as { role?: unknown }).role));
  return {
    reviewId: "review-content-001",
    objective: "Normalize explicit evidence content.",
    evidence: [...evidence, ...requiredMetadataEvidence.filter((item) => !roles.has(item.role))]
  };
}

describe("review_evidence normalized evidence contract", () => {
  it("normalizes text, table, PDF, image, and screenshot content with provenance", async () => {
    const [pdfBytes, imageBytes] = await Promise.all([
      readFile("tests/fixtures/evidence/pdfs/text-page.pdf"),
      readFile("tests/fixtures/evidence/images/rubric-screenshot.png")
    ]);
    const payload = parseToolPayload(await handleReviewRequest(requestWithEvidence([
      { id: "text-1", role: "assignment_brief", type: "text", reference: "fixture://brief", content: textContent },
      { id: "table-1", role: "rubric", type: "table", reference: "fixture://rubric", content: tableContent },
      { id: "pdf-1", role: "solution", type: "pdf", reference: "fixture://text-page.pdf", contentBase64: pdfBytes.toString("base64") },
      { id: "image-1", role: "other", type: "image", reference: "fixture://rubric-screenshot.png", mimeType: "image/png", contentBase64: imageBytes.toString("base64") },
      { id: "screenshot-1", role: "other", type: "screenshot", reference: "fixture://rubric-screenshot.png", mimeType: "image/png", contentBase64: imageBytes.toString("base64") }
    ])));

    expect(payload).toMatchObject({ ok: true, requestId: "review-content-001", findings: [] });
    expect(payload.normalizedEvidence).toHaveLength(5);
    for (const artifact of payload.normalizedEvidence) {
      expect(normalizedEvidenceSchema.parse(artifact)).toEqual(artifact);
      expect(artifact.contentHash).toMatch(/^[a-f0-9]{64}$/u);
      expect(artifact.source.reference).toMatch(/^fixture:\/\//u);
      expect(artifact.extraction.extractor).toBeTruthy();
    }
    expect(payload.normalizedEvidence.find((artifact: any) => artifact.source.type === "table").warnings).toContainEqual(
      expect.objectContaining({ code: "CELL_FORMULA_LITERAL" })
    );
    expect(payload.normalizedEvidence.find((artifact: any) => artifact.source.type === "image").visualPayload.base64).toBeTruthy();
  });

  it("accepts only the exact type-specific content-bearing request fields", async () => {
    const base64 = Buffer.from("payload").toString("base64");
    const valid = (item: Record<string, unknown>) => handleReviewRequest(requestWithEvidence([item]));

    await expect(valid({ id: "text", role: "other", type: "text", content: textContent })).resolves.toBeDefined();
    await expect(valid({ id: "table", role: "other", type: "table", content: tableContent })).resolves.toBeDefined();
    await expect(valid({ id: "pdf", role: "other", type: "pdf", contentBase64: base64 })).resolves.toBeDefined();
    await expect(valid({ id: "image", role: "other", type: "image", mimeType: "image/png", contentBase64: base64 })).resolves.toBeDefined();

    for (const item of [
      { id: "text", role: "other", type: "text", contentBase64: base64 },
      { id: "table", role: "other", type: "table", mimeType: "text/csv", content: tableContent },
      { id: "pdf", role: "other", type: "pdf", content: "not bytes" },
      { id: "image", role: "other", type: "image", content: "not bytes" },
      { id: "image", role: "other", type: "image", contentBase64: base64 },
      { id: "image", role: "other", type: "image", mimeType: "image/gif", contentBase64: base64 },
      { id: "pdf", role: "other", type: "pdf", contentBase64: "YWJj=" },
      { id: "text", role: "other", type: "text", content: "x".repeat(EVIDENCE_LIMITS.maxTextBytes + 1) }
    ]) {
      const payloadPromise = valid(item).then(parseToolPayload);
      await expect(payloadPromise).resolves.toMatchObject({ ok: false, code: expect.stringMatching(/INVALID_REQUEST|LIMIT_EXCEEDED/u) });
    }
  });

  it("keeps metadata-only evidence normalizedEvidence empty and reference opaque", async () => {
    const payload = parseToolPayload(await handleReviewRequest(requestWithEvidence([
      { id: "metadata", role: "other", type: "text", reference: "/private/secret.txt" }
    ])));

    expect(payload).toMatchObject({ ok: true, findings: [], normalizedEvidence: [] });
    expect(JSON.stringify(payload)).not.toContain("secret");
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
    if ("error" in response) throw new Error(JSON.stringify(response.error));
    if (!("result" in response)) throw new Error(`Missing JSON-RPC result for ${method}`);
    return response.result;
  };
  try { return await run(request); } finally { await server.close(); await clientTransport.close(); }
}

describe("review_evidence normalized evidence MCP protocol", () => {
  it("calls the sole read-only tool without findings or provider metadata", async () => {
    await withProtocolClient(async (request) => {
      await request("initialize", { protocolVersion: LATEST_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: "contract-test", version: "0.0.0" } });
      const listed = await request("tools/list") as { tools: Array<{ name: string }> };
      expect(listed.tools.map((tool) => tool.name)).toEqual(["review_evidence"]);
      expect(listed.tools.some((tool) => /write|delete|mutat|provider/iu.test(tool.name))).toBe(false);
      const result = parseToolPayload(await request("tools/call", { name: "review_evidence", arguments: requestWithEvidence([{ id: "text", role: "other", type: "text", content: "hello" }]) }));
      expect(result).toMatchObject({ ok: true, findings: [], normalizedEvidence: [expect.any(Object)] });
      expect(result.metadata).not.toHaveProperty("provider");
    });
  });
});
