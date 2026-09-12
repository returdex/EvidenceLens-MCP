import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { canonicalJson, sha256Hex } from "../../scripts/audit-live-readiness.mjs";
import { produceBuildGeneration } from "../../scripts/docker-proof-produce.mjs";

const hash = (value: string) => value.repeat(64);

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "evidencelens-producer-"));
  await chmod(root, 0o700);
  const archiveLocator = join(root, "source.tar");
  await writeFile(archiveLocator, "archive", { mode: 0o600 });
  const descriptorLocator = join(root, "BUILD_GENERATION.json");
  const resultLocator = join(root, "BUILD_RESULT.json");
  const generation = hash("a");
  const descriptor = {
    archive: { locator: archiveLocator, sha256: sha256Hex(Buffer.from("archive")) },
    build_argv: ["docker", "build", "--iidfile", join(root, "image.id"), "-f", "Dockerfile.proof", root],
    generation,
    non_planning_tree: hash("b"),
    result_locator: resultLocator,
    reviewed_commit: "1".repeat(40),
    schema: "evidencelens.build-generation.v1",
    status: "prepared",
  };
  const bytes = canonicalJson(descriptor);
  await writeFile(descriptorLocator, bytes, { mode: 0o600 });
  const handoff = {
    archive: descriptor.archive,
    descriptor_locator: descriptorLocator,
    descriptor_mode: "0600",
    descriptor_owner: process.getuid!(),
    descriptor_sha256: sha256Hex(Buffer.from(bytes)),
    generation,
    non_planning_tree: descriptor.non_planning_tree,
    reviewed_commit: descriptor.reviewed_commit,
    schema: "evidencelens.build-handoff.v1",
    status: "prepared",
  };
  const handoffPath = join(root, "10-22-BUILD.json");
  await writeFile(handoffPath, canonicalJson(handoff));
  return { descriptorLocator, generation, handoffPath, resultLocator };
}

function buildEvidence(generation: string) {
  return {
    daemon_identity_sha256: hash("c"),
    fixture_sha256: [hash("1"), hash("2"), hash("3"), hash("4")],
    generation,
    image_config_sha256: hash("d"),
    image_content_sha256: hash("e"),
    image_id: `sha256:${hash("f")}`,
    runtime_sha256: hash("6"),
    schema: "evidencelens.build-result.v1",
    sentinels: { proof: "normalized", review: "normalized" },
  };
}

describe("irreversible proof build generation", () => {
  it("claims prepared durably before exactly one build and completes canonically", async () => {
    const value = await fixture();
    const observed: string[] = [];
    const buildOnce = vi.fn(async () => {
      observed.push(JSON.parse(await readFile(value.descriptorLocator, "utf8")).status);
      return buildEvidence(value.generation);
    });
    const result = await produceBuildGeneration(value.handoffPath, {
      expectedPath: value.handoffPath,
      authenticatePlanning: vi.fn(async () => undefined),
      buildOnce,
    });
    expect(observed).toEqual(["started"]);
    expect(buildOnce).toHaveBeenCalledOnce();
    expect(result).toEqual({
      error_code: null,
      generation: value.generation,
      result_locator: value.resultLocator,
      result_sha256: expect.stringMatching(/^[0-9a-f]{64}$/u),
      schema: "evidencelens.build-producer.v1",
      status: "completed",
    });
    expect(JSON.parse(await readFile(value.descriptorLocator, "utf8")).status).toBe("completed");
  });

  it("refuses a second producer invocation before Docker", async () => {
    const value = await fixture();
    const buildOnce = vi.fn(async () => buildEvidence(value.generation));
    const options = { expectedPath: value.handoffPath, authenticatePlanning: vi.fn(async () => undefined), buildOnce };
    await produceBuildGeneration(value.handoffPath, options);
    await expect(produceBuildGeneration(value.handoffPath, options)).rejects.toThrow("PRODUCER_ALREADY_CLAIMED");
    expect(buildOnce).toHaveBeenCalledTimes(1);
  });

  it("allows only one build across concurrent producer claims", async () => {
    const value = await fixture();
    const buildOnce = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return buildEvidence(value.generation);
    });
    const options = { expectedPath: value.handoffPath, authenticatePlanning: vi.fn(async () => undefined), buildOnce };
    const outcomes = await Promise.allSettled([
      produceBuildGeneration(value.handoffPath, options),
      produceBuildGeneration(value.handoffPath, options),
    ]);
    expect(outcomes.filter((entry) => entry.status === "fulfilled")).toHaveLength(1);
    expect(outcomes.filter((entry) => entry.status === "rejected")).toHaveLength(1);
    expect(buildOnce).toHaveBeenCalledOnce();
  });

  it.each(["", "/absolute/10-22-BUILD.json", "./10-22-BUILD.json", "10-22-BUILD.json;docker build ."])
  ("rejects wrong argv spelling %s before any side effect", async (path) => {
    const value = await fixture();
    const authenticatePlanning = vi.fn();
    const buildOnce = vi.fn();
    await expect(produceBuildGeneration(path, { expectedPath: value.handoffPath, authenticatePlanning, buildOnce }))
      .rejects.toThrow("PRODUCER_ARGV");
    expect(authenticatePlanning).not.toHaveBeenCalled();
    expect(buildOnce).not.toHaveBeenCalled();
  });

  it("records a finite sanitized failed state and never retries", async () => {
    const value = await fixture();
    const buildOnce = vi.fn(async () => { throw new Error("secret arbitrary docker diagnostic"); });
    const result = await produceBuildGeneration(value.handoffPath, {
      expectedPath: value.handoffPath,
      authenticatePlanning: vi.fn(async () => undefined),
      buildOnce,
    });
    expect(buildOnce).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ status: "failed", error_code: "BUILD_FAILED", result_locator: null });
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(JSON.parse(await readFile(value.descriptorLocator, "utf8"))).toMatchObject({ status: "failed", error_code: "BUILD_FAILED" });
  });
});
