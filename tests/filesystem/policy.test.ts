import { mkdtempSync, mkdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createFilesystemPolicy, parseAllowedRoots, type FilesystemPrimitives } from "../../src/filesystem/policy.js";

const temporaryDirectories: string[] = [];

function temporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "evidencelens-policy-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("EVIDENCELENS_ALLOWED_ROOTS", () => {
  it("parses comma and semicolon entries with stable ids", () => {
    expect(parseAllowedRoots("course=/tmp/course, solution=/tmp/solution")).toEqual([
      { id: "course", path: "/tmp/course" },
      { id: "solution", path: "/tmp/solution" }
    ]);
    expect(parseAllowedRoots("course=/tmp/course;solution=/tmp/solution")).toEqual([
      { id: "course", path: "/tmp/course" },
      { id: "solution", path: "/tmp/solution" }
    ]);
    expect(parseAllowedRoots(undefined)).toEqual([]);
    expect(parseAllowedRoots("   ")).toEqual([]);
  });

  it("rejects malformed grammar without exposing the raw configuration", () => {
    for (const raw of [",", "course=/tmp/course,", "course", "1course=/tmp", "course=/tmp,other", "course=relative", "course=/tmp;other=/tmp/x"]) {
      expect(() => parseAllowedRoots(raw)).toThrow("Invalid filesystem root configuration");
      try { parseAllowedRoots(raw); } catch (error) {
        expect(String(error)).not.toContain(raw);
        expect(String(error)).not.toContain("/tmp");
      }
    }
  });
});

describe("configured filesystem policy", () => {
  it("canonicalizes roots, preserves ids, and returns safe logical provenance", () => {
    const parent = temporaryDirectory();
    const root = join(parent, "course");
    mkdirSync(root);
    writeFileSync(join(root, "brief.txt"), "brief");

    const policy = createFilesystemPolicy([{ id: "course", path: root }]);
    const authorized = policy.authorize({ kind: "filesystem", rootId: "course", relativePath: "brief.txt" });

    expect(authorized.rootId).toBe("course");
    expect(authorized.relativePath).toBe("brief.txt");
    expect(authorized.reference).toBe("filesystem://course/brief.txt");
    expect(authorized.resolvedPath).toBe(join(realpathSync(root), "brief.txt"));
    expect(authorized.reference).not.toContain(root);
  });

  it("rejects duplicate ids, canonical collisions, invalid roots, and unreadable roots", () => {
    const parent = temporaryDirectory();
    const root = join(parent, "course");
    mkdirSync(root);
    const primitives: FilesystemPrimitives = {
      realpathSync: (value) => value,
      statSync: () => ({ isDirectory: () => true }),
      accessSync: () => undefined
    };

    expect(() => createFilesystemPolicy([{ id: "course", path: root }, { id: "course", path: root }], primitives)).toThrow("Invalid filesystem root configuration");
    expect(() => createFilesystemPolicy([{ id: "course", path: root }, { id: "other", path: join(root, ".") }], {
      ...primitives,
      realpathSync: () => "/canonical/course"
    })).toThrow("Invalid filesystem root configuration");
    expect(() => createFilesystemPolicy([{ id: "course", path: "relative" }], primitives)).toThrow("Invalid filesystem root configuration");
    expect(() => createFilesystemPolicy([{ id: "course", path: root }], {
      ...primitives,
      accessSync: () => { throw new Error("secret /private/root"); }
    })).toThrow("Invalid filesystem root configuration");
    expect(() => createFilesystemPolicy([{ id: "course", path: root }], {
      ...primitives,
      statSync: () => ({ isDirectory: () => false })
    })).toThrow("Invalid filesystem root configuration");
  });

  it("denies unknown, traversal, absolute, missing, directory, and escaping symlink targets", () => {
    const parent = temporaryDirectory();
    const root = join(parent, "course");
    const outside = join(parent, "outside");
    mkdirSync(root);
    mkdirSync(outside);
    writeFileSync(join(root, "brief.txt"), "brief");
    writeFileSync(join(outside, "secret.txt"), "secret");
    mkdirSync(join(root, "folder"));
    symlinkSync(join(outside, "secret.txt"), join(root, "escape.txt"));

    const policy = createFilesystemPolicy([{ id: "course", path: root }]);
    for (const source of [
      { kind: "filesystem" as const, rootId: "unknown", relativePath: "brief.txt" },
      { kind: "filesystem" as const, rootId: "course", relativePath: "../outside/secret.txt" },
      { kind: "filesystem" as const, rootId: "course", relativePath: "/etc/passwd" },
      { kind: "filesystem" as const, rootId: "course", relativePath: "missing.txt" },
      { kind: "filesystem" as const, rootId: "course", relativePath: "folder" },
      { kind: "filesystem" as const, rootId: "course", relativePath: "escape.txt" }
    ]) {
      expect(() => policy.authorize(source)).toThrow("Filesystem source is not authorized");
    }
  });

  it("allows an in-root symlink while exposing no mutation API", () => {
    const parent = temporaryDirectory();
    const root = join(parent, "course");
    mkdirSync(root);
    writeFileSync(join(root, "brief.txt"), "brief");
    symlinkSync(join(root, "brief.txt"), join(root, "alias.txt"));

    const policy = createFilesystemPolicy([{ id: "course", path: root }]);
    const authorized = policy.authorize({ kind: "filesystem", rootId: "course", relativePath: "alias.txt" });
    expect(authorized.reference).toBe("filesystem://course/alias.txt");
    expect(Object.keys(policy)).not.toEqual(expect.arrayContaining(["write", "delete", "rename", "mkdir", "chmod"]));
  });
});
