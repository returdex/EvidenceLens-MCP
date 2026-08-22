import { afterEach, describe, expect, it } from "vitest";
import { EvidenceLensError, toToolErrorResult } from "../../src/errors.js";
import { readFilesystemEvidence, type FilesystemDescriptor, type FilesystemReadAdapter, type FilesystemStat } from "../../src/filesystem/read.js";
import type { FilesystemPolicy } from "../../src/filesystem/policy.js";

const source = { kind: "filesystem" as const, rootId: "course", relativePath: "brief.txt" };

function stats(overrides: Partial<FilesystemStat> = {}): FilesystemStat {
  return { dev: 1, ino: 2, mode: 0o100644, size: 5, isFile: true, ...overrides };
}

function adapter(overrides: Partial<FilesystemReadAdapter> & { descriptorFstat?: () => Promise<FilesystemStat> } = {}): FilesystemReadAdapter & { calls: string[] } {
  const calls: string[] = [];
  const descriptor: FilesystemDescriptor = {
    fstat: overrides.descriptorFstat ?? (async () => stats()),
    read: async (buffer, offset, length) => {
      calls.push(`read:${length}`);
      Buffer.from("hello").copy(buffer, offset, 0, length);
      return { bytesRead: length };
    },
    close: async () => { calls.push("close"); }
  };
  return {
    stat: async () => { calls.push("stat"); return stats(); },
    open: async () => { calls.push("open"); return descriptor; },
    ...overrides,
    calls
  };
}

const policy: FilesystemPolicy = {
  authorize: () => ({ rootId: "course", relativePath: "brief.txt", resolvedPath: "/private/secret/brief.txt", reference: "filesystem://course/brief.txt" })
};

describe("filesystem byte reader", () => {
  afterEach(() => undefined);

  it("serializes new failure classes without paths, secrets, or stack details", () => {
    for (const code of ["ACCESS_DENIED", "UNSUPPORTED_FORMAT", "PROVIDER_FAILURE"] as const) {
      const result = toToolErrorResult(new EvidenceLensError(code, "/Users/yifeng/SECRET=value\n at read (/private/file)"));
      const text = result.content[0]?.text ?? "";
      expect(text).toContain(`"code":"${code}"`);
      expect(text).not.toContain("/Users");
      expect(text).not.toContain("SECRET=");
      expect(text).not.toContain(" at read");
    }
  });

  it("authorizes before any content primitive and returns bounded logical bytes", async () => {
    const calls: string[] = [];
    const orderedPolicy: FilesystemPolicy = { authorize: () => { calls.push("authorize"); return policy.authorize(source); } };
    const injected = adapter({ stat: async () => { calls.push("stat"); return stats(); }, open: async () => { calls.push("open"); return adapter().open("x", 0); } });
    const result = await readFilesystemEvidence(orderedPolicy, source, "text", injected);
    expect(result.bytes.toString()).toBe("hello");
    expect(result.rootId).toBe("course");
    expect(result.relativePath).toBe("brief.txt");
    expect(result.provenanceReference).toBe("filesystem://course/brief.txt");
    expect(calls[0]).toBe("authorize");
  });

  it("never opens when authorization denies traversal, absolute, or symlink-escape sources", async () => {
    const injected = adapter({ open: async () => { throw new Error("must not open"); } });
    for (const denied of ["../secret.txt", "/etc/passwd", "escape.txt"]) {
      const deniedPolicy: FilesystemPolicy = { authorize: () => { throw new EvidenceLensError("ACCESS_DENIED", denied); } };
      await expect(readFilesystemEvidence(deniedPolicy, { ...source, relativePath: denied }, "text", injected)).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    }
    expect(injected.calls).not.toContain("open");
    expect(injected.calls).not.toContain("read:5");
  });

  it("maps directories, unsupported formats, limits, read failures, and always closes", async () => {
    const directory = adapter({ stat: async () => stats({ isFile: false }) });
    await expect(readFilesystemEvidence(policy, source, "text", directory)).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    await expect(readFilesystemEvidence(policy, source, "archive" as never, adapter())).rejects.toMatchObject({ code: "UNSUPPORTED_FORMAT" });
    const oversized = adapter({ stat: async () => stats({ size: 1_000_001 }) });
    await expect(readFilesystemEvidence(policy, source, "text", oversized)).rejects.toMatchObject({ code: "LIMIT_EXCEEDED" });
    const failing = adapter({ open: async () => { throw new Error("/tmp/SECRET=oops"); } });
    await expect(readFilesystemEvidence(policy, source, "text", failing)).rejects.toMatchObject({ code: "PROVIDER_FAILURE" });
  });

  it("rejects target substitution before open and after the first bounded read", async () => {
    const before = adapter({ stat: async () => stats({ ino: 9 }) });
    await expect(readFilesystemEvidence(policy, source, "text", before)).rejects.toMatchObject({ code: "ACCESS_DENIED" });

    let statCount = 0;
    const after = adapter({
      stat: async () => stats(),
      descriptorFstat: async () => { statCount += 1; return statCount === 1 ? stats() : stats({ ino: 9 }); }
    });
    await expect(readFilesystemEvidence(policy, source, "text", after)).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
    expect(after.calls).toContain("close");
  });
});
