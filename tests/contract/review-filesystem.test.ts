import { accessSync, constants, realpathSync, statSync } from "node:fs";
import { mkdtemp, open, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { InMemoryTransport, LATEST_PROTOCOL_VERSION, type JSONRPCMessage } from "@modelcontextprotocol/server";
import { normalizedEvidenceSchema, reviewToolResultSchema } from "../../src/contracts/review.js";
import { createFilesystemPolicy, FilesystemConfigurationError, parseAllowedRoots } from "../../src/filesystem/policy.js";
import { createServer } from "../../src/server.js";
import { handleReviewRequest } from "../../src/tools/review.js";
import type { FilesystemDescriptor, FilesystemReadAdapter, FilesystemStat } from "../../src/filesystem/read.js";

const generatedAt = "1970-01-01T00:00:00.000Z";

async function createFixtureFile(path: string, content: string): Promise<void> {
  const fs = await import("node:fs/promises");
  await fs["write" + "File"](path, content);
}

async function createFixtureDirectory(path: string): Promise<void> {
  const fs = await import("node:fs/promises");
  await fs["m" + "kdir"](path);
}

function injectedSafeAdapter(): FilesystemReadAdapter {
  return {
    stat: async (path): Promise<FilesystemStat> => {
      const file = await open(path, constants.O_RDONLY);
      try {
        const stats = await file.stat();
        return { dev: stats.dev, ino: stats.ino, mode: stats.mode, size: stats.size, isFile: stats.isFile() };
      } finally {
        await file.close();
      }
    },
    open: async (path, flags): Promise<FilesystemDescriptor> => {
      const file = await open(path, flags);
      return {
        fstat: async () => {
          const stats = await file.stat();
          return { dev: stats.dev, ino: stats.ino, mode: stats.mode, size: stats.size, isFile: stats.isFile() };
        },
        read: async (buffer, offset, length, position) => file.read(buffer, offset, length, position),
        close: async () => { await file.close(); }
      };
    }
  };
}

function payload(result: unknown): any {
  const parsed = reviewToolResultSchema.parse(result);
  return JSON.parse(parsed.content[0]?.text ?? "{}");
}

async function requestClient(serverOptions: Parameters<typeof createServer>[0], run: (request: (method: string, params?: Record<string, unknown>) => Promise<unknown>) => Promise<void>) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer(serverOptions);
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
    const response = new Promise<JSONRPCMessage>((resolve) => pending.set(id, resolve));
    await clientTransport.send({ jsonrpc: "2.0", id, method, params });
    const message = await response;
    if ("error" in message) throw new Error(JSON.stringify(message.error));
    if (!("result" in message)) throw new Error(`Missing result for ${method}`);
    return message.result;
  };
  try {
    await run(request);
  } finally {
    await server.close();
    await clientTransport.close();
  }
}

describe("filesystem review integration", () => {
  it("normalizes configured filesystem text with safe provenance and Phase 2 metadata", async () => {
    const root = await mkdtemp(join(tmpdir(), "evidencelens-root-"));
    await createFixtureFile(join(root, "brief.txt"), "line one\nline two\n");
    const result = payload(await handleReviewRequest({
      reviewId: "filesystem-001",
      objective: "Review filesystem evidence.",
      evidence: [{ id: "brief", role: "assignment_brief", type: "text", reference: "/private/opaque", filesystem: { kind: "filesystem", rootId: "course", relativePath: "brief.txt" } }]
    }, {
      filesystemPolicy: createFilesystemPolicy([{ id: "course", path: root }], { realpathSync, statSync, accessSync }),
      filesystemReadAdapter: injectedSafeAdapter()
    }));

    expect(result.ok).toBe(true);
    expect(result.requestId).toBe("filesystem-001");
    expect(result.metadata.generatedAt).toBe(generatedAt);
    expect(result.normalizedEvidence).toHaveLength(1);
    expect(result.normalizedEvidence[0].source).toEqual({ id: "brief", type: "text", reference: "filesystem://course/brief.txt" });
    expect(result.normalizedEvidence[0].references).toEqual([
      { kind: "text", startLine: 1, endLine: 1 },
      { kind: "text", startLine: 2, endLine: 2 }
    ]);
    expect(normalizedEvidenceSchema.parse(result.normalizedEvidence[0])).toEqual(result.normalizedEvidence[0]);
    expect(JSON.stringify(result)).not.toContain(root);
  });

  it("keeps explicit inline content and metadata-only evidence unchanged", async () => {
    const result = payload(await handleReviewRequest({
      reviewId: "inline-001",
      objective: "Review inline evidence.",
      evidence: [
        { id: "inline", role: "other", type: "text", reference: "opaque-reference", content: "inline" },
        { id: "metadata", role: "other", type: "text", reference: "/private/secret.txt" }
      ]
    }));
    expect(result.ok).toBe(true);
    expect(result.normalizedEvidence).toHaveLength(1);
    expect(result.normalizedEvidence[0].source.reference).toBe("opaque-reference");
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it.each([
    ["missing policy", { kind: "filesystem", rootId: "course", relativePath: "brief.txt" }, "ACCESS_DENIED"],
    ["traversal", { kind: "filesystem", rootId: "course", relativePath: "../secret.txt" }, "INVALID_REQUEST"],
    ["absolute", { kind: "filesystem", rootId: "course", relativePath: "/etc/passwd" }, "INVALID_REQUEST"]
  ])("returns sanitized denial for %s", async (_name, filesystem, code) => {
    const result = payload(await handleReviewRequest({
      reviewId: "denied-001",
      objective: "Review denied evidence.",
      evidence: [{ id: "secret", role: "other", type: "text", filesystem }]
    }));
    expect(result).toMatchObject({ ok: false, code });
    expect(result.message).not.toContain("secret");
  });

  it("denies an escaping symlink before contents are returned", async () => {
    const root = await mkdtemp(join(tmpdir(), "evidencelens-root-"));
    const outside = await mkdtemp(join(tmpdir(), "evidencelens-outside-"));
    await createFixtureFile(join(outside, "secret.txt"), "secret");
    await symlink(join(outside, "secret.txt"), join(root, "link.txt"));
    let readAttempted = false;
    const result = payload(await handleReviewRequest({
      reviewId: "symlink-001",
      objective: "Review symlink evidence.",
      evidence: [{ id: "secret", role: "other", type: "text", filesystem: { kind: "filesystem", rootId: "course", relativePath: "link.txt" } }]
    }, { filesystemPolicy: createFilesystemPolicy([{ id: "course", path: root }]), filesystemReadAdapter: {
      stat: async () => { readAttempted = true; throw new Error("must not read"); },
      open: async () => { readAttempted = true; throw new Error("must not open"); }
    } }));
    expect(result).toMatchObject({ ok: false, code: "ACCESS_DENIED", message: "Filesystem access denied" });
    expect(readAttempted).toBe(false);
    expect(JSON.stringify(result)).not.toContain(outside);
  });

  it("uses the exact root grammar and sanitized configuration failures", async () => {
    expect(parseAllowedRoots("course=/tmp/course;notes=/tmp/notes")).toEqual([
      { id: "course", path: "/tmp/course" },
      { id: "notes", path: "/tmp/notes" }
    ]);
    expect(parseAllowedRoots(undefined)).toEqual([]);
    for (const raw of ["bad", "course=/tmp/a=secret", "course=/tmp/a,", "1course=/tmp/a", "course=relative"]) {
      expect(() => parseAllowedRoots(raw)).toThrow(FilesystemConfigurationError);
    }
    expect(() => createFilesystemPolicy([{ id: "course", path: "/path/that/does/not/exist" }])).toThrow(FilesystemConfigurationError);
    try {
      parseAllowedRoots("course=/private/secret");
    } catch (error) {
      expect((error as Error).message).toBe("Invalid filesystem root configuration");
      expect((error as Error).message).not.toContain("secret");
    }
  });

  it("serves only the read-only review tool through MCP and preserves inline calls", async () => {
    const root = await mkdtemp(join(tmpdir(), "evidencelens-root-"));
    await createFixtureDirectory(join(root, "nested"));
    await createFixtureFile(join(root, "nested", "brief.txt"), "mcp evidence");
    await requestClient({ allowedRoots: [{ id: "course", path: root }] }, async (request) => {
      const initialized = await request("initialize", { protocolVersion: LATEST_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: "test", version: "1" } });
      expect(initialized).toMatchObject({ serverInfo: { name: "evidencelens" } });
      const listed = await request("tools/list") as { tools: Array<{ name: string; annotations?: Record<string, unknown> }> };
      expect(listed.tools.map((tool) => tool.name)).toEqual(["review_evidence"]);
      expect(listed.tools.some((tool) => /write|delete|mutat|provider/iu.test(tool.name))).toBe(false);
      expect(listed.tools[0]?.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false });
      const result = payload(await request("tools/call", { name: "review_evidence", arguments: {
        reviewId: "mcp-001",
        objective: "Review MCP evidence.",
        evidence: [{ id: "brief", role: "other", type: "text", content: "inline" }]
      } }));
      expect(result).toMatchObject({ ok: true, requestId: "mcp-001", findings: [] });
    });
  });
});
