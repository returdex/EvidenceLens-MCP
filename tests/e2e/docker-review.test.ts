import { constants, accessSync, realpathSync, statSync } from "node:fs";
import { open } from "node:fs/promises";
import { relative } from "node:path";
import { InMemoryTransport, LATEST_PROTOCOL_VERSION, McpServer, type JSONRPCMessage } from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";
import { reviewResponseSchema, reviewToolResultSchema, type ReviewFinding } from "../../src/contracts/review.js";
import { createFilesystemPolicy } from "../../src/filesystem/policy.js";
import type { FilesystemDescriptor, FilesystemReadAdapter, FilesystemStat } from "../../src/filesystem/read.js";
import { PROVIDER_PROMPT_VERSION, type ProviderReviewResult, type ReviewProvider } from "../../src/providers/types.js";
import { registerReviewTool } from "../../src/tools/review.js";

const fixturePaths = {
  brief: "tests/fixtures/evidence/text/assignment.txt",
  rubric: "tests/fixtures/evidence/tables/rubric.csv",
  instructions: "tests/fixtures/evidence/images/rubric-screenshot.png",
  solution: "tests/fixtures/evidence/pdfs/text-page.pdf"
} as const;

const expectedReferences = Object.values(fixturePaths).map((path) => `filesystem://course/${path}`);

function fixtureReadAdapter(root: string): FilesystemReadAdapter {
  const canonicalRoot = realpathSync(root);
  const allowedPaths = new Set(Object.values(fixturePaths));

  function safePath(path: string): string {
    const safeRelative = relative(canonicalRoot, path).split("\\").join("/");
    if (safeRelative.startsWith("../") || safeRelative === ".." || safeRelative.startsWith("/") || !allowedPaths.has(safeRelative)) {
      throw new Error("fixture path is outside the bounded E2E set");
    }
    return path;
  }

  function toStat(value: { dev: number; ino: number; mode: number; size: number; isFile(): boolean }): FilesystemStat {
    return { dev: value.dev, ino: value.ino, mode: value.mode, size: value.size, isFile: value.isFile() };
  }

  return {
    stat: async (path) => {
      const file = await open(safePath(path), constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
      try {
        return toStat(await file.stat());
      } finally {
        await file.close();
      }
    },
    open: async (path, flags): Promise<FilesystemDescriptor> => {
      const file = await open(safePath(path), flags | (constants.O_NOFOLLOW ?? 0));
      return {
        fstat: async () => toStat(await file.stat()),
        read: async (buffer, offset, length, position) => file.read(buffer, offset, length, position),
        close: async () => { await file.close(); }
      };
    }
  };
}

function mockProvider(): ReviewProvider {
  return {
    name: "offline-mock",
    async review(request): Promise<ProviderReviewResult> {
      const modelFindings: ReviewFinding[] = request.evidence.map((evidence, index) => {
        const visualPayload = evidence.visualPayloads?.[0];
        const location = visualPayload?.location ?? evidence.references[0]!;
        const visual = location.kind === "image" || (location.kind === "pdf" && visualPayload !== undefined);
        return {
          id: `mock-${index + 1}`,
          type: "evidence_quality",
          severity: "low",
          confidence: "medium",
          title: "Offline structural review",
          summary: "The injected provider returned a structurally valid observation.",
          observation: "The fixed fixture was accepted by the offline provider.",
          interpretation: "The cited normalized evidence remains available for inspection.",
          uncertainty: "The offline provider does not make a semantic claim beyond schema validation.",
          followUpChecks: ["Inspect the cited evidence location."],
          evidenceIds: [evidence.evidenceId],
          citations: [{
            evidenceId: evidence.evidenceId,
            role: evidence.role,
            contentHash: evidence.contentHash,
            sourceReference: evidence.sourceReference,
            location,
            visual,
            ...(visualPayload === undefined ? {} : { visualPayloadSha256: visualPayload.sha256 })
          }]
        };
      });
      return {
        provider: "offline-mock",
        model: request.inference.model,
        promptVersion: PROVIDER_PROMPT_VERSION,
        inputFingerprint: request.inputFingerprint,
        modelFindings,
        deterministicFindings: []
      };
    }
  };
}

function toolPayload(result: unknown): unknown {
  const wrapped = reviewToolResultSchema.parse(result);
  return JSON.parse(wrapped.content[0]!.text) as unknown;
}

async function runProtocol(server: McpServer, run: (request: (method: string, params?: Record<string, unknown>) => Promise<unknown>) => Promise<void>): Promise<void> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
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
  const request = async (method: string, params: Record<string, unknown> = {}): Promise<unknown> => {
    const id = requestId++;
    const response = new Promise<JSONRPCMessage>((resolve) => pending.set(id, resolve));
    await clientTransport.send({ jsonrpc: "2.0", id, method, params });
    const message = await response;
    if ("error" in message) throw new Error(JSON.stringify(message.error));
    if (!("result" in message)) throw new Error(`missing result for ${method}`);
    return message.result;
  };
  try {
    await run(request);
  } finally {
    await server.close();
    await clientTransport.close();
  }
}

describe("Docker fixture review E2E contract", () => {
  it("reviews four real fixtures through an injected provider without network or absolute-path leakage", async () => {
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (() => { throw new Error("offline E2E must not access the network"); }) as typeof fetch;
    const root = realpathSync(".");
    const filesystemPolicy = createFilesystemPolicy([{ id: "course", path: root }], { realpathSync, statSync, accessSync });
    const server = new McpServer({ name: "evidencelens", version: "0.3.5" });
    registerReviewTool(server, {
      filesystemPolicy,
      filesystemReadAdapter: fixtureReadAdapter(root),
      provider: mockProvider()
    });

    try {
      await runProtocol(server, async (request) => {
        const initialized = await request("initialize", {
          protocolVersion: LATEST_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: "docker-review-e2e", version: "0.1.0" }
        });
        expect(initialized).toMatchObject({ serverInfo: { name: "evidencelens", version: "0.3.5" } });

        const listed = await request("tools/list") as { tools: Array<{ name: string; annotations?: Record<string, unknown> }> };
        expect(listed.tools.map((tool) => tool.name)).toEqual(["review_evidence"]);
        expect(listed.tools[0]?.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false, idempotentHint: true });

        const result = toolPayload(await request("tools/call", {
          name: "review_evidence",
          arguments: {
            reviewId: "docker-review-e2e-001",
            objective: "Review the fixed assignment evidence against its rubric.",
            evidence: [
              { id: "brief", role: "assignment_brief", type: "text", filesystem: { kind: "filesystem", rootId: "course", relativePath: fixturePaths.brief } },
              { id: "rubric", role: "rubric", type: "table", filesystem: { kind: "filesystem", rootId: "course", relativePath: fixturePaths.rubric } },
              { id: "instructions", role: "teacher_instructions", type: "image", filesystem: { kind: "filesystem", rootId: "course", relativePath: fixturePaths.instructions } },
              { id: "solution", role: "solution", type: "pdf", filesystem: { kind: "filesystem", rootId: "course", relativePath: fixturePaths.solution } }
            ]
          }
        }));
        if (typeof result === "object" && result !== null && "ok" in result && result.ok !== true) {
          throw new Error(`E2E review failed: ${JSON.stringify(result)}`);
        }
        const parsed = reviewResponseSchema.parse(result);
        expect(parsed.ok).toBe(true);
        expect(parsed.requestId).toBe("docker-review-e2e-001");
        expect(parsed.normalizedEvidence.map((evidence) => evidence.source.reference)).toEqual(expectedReferences);
        expect(new Set(parsed.normalizedEvidence.map((evidence) => evidence.role))).toEqual(new Set(["assignment_brief", "rubric", "teacher_instructions", "solution"]));
        for (const evidence of parsed.normalizedEvidence) expect(evidence.contentHash).toMatch(/^[a-f0-9]{64}$/u);

        const citations = parsed.findings.flatMap((finding) => finding.citations);
        expect(citations.some((citation) => citation.location.kind === "image" && citation.visual)).toBe(true);
        const pdfCitation = citations.find((citation) => citation.location.kind === "pdf");
        expect(pdfCitation).toBeDefined();
        expect(pdfCitation?.visual).toBe(false);
        const pdfEvidence = parsed.normalizedEvidence.find((evidence) => evidence.source.type === "pdf");
        if (pdfEvidence?.visualPayloads !== undefined) {
          expect(citations.some((citation) => citation.location.kind === "pdf" && citation.visual && citation.visualPayloadSha256 !== undefined)).toBe(true);
        }
        expect(parsed.findings.some((finding) => finding.id.startsWith("provider:offline-mock:"))).toBe(true);
        const serialized = JSON.stringify(parsed);
        expect(serialized).not.toContain(root);
        expect(serialized).not.toContain("Read the assignment brief.");
        expect(serialized).not.toContain("Criterion,Excellent");
        expect(serialized).not.toContain("inputFingerprint");
        expect(serialized).not.toContain("promptVersion");
        expect(parsed.metadata.provider).toEqual({ name: "offline-mock", model: "deepseek-v4-pro" });
        expect(parsed.metadata).not.toHaveProperty("model");
      });
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});
