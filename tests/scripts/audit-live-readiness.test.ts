import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import {
  auditPreparedBuildHandoff,
  assertAcyclicEvidence,
  canonicalJson,
  sha256Hex,
} from "../../scripts/audit-live-readiness.mjs";

const hex = (character: string) => character.repeat(64);
const commit = "1".repeat(40);

async function preparedFixture() {
  const root = await mkdtemp(join(tmpdir(), "evidencelens-prepared-"));
  await chmod(root, 0o700);
  const archiveLocator = join(root, "reviewed.tar");
  await writeFile(archiveLocator, "archive", { mode: 0o600 });
  const archiveSha256 = sha256Hex(Buffer.from("archive"));
  const descriptorLocator = join(root, "BUILD_GENERATION.json");
  const generation = hex("a");
  const descriptor = {
    archive: { locator: archiveLocator, sha256: archiveSha256 },
    build_argv: ["docker", "build", "--iidfile", join(root, "image.id"), "-f", "Dockerfile.proof", root],
    generation,
    non_planning_tree: hex("b"),
    result_locator: join(root, "BUILD_RESULT.json"),
    reviewed_commit: commit,
    schema: "evidencelens.build-generation.v1",
    status: "prepared",
  };
  const descriptorBytes = canonicalJson(descriptor);
  await writeFile(descriptorLocator, descriptorBytes, { mode: 0o600 });
  const handoff = {
    archive: descriptor.archive,
    descriptor_locator: descriptorLocator,
    descriptor_mode: "0600",
    descriptor_owner: process.getuid!(),
    descriptor_sha256: sha256Hex(Buffer.from(descriptorBytes)),
    generation,
    non_planning_tree: descriptor.non_planning_tree,
    reviewed_commit: commit,
    schema: "evidencelens.build-handoff.v1",
    status: "prepared",
  };
  const handoffPath = join(root, "10-22-BUILD.json");
  await writeFile(handoffPath, canonicalJson(handoff));
  return { descriptor, descriptorLocator, handoff, handoffPath };
}

describe("acyclic readiness evidence", () => {
  it("accepts independently recomputable reviewed facts", () => {
    expect(() => assertAcyclicEvidence({
      schema: "evidencelens.source-review.v1",
      reviewed_commit: commit,
      non_planning_tree: hex("a"),
      manifest_sha256: hex("b"),
      fixture_sha256: [hex("c"), hex("d"), hex("e"), hex("f")],
    })).not.toThrow();
  });

  it.each([
    ["evidence_commit", commit],
    ["self_sha256", hex("1")],
    ["cross_report_sha256", hex("2")],
    ["mutual_hash", hex("3")],
    ["envelope_sha256", hex("4")],
    ["handoff_hash", hex("5")],
    ["report_commit", commit],
  ])("rejects cyclic or report-commit-dependent field %s", (key, value) => {
    expect(() => assertAcyclicEvidence({ schema: "evidencelens.source-review.v1", [key]: value }))
      .toThrow("READINESS_CYCLIC_FIELD");
  });

  it("rejects cyclic fields at arbitrary depth", () => {
    expect(() => assertAcyclicEvidence({ schema: "evidencelens.image-bound.v1", nested: [{ self: hex("a") }] }))
      .toThrow("READINESS_CYCLIC_FIELD");
  });
});

describe("prepared-build-handoff audit", () => {
  it("authenticates canonical bounded owner-only prepared state without side effects", async () => {
    const fixture = await preparedFixture();
    const effects = { docker: vi.fn(), build: vi.fn(), network: vi.fn(), provider: vi.fn() };
    await expect(auditPreparedBuildHandoff(fixture.handoffPath, {
      expectedPath: fixture.handoffPath,
      effects,
    })).resolves.toMatchObject({ generation: fixture.handoff.generation, status: "prepared" });
    expect(effects.docker).not.toHaveBeenCalled();
    expect(effects.build).not.toHaveBeenCalled();
    expect(effects.network).not.toHaveBeenCalled();
    expect(effects.provider).not.toHaveBeenCalled();
  });

  it.each([
    ["descriptor digest", (value: any) => { value.descriptor_sha256 = hex("0"); }],
    ["reviewed commit", (value: any) => { value.reviewed_commit = "2".repeat(40); }],
    ["tree", (value: any) => { value.non_planning_tree = hex("0"); }],
    ["owner", (value: any) => { value.descriptor_owner += 1; }],
    ["mode", (value: any) => { value.descriptor_mode = "0644"; }],
    ["status", (value: any) => { value.status = "started"; }],
  ])("rejects mismatched %s", async (_name, mutate) => {
    const fixture = await preparedFixture();
    mutate(fixture.handoff);
    await writeFile(fixture.handoffPath, canonicalJson(fixture.handoff));
    await expect(auditPreparedBuildHandoff(fixture.handoffPath, { expectedPath: fixture.handoffPath }))
      .rejects.toThrow(/^READINESS_/u);
  });

  it("rejects noncanonical JSON and symlink descriptors", async () => {
    const fixture = await preparedFixture();
    await writeFile(fixture.handoffPath, JSON.stringify(fixture.handoff, null, 2));
    await expect(auditPreparedBuildHandoff(fixture.handoffPath, { expectedPath: fixture.handoffPath }))
      .rejects.toThrow("READINESS_NONCANONICAL");
  });
});
