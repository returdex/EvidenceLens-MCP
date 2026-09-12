import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { canonicalJson, sha256Hex } from "../../scripts/audit-live-readiness.mjs";
import { produceBuildGeneration } from "../../scripts/docker-proof-produce.mjs";
import { verifyExistingBuild } from "../../scripts/docker-proof-verify-existing.mjs";

const hash = (value: string) => value.repeat(64);

async function completedFixture() {
  const root = await mkdtemp(join(tmpdir(), "evidencelens-verifier-"));
  await chmod(root, 0o700);
  const archiveLocator = join(root, "source.tar");
  await writeFile(archiveLocator, "archive", { mode: 0o600 });
  const descriptorLocator = join(root, "BUILD_GENERATION.json");
  const resultLocator = join(root, "BUILD_RESULT.json");
  const generation = hash("a");
  const descriptor = { archive: { locator: archiveLocator, sha256: sha256Hex(Buffer.from("archive")) }, build_argv: ["docker", "build", "--iidfile", join(root, "image.id"), "-f", "Dockerfile.proof", root], generation, non_planning_tree: hash("b"), result_locator: resultLocator, reviewed_commit: "1".repeat(40), schema: "evidencelens.build-generation.v1", status: "prepared" };
  const bytes = canonicalJson(descriptor);
  await writeFile(descriptorLocator, bytes, { mode: 0o600 });
  const handoff = { archive: descriptor.archive, descriptor_locator: descriptorLocator, descriptor_mode: "0600", descriptor_owner: process.getuid!(), descriptor_sha256: sha256Hex(Buffer.from(bytes)), generation, non_planning_tree: descriptor.non_planning_tree, reviewed_commit: descriptor.reviewed_commit, schema: "evidencelens.build-handoff.v1", status: "prepared" };
  const handoffPath = join(root, "10-22-BUILD.json");
  await writeFile(handoffPath, canonicalJson(handoff));
  const evidence = { daemon_identity_sha256: hash("c"), fixture_sha256: [hash("1"), hash("2"), hash("3"), hash("4")], generation, image_config_sha256: hash("d"), image_content_sha256: hash("e"), image_id: `sha256:${hash("f")}`, runtime_sha256: hash("6"), schema: "evidencelens.build-result.v1", sentinels: { proof: "normalized", review: "normalized" } };
  await produceBuildGeneration(handoffPath, { expectedPath: handoffPath, authenticatePlanning: async () => undefined, buildOnce: async () => evidence });
  return { descriptorLocator, evidence, handoffPath, resultLocator };
}

describe("read-only existing proof verification", () => {
  it("authenticates completed evidence and only inspects the pinned image", async () => {
    const value = await completedFixture();
    const build = vi.fn();
    const inspectImage = vi.fn(async () => value.evidence);
    await expect(verifyExistingBuild(value.handoffPath, {
      expectedPath: value.handoffPath,
      authenticatePlanning: async () => undefined,
      inspectImage,
      build,
    })).resolves.toEqual(value.evidence);
    expect(inspectImage).toHaveBeenCalledOnce();
    expect(build).not.toHaveBeenCalled();
  });

  it("has build_count=0 across repeated verification", async () => {
    const value = await completedFixture();
    const build = vi.fn();
    const options = { expectedPath: value.handoffPath, authenticatePlanning: async () => undefined, inspectImage: async () => value.evidence, build };
    await verifyExistingBuild(value.handoffPath, options);
    await verifyExistingBuild(value.handoffPath, options);
    expect(build).not.toHaveBeenCalled();
  });

  it("fails closed for result tampering without build or inspect", async () => {
    const value = await completedFixture();
    const result = JSON.parse(await readFile(value.resultLocator, "utf8"));
    result.runtime_sha256 = hash("0");
    await writeFile(value.resultLocator, canonicalJson(result), { mode: 0o600 });
    const build = vi.fn();
    const inspectImage = vi.fn();
    await expect(verifyExistingBuild(value.handoffPath, { expectedPath: value.handoffPath, authenticatePlanning: async () => undefined, inspectImage, build }))
      .rejects.toThrow("VERIFIER_RESULT_DIGEST");
    expect(build).not.toHaveBeenCalled();
    expect(inspectImage).not.toHaveBeenCalled();
  });

  it.each(["", "/absolute/path", "./alternate", "x$(docker build .)"])
  ("rejects wrong argv %s before authentication and Docker", async (path) => {
    const value = await completedFixture();
    const authenticatePlanning = vi.fn();
    const inspectImage = vi.fn();
    await expect(verifyExistingBuild(path, { expectedPath: value.handoffPath, authenticatePlanning, inspectImage }))
      .rejects.toThrow("VERIFIER_ARGV");
    expect(authenticatePlanning).not.toHaveBeenCalled();
    expect(inspectImage).not.toHaveBeenCalled();
  });
});
