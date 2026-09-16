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
      expect(initializeResult).toMatchObject({ serverInfo: { name: "evidencelens", version: "0.1.3" } });

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
