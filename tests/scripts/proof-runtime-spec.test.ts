import { describe, expect, it, vi } from "vitest";

import {
  PROOF_SENTINEL,
  REVIEW_SENTINEL,
  deriveProofRuntimeSpec,
  proofDockerRunArgv,
} from "../../scripts/proof-runtime-spec.mjs";

const baseService = {
  entrypoint: ["/usr/local/bin/docker-entrypoint.sh"],
  command: null,
  working_dir: "/app",
  user: "node",
  read_only: true,
  tmpfs: ["/tmp"],
  cap_drop: ["ALL"],
  security_opt: ["no-new-privileges:true"],
};

function composeObject() {
  const provider = {
    DEEPSEEK_API_KEY: REVIEW_SENTINEL,
    DEEPSEEK_BASE_URL: "https://api.deepseek.com",
    DEEPSEEK_MODEL: "deepseek-v4-flash-vision-exp",
    DEEPSEEK_TIMEOUT_MS: "30000",
    DEEPSEEK_MAX_RETRIES: "2",
    DEEPSEEK_MAX_TOTAL_WAIT_MS: "10000",
    DEEPSEEK_TEMPERATURE: "0.2",
    DEEPSEEK_MAX_TOKENS: "4000",
    EVIDENCELENS_ALLOWED_ROOTS: "course=/workspace",
  };
  return {
    services: {
      review: { ...baseService, environment: provider, volumes: [{ type: "bind", source: ".", target: "/workspace", read_only: true }] },
      proof: {
        ...baseService,
        environment: { ...provider, DEEPSEEK_API_KEY: PROOF_SENTINEL, DEEPSEEK_MAX_RETRIES: "0", EVIDENCELENS_ALLOWED_ROOTS: "course=/proof-fixtures" },
        volumes: [],
      },
    },
  };
}

describe("credential-free proof runtime specification", () => {
  it("uses a sanitized child environment and normalizes both sentinels", async () => {
    const runCompose = vi.fn(async (_file: string, _args: string[], options: { env: NodeJS.ProcessEnv }) => {
      expect(options.env.DEEPSEEK_API_KEY).toBe(REVIEW_SENTINEL);
      expect(options.env.EVIDENCELENS_PROOF_DEEPSEEK_API_KEY).toBe(PROOF_SENTINEL);
      expect(Object.values(options.env)).not.toContain("sk-real-looking-secret");
      return { stdout: JSON.stringify(composeObject()), stderr: "" };
    });
    const result = await deriveProofRuntimeSpec(runCompose, {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      DEEPSEEK_API_KEY: "sk-real-looking-secret",
      EVIDENCELENS_PROOF_DEEPSEEK_API_KEY: "sk-other-secret",
    });
    expect(runCompose).toHaveBeenCalledOnce();
    expect(JSON.stringify(result)).not.toContain(REVIEW_SENTINEL);
    expect(JSON.stringify(result)).not.toContain(PROOF_SENTINEL);
    expect(result.proof.environment.DEEPSEEK_API_KEY).toBe("<runtime-secret>");
    expect(result.review.environment.DEEPSEEK_API_KEY).toBe("<runtime-secret>");
  });

  it.each([
    ["missing review", (value: any) => { delete value.services.review.environment.DEEPSEEK_API_KEY; }],
    ["duplicate review", (value: any) => { value.services.review.label = REVIEW_SENTINEL; }],
    ["wrong proof location", (value: any) => { value.services.proof.environment.DEEPSEEK_API_KEY = "x"; value.services.proof.label = PROOF_SENTINEL; }],
    ["crossed sentinels", (value: any) => { value.services.review.environment.DEEPSEEK_API_KEY = PROOF_SENTINEL; value.services.proof.environment.DEEPSEEK_API_KEY = REVIEW_SENTINEL; }],
    ["arbitrary nested leak", (value: any) => { value.services.proof.labels = { leak: PROOF_SENTINEL }; }],
  ])("rejects %s with sanitized errors", async (_name, mutate) => {
    const value = composeObject(); mutate(value);
    const runCompose = vi.fn(async () => ({ stdout: JSON.stringify(value), stderr: REVIEW_SENTINEL }));
    await expect(deriveProofRuntimeSpec(runCompose, {})).rejects.toThrow("proof runtime preflight failed");
    await expect(deriveProofRuntimeSpec(runCompose, {})).rejects.not.toThrow(REVIEW_SENTINEL);
  });

  it("rejects mounts, extra key-like fields, and secret-bearing diagnostics", async () => {
    const value = composeObject();
    value.services.proof.volumes = [{ type: "bind", source: ".", target: "/proof-fixtures" }];
    (value.services.proof as any).labels = { API_KEY_BACKUP: "anything" };
    await expect(deriveProofRuntimeSpec(async () => ({ stdout: JSON.stringify(value), stderr: "private" }), {}))
      .rejects.toThrow(/^proof runtime preflight failed$/);
  });

  it("maps every proof field to immutable-image docker argv without mutable surfaces", async () => {
    const spec = await deriveProofRuntimeSpec(async () => ({ stdout: JSON.stringify(composeObject()), stderr: "" }), {});
    const argv = proofDockerRunArgv(spec, "sha256:" + "a".repeat(64));
    expect(argv.at(-1)).toBe("sha256:" + "a".repeat(64));
    expect(argv).toContain("--read-only");
    expect(argv).not.toContain("--network=host");
    expect(argv).toContain("--cap-drop=ALL");
    expect(argv).toContain("--security-opt=no-new-privileges:true");
    expect(argv.join(" ")).not.toMatch(/(?:--mount|--volume|-v\b|build|pull|EVIDENCELENS_PROOF_DEEPSEEK_API_KEY|PREFLIGHT_SENTINEL)/u);
  });

  it.each(["latest", "repo/image:tag", "sha256:short", "sha256:" + "g".repeat(64)])("rejects mutable or malformed image identity %s", async (image) => {
    const spec = await deriveProofRuntimeSpec(async () => ({ stdout: JSON.stringify(composeObject()), stderr: "" }), {});
    expect(() => proofDockerRunArgv(spec, image)).toThrow("proof runtime argv failed");
  });

  it.each([
    ["writable root", (proof: any) => { proof.readOnly = false; }],
    ["host network", (proof: any) => { proof.network = "host"; }],
    ["extra entrypoint", (proof: any) => { proof.entrypoint.push("--unexpected"); }],
    ["shell command", (proof: any) => { proof.command = ["/bin/sh", "-c", "echo bad"]; }],
    ["duplicate tmpfs", (proof: any) => { proof.tmpfs.push("/tmp"); }],
    ["extra environment", (proof: any) => { proof.environment.EXTRA = "x"; }],
    ["proof variable leak", (proof: any) => { proof.environment.DEEPSEEK_MODEL = "EVIDENCELENS_PROOF_DEEPSEEK_API_KEY"; }],
  ])("rejects mutated runtime contract: %s", async (_name, mutate) => {
    const spec = await deriveProofRuntimeSpec(async () => ({ stdout: JSON.stringify(composeObject()), stderr: "" }), {});
    mutate(spec.proof);
    expect(() => proofDockerRunArgv(spec, "sha256:" + "a".repeat(64))).toThrow("proof runtime argv failed");
  });
});
