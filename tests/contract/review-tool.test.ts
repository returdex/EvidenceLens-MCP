import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
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
import { ProviderError, serializeProviderError } from "../../src/providers/errors.js";
import type { ReviewProvider } from "../../src/providers/types.js";
import { createProviderRequestBudget, verifyProviderRequestReceipt } from "../../src/providers/request-budget.js";
import type { ProviderRequestReceipt } from "../../src/providers/types.js";
import {
  CHILD_DIAGNOSTIC_GENERATION_ENV,
  CHILD_DIAGNOSTIC_KEY_ENV,
  createChildDiagnosticSinkFromEnvironment,
  type DiagnosticFeature
} from "../../src/providers/diagnostics.js";
import { ChildDiagnosticCollector, classifyDiagnostic } from "../../scripts/docker-review-real.mjs";

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

async function withProtocolClient<T>(run: (request: (method: string, params?: Record<string, unknown>) => Promise<unknown>) => Promise<T>, server = createServer()) {
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

describe("provider request receipt ownership", () => {
  it("settles an authenticated receipt at the protocol boundary when tool input validation fails", async () => {
    const generation = "f".repeat(64);
    const key = Buffer.alloc(32, 0x61);
    const requestBudget = createProviderRequestBudget({ generation, key });
    const receipts: ProviderRequestReceipt[] = [];
    const server = createServer({
      providerRequestProof: { requestBudget, receiptSink: (receipt) => { receipts.push(receipt); } }
    });

    await withProtocolClient(async (request) => {
      await request("initialize", {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "pre-handler-receipt-regression", version: "1" }
      });
      const result = await request("tools/call", {
        name: "review_evidence",
        arguments: { ...validRequest, unexpected: true }
      });
      expect(parseToolPayload(result)).toMatchObject({ ok: false, code: "INVALID_REQUEST" });
    }, server);

    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({ reservation_count: 1, observed_provider_requests: 0 });
    expect(verifyProviderRequestReceipt(receipts[0], { generation, key })).toBe(true);
  });

  it("emits one authenticated zero-send receipt when tools/call settles before provider invocation", async () => {
    const generation = "a".repeat(64);
    const key = Buffer.alloc(32, 0x62);
    const requestBudget = createProviderRequestBudget({ generation, key });
    const receipts: ProviderRequestReceipt[] = [];
    let providerCalls = 0;
    const provider: ReviewProvider = {
      name: "deepseek",
      async review() {
        providerCalls += 1;
        throw new Error("provider must not be reached");
      }
    };
    const server = createServer({
      provider,
      providerRequestProof: { requestBudget, receiptSink: (receipt) => { receipts.push(receipt); } }
    });

    await withProtocolClient(async (request) => {
      await request("initialize", {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "receipt-regression", version: "1" }
      });
      const result = await request("tools/call", { name: "review_evidence", arguments: validRequest });
      expect(parseToolPayload(result)).toMatchObject({ ok: false, code: "INVALID_REVIEW_ROLES" });
    }, server);

    expect(providerCalls).toBe(0);
    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({ reservation_count: 1, observed_provider_requests: 0 });
    expect(verifyProviderRequestReceipt(receipts[0], { generation, key })).toBe(true);
  });

  it("does not duplicate the adapter receipt at tool settlement or on a second one-shot call", async () => {
    const generation = "b".repeat(64);
    const key = Buffer.alloc(32, 0x63);
    const requestBudget = createProviderRequestBudget({ generation, key });
    const receipts: ProviderRequestReceipt[] = [];
    let transportCalls = 0;
    const server = createServer({
      providerConfig: {
        apiKey: "synthetic-never-sent",
        baseUrl: "https://example.invalid",
        model: "deepseek-v4-pro",
        timeoutMs: 1_000,
        maxRetries: 0,
        maxTotalWaitMs: 1_000,
        temperature: 0.2,
        maxTokens: 400
      },
      providerTransport: {
        async fetch() {
          transportCalls += 1;
          return new Response("not-json", { status: 200, headers: { "content-type": "application/json" } });
        }
      },
      providerRequestProof: {
        requestBudget,
        receiptSink: (receipt) => {
          if (receipts.length !== 0) throw new Error("duplicate receipt");
          receipts.push(receipt);
        }
      }
    });

    await withProtocolClient(async (request) => {
      await request("initialize", {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "adapter-receipt-regression", version: "1" }
      });
      const first = await request("tools/call", { name: "review_evidence", arguments: completeFindingRequest });
      expect(parseToolPayload(first)).toMatchObject({ ok: false, code: "PROVIDER_FAILURE" });
      expect(receipts).toHaveLength(1);

      const second = await request("tools/call", { name: "review_evidence", arguments: completeFindingRequest });
      expect(parseToolPayload(second)).toMatchObject({ ok: false });
      expect(receipts).toHaveLength(1);
    }, server);

    expect(transportCalls).toBe(1);
    expect(receipts[0]).toMatchObject({ reservation_count: 1, observed_provider_requests: 1 });
    expect(verifyProviderRequestReceipt(receipts[0], { generation, key })).toBe(true);
  });
});

function injectedFetchFailure(code: string, details: Record<string, unknown> = {}): TypeError {
  return new TypeError("fetch failed", { cause: Object.assign(new Error("private cause"), { code, ...details }) });
}

describe("production server transport diagnostics", () => {
  it.each(["stop", "length"] as const)("routes a complete-valid %s response through the production review_evidence tool path", async (finishReason) => {
    const generation = finishReason === "stop" ? "8".repeat(64) : "9".repeat(64);
    const key = Buffer.alloc(32, finishReason === "stop" ? 0x68 : 0x69);
    const requestBudget = createProviderRequestBudget({ generation, key });
    const receipts: ProviderRequestReceipt[] = [];
    let transportCalls = 0;
    const server = createServer({
      providerConfig: {
        apiKey: "synthetic-never-sent", baseUrl: "https://example.invalid", model: "deepseek-v4-pro",
        timeoutMs: 1_000, maxRetries: 0, maxTotalWaitMs: 1_000, temperature: 0.2, maxTokens: 400
      },
      providerTransport: {
        fetch: async () => {
          transportCalls += 1;
          return new Response(JSON.stringify({ choices: [{ finish_reason: finishReason, message: { content: '{"findings":[]}' } }] }), {
            status: 200, headers: { "content-type": "application/json" }
          });
        }
      },
      providerRequestProof: { requestBudget, receiptSink: (receipt) => { receipts.push(receipt); } }
    });

    await withProtocolClient(async (request) => {
      await request("initialize", { protocolVersion: LATEST_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: `complete-${finishReason}-regression`, version: "1" } });
      const first = parseToolPayload(await request("tools/call", { name: "review_evidence", arguments: completeFindingRequest }));
      expect(first).toMatchObject({ ok: true, metadata: { analyzerName: "deterministic-rules" } });
      const second = parseToolPayload(await request("tools/call", { name: "review_evidence", arguments: completeFindingRequest }));
      expect(second).toMatchObject({ ok: false });
    }, server);

    expect(transportCalls).toBe(1);
    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({ reservation_count: 1, observed_provider_requests: 1, max_retries: 0, fallback: false, diagnostic_second_call: false });
    expect(verifyProviderRequestReceipt(receipts[0]!, { generation, key })).toBe(true);
  });

  it.each([
    ["truncated", '{"findings":[', ["provider", "content", "object"], "unbalanced", "provider-json-object-unbalanced"],
    ["multiple", '{"findings":[]}\n{"findings":[]}', ["provider", "content", "object"], "multiple_candidates", "provider-json-object-multiple-candidates"],
    ["schema-invalid", '{"findings":[{"severity":"critical"}]}', ["findings", "id"], "invalid_type", "finding-draft-id"],
    ["citation-invalid", JSON.stringify({ findings: [{ id: "provider-1", type: "omission", severity: "medium", confidence: "high", title: "Missing conclusion", summary: "Missing.", observation: "Missing.", interpretation: "Risk.", followUpChecks: ["Check."], evidenceIds: ["forged"], citations: [{ evidenceId: "forged", location: { kind: "text", startLine: 1, endLine: 1 }, visual: false }] }] }), ["citations", "evidenceId"], "invalid_value", "citation-provenance-evidence-id"]
  ] as const)("authenticates a content-free %s length failure through the production tool and host classifier", async (_name, content, path, code, invariantId) => {
    const generation = "7".repeat(64);
    const key = Buffer.alloc(32, 0x67);
    const environment: Record<string, string | undefined> = {
      [CHILD_DIAGNOSTIC_GENERATION_ENV]: generation,
      [CHILD_DIAGNOSTIC_KEY_ENV]: key.toString("hex")
    };
    let stderr = "";
    const diagnosticSink = createChildDiagnosticSinkFromEnvironment(environment, (value) => { stderr += value; });
    const server = createServer({
      providerConfig: {
        apiKey: "synthetic-never-sent", baseUrl: "https://example.invalid", model: "deepseek-v4-pro",
        timeoutMs: 1_000, maxRetries: 0, maxTotalWaitMs: 1_000, temperature: 0.2, maxTokens: 400
      },
      providerTransport: {
        fetch: async () => new Response(JSON.stringify({ choices: [{ finish_reason: "length", message: { content } }] }), {
          status: 200, headers: { "content-type": "application/json" }
        })
      },
      diagnosticSink
    });
    await withProtocolClient(async (request) => {
      await request("initialize", { protocolVersion: LATEST_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: "length-diagnostic-regression", version: "1" } });
      const result = await request("tools/call", { name: "review_evidence", arguments: completeFindingRequest });
      expect(parseToolPayload(result)).toMatchObject({ ok: false, code: "PROVIDER_FAILURE" });
    }, server);

    const collector = new ChildDiagnosticCollector();
    collector.consume(stderr);
    collector.markTerminal();
    const feature = collector.feature({ generation, key });
    expect(feature).toEqual({ path: [...path], code });
    expect(classifyDiagnostic([feature])).toMatchObject({ invariant_id: invariantId, repair: "allowlisted" });
    expect(JSON.stringify({ feature, classified: classifyDiagnostic([feature]) })).not.toContain(content);
  });

  it.each([
    ["no_candidate", "private prose with no JSON object", "provider-json-object-no-candidate"],
    ["multiple_candidates", '{"findings":[]}\n{"findings":[]}', "provider-json-object-multiple-candidates"],
    ["unbalanced", '{"findings":[]', "provider-json-object-unbalanced"],
    ["wrong_root", '{"findings":[],"extra":true}', "provider-json-object-wrong-root"],
    ["structural_context", '{"findings":[]}\n[]', "provider-json-object-structural-context"],
    ["malformed_json", 'prefix {"findings":[} suffix', "provider-json-object-malformed"]
  ] as const)("carries one authenticated %s frame through server -> tool -> provider -> stderr -> host collector", async (_code, content, invariantId) => {
    const generation = "d".repeat(64);
    const key = Buffer.alloc(32, 0x64);
    const environment: Record<string, string | undefined> = {
      [CHILD_DIAGNOSTIC_GENERATION_ENV]: generation,
      [CHILD_DIAGNOSTIC_KEY_ENV]: key.toString("hex")
    };
    let stderr = "";
    const diagnosticSink = createChildDiagnosticSinkFromEnvironment(environment, (value) => { stderr += value; });
    const server = createServer({
      providerConfig: {
        apiKey: "synthetic-never-sent", baseUrl: "https://example.invalid", model: "deepseek-v4-pro",
        timeoutMs: 1_000, maxRetries: 0, maxTotalWaitMs: 1_000, temperature: 0.2, maxTokens: 400
      },
      providerTransport: {
        fetch: async () => new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content } }] }), {
          status: 200, headers: { "content-type": "application/json" }
        })
      },
      diagnosticSink
    });
    await withProtocolClient(async (request) => {
      await request("initialize", { protocolVersion: LATEST_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: "shape-diagnostic-regression", version: "1" } });
      const result = await request("tools/call", { name: "review_evidence", arguments: completeFindingRequest });
      expect(parseToolPayload(result)).toMatchObject({ ok: false, code: "PROVIDER_FAILURE" });
    }, server);

    const collector = new ChildDiagnosticCollector();
    collector.consume(stderr);
    collector.markTerminal();
    const feature = collector.feature({ generation, key });
    expect(feature).toEqual({ path: ["provider", "content", "object"], code: _code });
    expect(classifyDiagnostic([feature])).toMatchObject({ invariant_id: invariantId, repair: "allowlisted" });
  });

  it.each([
    [undefined, "invalid_type", "provider-finish-reason-type"],
    [42, "invalid_type", "provider-finish-reason-type"],
    ["private_unknown_reason", "invalid_value", "provider-finish-reason-unknown"],
    ["content_filter", "content_filter", "provider-finish-reason-content-filter"],
    ["tool_calls", "tool_calls", "provider-finish-reason-tool-calls"],
    ["insufficient_system_resource", "insufficient_system_resource", "provider-finish-reason-resource"]
  ] as const)("authenticates the bounded finish_reason diagnostic %s through the full production path", async (finishReason, code, invariantId) => {
    const generation = "e".repeat(64);
    const key = Buffer.alloc(32, 0x65);
    const environment: Record<string, string | undefined> = {
      [CHILD_DIAGNOSTIC_GENERATION_ENV]: generation,
      [CHILD_DIAGNOSTIC_KEY_ENV]: key.toString("hex")
    };
    let stderr = "";
    const diagnosticSink = createChildDiagnosticSinkFromEnvironment(environment, (value) => { stderr += value; });
    const choice = {
      ...(finishReason !== undefined ? { finish_reason: finishReason } : {}),
      message: { content: "private body that must not be parsed" }
    };
    const server = createServer({
      providerConfig: {
        apiKey: "synthetic-never-sent", baseUrl: "https://example.invalid", model: "deepseek-v4-pro",
        timeoutMs: 1_000, maxRetries: 0, maxTotalWaitMs: 1_000, temperature: 0.2, maxTokens: 400
      },
      providerTransport: {
        fetch: async () => new Response(JSON.stringify({ choices: [choice] }), {
          status: 200, headers: { "content-type": "application/json" }
        })
      },
      diagnosticSink
    });
    await withProtocolClient(async (protocolRequest) => {
      await protocolRequest("initialize", { protocolVersion: LATEST_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: "finish-reason-regression", version: "1" } });
      const result = await protocolRequest("tools/call", { name: "review_evidence", arguments: completeFindingRequest });
      expect(parseToolPayload(result)).toMatchObject({ ok: false, code: "PROVIDER_FAILURE" });
    }, server);

    const collector = new ChildDiagnosticCollector();
    collector.consume(stderr);
    collector.markTerminal();
    const feature = collector.feature({ generation, key });
    expect(feature).toEqual({ path: ["provider", "finish_reason"], code });
    expect(classifyDiagnostic([feature])).toMatchObject({ invariant_id: invariantId, repair: "allowlisted" });
    expect(JSON.stringify({ feature, classified: classifyDiagnostic([feature]) })).not.toMatch(/private body|private_unknown_reason/iu);
  });

  it.each([
    ["dns", () => { throw injectedFetchFailure("ENOTFOUND", { errno: -3008, syscall: "getaddrinfo", hostname: "private.example" }); }, 0, 1_000],
    ["tls", () => { throw injectedFetchFailure("CERT_HAS_EXPIRED"); }, 0, 1_000],
    ["connection", () => { throw injectedFetchFailure("ECONNREFUSED", { errno: -61, syscall: "connect", address: "127.0.0.1", port: 443 }); }, 0, 1_000],
    ["network_timeout", () => { throw injectedFetchFailure("UND_ERR_CONNECT_TIMEOUT"); }, 0, 1_000],
    ["http_error", () => new Response("private", { status: 401 }), 0, 1_000],
    ["rate_limited", () => new Response("private", { status: 429 }), 0, 1_000],
    ["server_error", () => new Response("private", { status: 503 }), 0, 1_000],
    ["retry_budget", () => { throw injectedFetchFailure("ENOTFOUND", { errno: -3008, syscall: "getaddrinfo", hostname: "private.example" }); }, 2, 1]
  ] as const)("emits exactly one %s frame through server -> tool -> provider -> retry", async (code, outcome, maxRetries, maxTotalWaitMs) => {
    const features: DiagnosticFeature[] = [];
    const server = createServer({
      providerConfig: {
        apiKey: "synthetic-never-sent", baseUrl: "https://example.invalid", model: "deepseek-v4-pro",
        timeoutMs: 1_000, maxRetries, maxTotalWaitMs, temperature: 0.2, maxTokens: 400
      },
      providerTransport: { fetch: async () => outcome() },
      diagnosticSink: { emit(feature) { features.push(feature); return true; } }
    });
    await withProtocolClient(async (request) => {
      await request("initialize", { protocolVersion: LATEST_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: "transport-diagnostic-regression", version: "1" } });
      const result = await request("tools/call", { name: "review_evidence", arguments: completeFindingRequest });
      expect(parseToolPayload(result)).toMatchObject({ ok: false, code: "PROVIDER_FAILURE" });
    }, server);
    expect(features).toEqual([{ path: ["provider", "transport", "fetch"], code }]);
  });

  it("emits exactly one timeout frame through server -> tool -> provider -> retry", async () => {
    const features: DiagnosticFeature[] = [];
    const server = createServer({
      providerConfig: {
        apiKey: "synthetic-never-sent", baseUrl: "https://example.invalid", model: "deepseek-v4-pro",
        timeoutMs: 5, maxRetries: 0, maxTotalWaitMs: 1_000, temperature: 0.2, maxTokens: 400
      },
      providerTransport: { fetch: async (_input, init) => new Promise<Response>((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(new DOMException("private abort", "AbortError")), { once: true })) },
      diagnosticSink: { emit(feature) { features.push(feature); return true; } }
    });
    await withProtocolClient(async (request) => {
      await request("initialize", { protocolVersion: LATEST_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: "timeout-diagnostic-regression", version: "1" } });
      const result = await request("tools/call", { name: "review_evidence", arguments: completeFindingRequest });
      expect(parseToolPayload(result)).toMatchObject({ ok: false, code: "PROVIDER_FAILURE" });
    }, server);
    expect(features).toEqual([{ path: ["provider", "transport", "fetch"], code: "timeout" }]);
  });
});

function parseToolPayload(toolResult: unknown) {
  const parsedToolResult = reviewToolResultSchema.parse(toolResult);
  return JSON.parse(parsedToolResult.content[0]?.text ?? "{}");
}

function withoutLocalProviderConfig<T>(run: () => T): T {
  const previousDirectory = process.cwd();
  const directory = mkdtempSync(join(tmpdir(), "evidencelens-server-"));
  process.chdir(directory);
  try { return run(); } finally {
    process.chdir(previousDirectory);
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("production executable provider startup contract", () => {
  it("emits one authenticated zero-send receipt when a real stdio tools/call fails before tool execution", () => {
    const generation = "e".repeat(64);
    const key = Buffer.alloc(32, 0x65);
    const messages = [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "receipt-process-regression", version: "1" } } },
      { jsonrpc: "2.0", method: "notifications/initialized", params: {} },
      { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "review_evidence", arguments: { ...validRequest, unexpected: true } } }
    ];
    const result = spawnSync(process.execPath, [resolve(process.cwd(), "dist/server.js")], {
      env: {
        ...process.env,
        EVIDENCELENS_DISABLE_PROVIDER: "1",
        EVIDENCELENS_DIAGNOSTIC_GENERATION: generation,
        EVIDENCELENS_DIAGNOSTIC_KEY: key.toString("hex")
      },
      input: `${messages.map((message) => JSON.stringify(message)).join("\n")}\n`,
      encoding: "utf8",
      timeout: 5_000
    });

    expect(result.status).toBe(0);
    const responses = result.stdout.trim().split("\n").map((line) => JSON.parse(line));
    expect(responses.map((response) => response.id)).toEqual([1, 2]);
    expect(parseToolPayload(responses[1].result)).toMatchObject({ ok: false, code: "INVALID_REQUEST" });
    const receiptPrefix = "[evidencelens-provider-request] ";
    const receiptLines = result.stderr.split("\n").filter((line) => line.startsWith(receiptPrefix));
    expect(receiptLines).toHaveLength(1);
    const receipt = JSON.parse(receiptLines[0].slice(receiptPrefix.length));
    expect(receipt).toMatchObject({ reservation_count: 1, observed_provider_requests: 0 });
    expect(verifyProviderRequestReceipt(receipt, { generation, key })).toBe(true);
  });

  it("fails closed before MCP traffic for missing, invalid, and conflicting configuration", () => {
    const projectDirectory = process.cwd();
    const executable = resolve(projectDirectory, "dist/server.js");
    const privateValue = "private-api-key-sentinel";
    const providerVariables = [
      "DEEPSEEK_API_KEY",
      "DEEPSEEK_BASE_URL",
      "DEEPSEEK_MODEL",
      "DEEPSEEK_TIMEOUT_MS",
      "DEEPSEEK_MAX_RETRIES",
      "DEEPSEEK_MAX_TOTAL_WAIT_MS",
      "DEEPSEEK_TEMPERATURE",
      "DEEPSEEK_MAX_TOKENS",
      "EVIDENCELENS_DISABLE_PROVIDER"
    ] as const;
    const baseEnvironment = { ...process.env };
    for (const name of providerVariables) delete baseEnvironment[name];

    const cases = [
      { name: "missing", env: {} },
      { name: "invalid", env: { DEEPSEEK_API_KEY: privateValue, DEEPSEEK_MODEL: "disallowed-model" } },
      {
        name: "conflicting",
        env: { DEEPSEEK_API_KEY: privateValue, DEEPSEEK_MODEL: "deepseek-v4-pro" },
        config: { model: "deepseek-v4-flash" }
      }
    ];

    for (const testCase of cases) {
      const directory = mkdtempSync(join(tmpdir(), `evidencelens-executable-${testCase.name}-`));
      const configPath = join(directory, ".evidencelens.local.json");
      try {
        if (testCase.config) writeFileSync(configPath, JSON.stringify(testCase.config), "utf8");
        const result = spawnSync(process.execPath, [executable], {
          cwd: directory,
          env: { ...baseEnvironment, ...testCase.env },
          input: "",
          encoding: "utf8",
          timeout: 5_000
        });

        expect(result.status, testCase.name).not.toBe(0);
        expect(result.stdout, testCase.name).toBe("");
        expect(result.stderr, testCase.name).toBe("PROVIDER_CONFIGURATION: Provider configuration is invalid\n");
        expect(result.stderr, testCase.name).not.toMatch(
          new RegExp([
            "DEEPSEEK_API_KEY",
            privateValue,
            directory.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"),
            "api\\.deepseek\\.com",
            "https?://",
            "apiKey",
            "baseUrl",
            "deepseek-v4",
            "cause",
            "stack",
            "(?:^|\\n)\\s+at\\s"
          ].join("|"), "iu")
        );
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    }
  });
});

describe("review_evidence handler and MCP protocol contract", () => {
  it("fails closed with a sanitized classification when automatic provider configuration is missing", () => {
    const previousDisable = process.env.EVIDENCELENS_DISABLE_PROVIDER;
    const previousKey = process.env.DEEPSEEK_API_KEY;
    delete process.env.EVIDENCELENS_DISABLE_PROVIDER;
    delete process.env.DEEPSEEK_API_KEY;
    try {
      expect(() => withoutLocalProviderConfig(() => createServer())).toThrowError(ProviderError);
      try { withoutLocalProviderConfig(() => createServer()); } catch (error) {
        expect(serializeProviderError(error)).toEqual({
          code: "PROVIDER_CONFIGURATION",
          message: "Provider configuration is invalid",
          retryable: false,
          retryCount: 0
        });
        const publicError = JSON.stringify(serializeProviderError(error));
        expect(publicError).not.toMatch(/DEEPSEEK_API_KEY|api\.deepseek\.com|\.evidencelens|cause|stack|\/Users\//iu);
      }
    } finally {
      if (previousDisable === undefined) delete process.env.EVIDENCELENS_DISABLE_PROVIDER;
      else process.env.EVIDENCELENS_DISABLE_PROVIDER = previousDisable;
      if (previousKey === undefined) delete process.env.DEEPSEEK_API_KEY;
      else process.env.DEEPSEEK_API_KEY = previousKey;
    }
  });

  it("uses only literal disable mode and preserves explicit provider seams", () => {
    const previousDisable = process.env.EVIDENCELENS_DISABLE_PROVIDER;
    const previousKey = process.env.DEEPSEEK_API_KEY;
    const fakeProvider: ReviewProvider = { name: "fake", review: async () => { throw new Error("unused"); } };
    delete process.env.DEEPSEEK_API_KEY;
    try {
      process.env.EVIDENCELENS_DISABLE_PROVIDER = "1";
      expect(createServer()).toBeDefined();
      process.env.EVIDENCELENS_DISABLE_PROVIDER = "true";
      expect(() => withoutLocalProviderConfig(() => createServer())).toThrowError(ProviderError);
      expect(createServer({ provider: fakeProvider })).toBeDefined();
      expect(createServer({ providerConfig: {
        apiKey: "synthetic",
        baseUrl: "https://example.invalid",
        model: "deepseek-v4-pro",
        timeoutMs: 30000,
        maxRetries: 0,
        maxTotalWaitMs: 1000,
        temperature: 0.2,
        maxTokens: 100
      } })).toBeDefined();
    } finally {
      if (previousDisable === undefined) delete process.env.EVIDENCELENS_DISABLE_PROVIDER;
      else process.env.EVIDENCELENS_DISABLE_PROVIDER = previousDisable;
      if (previousKey === undefined) delete process.env.DEEPSEEK_API_KEY;
      else process.env.DEEPSEEK_API_KEY = previousKey;
    }
  });
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
      expect(initializeResult).toMatchObject({ serverInfo: { name: "evidencelens", version: "0.2.4" } });

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
