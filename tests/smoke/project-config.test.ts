import { readFile } from "node:fs/promises";
import { InMemoryTransport, LATEST_PROTOCOL_VERSION, type JSONRPCMessage } from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";
import { reviewToolResultSchema } from "../../src/contracts/review.js";
import { createServer } from "../../src/server.js";

async function readJson(path: string): Promise<Record<string, any>> {
  const contents = await readFile(path, "utf8");
  return JSON.parse(contents);
}

describe("project configuration", () => {
  it("declares the expected package identity, scripts, and MCP dependency", async () => {
    const packageJson = await readJson("package.json");

    expect(packageJson.name).toBe("evidencelens-mcp");
    expect(packageJson.version).toBe("0.3.11");
    expect(packageJson.type).toBe("module");
    expect(packageJson.scripts).toMatchObject({
      dev: "tsx src/server.ts",
      build: "tsc -p tsconfig.json",
      start: "node dist/server.js",
      test: "EVIDENCELENS_DISABLE_PROVIDER=1 vitest run --exclude tests/providers/deepseek-live.test.ts",
      "test:deepseek-live": "vitest run tests/providers/deepseek-live.test.ts",
      "docker:smoke": "bash scripts/docker-smoke.sh",
      "docker:review:real": "node scripts/docker-review-real.mjs",
      "test:e2e": "EVIDENCELENS_DISABLE_PROVIDER=1 vitest run tests/e2e/docker-review.test.ts"
    });
    expect(packageJson.dependencies["@modelcontextprotocol/server"]).toBe("^2.0.0");
  });

  it("keeps ordinary test isolation no-network even when DeepSeek credentials are present", async () => {
    expect(process.env.EVIDENCELENS_DISABLE_PROVIDER).toBe("1");
    const previousKey = process.env.DEEPSEEK_API_KEY;
    const previousBaseUrl = process.env.DEEPSEEK_BASE_URL;
    const previousFetch = globalThis.fetch;
    process.env.DEEPSEEK_API_KEY = "dummy-test-key";
    process.env.DEEPSEEK_BASE_URL = "http://127.0.0.1:9";
    globalThis.fetch = (() => { throw new Error("network must remain disabled in ordinary tests"); }) as typeof fetch;

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

    try {
      await clientTransport.start();
      await server.connect(serverTransport);
      await new Promise<void>((resolve, reject) => {
        const id = requestId++;
        pending.set(id, (message) => {
          if ("error" in message) reject(new Error(JSON.stringify(message.error)));
          else resolve();
        });
        void clientTransport.send({ jsonrpc: "2.0", id, method: "initialize", params: {
          protocolVersion: LATEST_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: "isolation-test", version: "0.0.0" }
        } });
      });
      const result = await new Promise<unknown>((resolve, reject) => {
        const id = requestId++;
        pending.set(id, (message) => {
          if ("error" in message) reject(new Error(JSON.stringify(message.error)));
          else resolve("result" in message ? message.result : undefined);
        });
        void clientTransport.send({ jsonrpc: "2.0", id, method: "tools/call", params: {
          name: "review_evidence",
          arguments: {
            reviewId: "test-isolation-001",
            objective: "Check the submitted solution against the rubric.",
            evidence: [
              { id: "brief", role: "assignment_brief", type: "text", content: "The solution must include a conclusion." },
              { id: "rubric", role: "rubric", type: "text", content: "The solution must include a conclusion." },
              { id: "instructions", role: "teacher_instructions", type: "text", content: "Include a conclusion." },
              { id: "solution", role: "solution", type: "text", content: "The solution includes a conclusion." }
            ]
          }
        } });
      });
      const wrapped = reviewToolResultSchema.parse(result);
      const payload = JSON.parse(wrapped.content[0]!.text) as { ok: boolean; findings?: unknown[] };
      expect(payload).toMatchObject({ ok: true });
      expect(payload.findings).toEqual(expect.any(Array));
    } finally {
      await server.close();
      await clientTransport.close();
      globalThis.fetch = previousFetch;
      if (previousKey === undefined) delete process.env.DEEPSEEK_API_KEY;
      else process.env.DEEPSEEK_API_KEY = previousKey;
      if (previousBaseUrl === undefined) delete process.env.DEEPSEEK_BASE_URL;
      else process.env.DEEPSEEK_BASE_URL = previousBaseUrl;
    }
  });

  it("uses strict NodeNext TypeScript settings for source builds", async () => {
    const tsconfig = await readJson("tsconfig.json");

    expect(tsconfig.compilerOptions).toMatchObject({
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      rootDir: "src",
      outDir: "dist",
      strict: true,
      skipLibCheck: true
    });
    expect(tsconfig.include).toEqual(["src/**/*.ts"]);
  });
});
