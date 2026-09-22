import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createFilesystemPolicy } from "/app/dist/filesystem/policy.js";
import { readFilesystemEvidence } from "/app/dist/filesystem/read.js";

assert.equal(process.platform, "linux");

const source = (relativePath) => ({ kind: "filesystem", rootId: "course", relativePath });

async function withFixture(run) {
  const parent = mkdtempSync(join(tmpdir(), "evidencelens-linux-anchored-"));
  const root = join(parent, "course");
  const nested = join(root, "nested");
  const outside = join(parent, "outside");
  mkdirSync(nested, { recursive: true });
  mkdirSync(outside);
  writeFileSync(join(nested, "brief.txt"), "inside bytes");
  writeFileSync(join(outside, "brief.txt"), "outside bytes");
  try {
    await run({ root, nested, outside, policy: createFilesystemPolicy([{ id: "course", path: root }]) });
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
}

test("production reader opens an authorized nested Linux file", async () => {
  await withFixture(async ({ policy }) => {
    const result = await readFilesystemEvidence(policy, source("nested/brief.txt"), "text");
    assert.equal(result.bytes.toString(), "inside bytes");
    assert.equal(result.provenanceReference, "filesystem://course/nested/brief.txt");
  });
});

test("in-root alias resolves to canonical target and provenance", async () => {
  await withFixture(async ({ root, policy }) => {
    symlinkSync("nested/brief.txt", join(root, "alias.txt"));
    const authorized = policy.authorize(source("alias.txt"));
    assert.equal(authorized.relativePath, "nested/brief.txt");
    const result = await readFilesystemEvidence(policy, source("alias.txt"), "text");
    assert.equal(result.bytes.toString(), "inside bytes");
    assert.equal(result.provenanceReference, "filesystem://course/nested/brief.txt");
  });
});

test("escaping alias is denied before any outside bytes are returned", async () => {
  await withFixture(async ({ root, outside, policy }) => {
    symlinkSync(join(outside, "brief.txt"), join(root, "escape.txt"));
    await assert.rejects(readFilesystemEvidence(policy, source("escape.txt"), "text"),
      (error) => error?.code === "ACCESS_DENIED" && !String(error.message).includes(outside));
  });
});

test("post-authorization intermediate symlink swap is denied", async () => {
  await withFixture(async ({ root, nested, outside, policy }) => {
    const swappingPolicy = {
      authorize(requested) {
        const authorized = policy.authorize(requested);
        renameSync(nested, join(root, "nested-original"));
        symlinkSync(outside, nested);
        return authorized;
      }
    };
    await assert.rejects(readFilesystemEvidence(swappingPolicy, source("nested/brief.txt"), "text"),
      (error) => error?.code === "ACCESS_DENIED" && !String(error.message).includes(outside));
  });
});
