import { execFile } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { FIXED_AUTOMATIC_PATHS, runAutomaticBuildPipeline } from "../../scripts/automatic-live-review.mjs";

const execFileAsync = promisify(execFile);

async function invoke(script: "review:auto-build" | "review:auto-live-once", args: string[] = [], env: NodeJS.ProcessEnv = {}) {
  try {
    const result = await execFileAsync("npm", ["run", script, ...(args.length ? ["--", ...args] : [])], {
      cwd: process.cwd(), env: { ...process.env, ...env }, encoding: "utf8", maxBuffer: 1024 * 1024,
    });
    return { ...result, code: 0 };
  } catch (error: any) {
    return { code: error.code, stderr: String(error.stderr ?? ""), stdout: String(error.stdout ?? "") };
  }
}
async function invokeLiveIn(root: string, env: NodeJS.ProcessEnv = {}) {
  const executable = join(process.cwd(), "scripts/automatic-live-review.mjs");
  try {
    const result = await execFileAsync(process.execPath, [executable, "auto-live-once"], { cwd: root, env: { ...process.env, ...env }, encoding: "utf8" });
    return { ...result, code: 0 };
  } catch (error: any) { return { code: error.code, stderr: String(error.stderr ?? ""), stdout: String(error.stdout ?? "") }; }
}

describe("automatic review package CLI", () => {
  it("fixes production build and live locators exclusively to the recovery namespace", () => {
    expect(FIXED_AUTOMATIC_PATHS).toMatchObject({
      forensic: expect.stringMatching(/10-157-CONSUMED-LIVE\.json$/u), source: expect.stringMatching(/10-158-SOURCE\.json$/u),
      review: expect.stringMatching(/10-158-REVIEW\.md$/u), security: expect.stringMatching(/10-158-SECURITY\.md$/u),
      build: expect.stringMatching(/10-159-FINAL-BUILD\.json$/u), state: expect.stringMatching(/\.10-160-live-state\.json$/u),
      terminal: expect.stringMatching(/\.10-160-terminal-snapshot\.json$/u), transition: expect.stringMatching(/10-160-TRANSITION\.json$/u),
      execution: expect.stringMatching(/10-160-EXECUTION\.json$/u), proof: expect.stringMatching(/10-160-PROOF\.json$/u),
      localValidation: expect.stringMatching(/10-160-LOCAL-VALIDATION\.json$/u),
    });
  });
  it("reaches fixed post-build build-auto audit with exactly one PATH-stubbed Docker build", async () => {
    const root = await mkdtemp(join(tmpdir(), "automatic-post-build-"));
    const marker = join(root, "docker-calls");
    const docker = join(root, "docker");
    await writeFile(docker, `#!/bin/sh\nprintf 'build\\n' >> '${marker}'\nexit 0\n`); await chmod(docker, 0o700);
    const modes: string[] = [];
    const h = (c: string) => c.repeat(64);
    const source = { certifier_sha256: {}, manifest_sha256: h("a"), non_planning_tree: h("b"), reviewed_commit: "c".repeat(40), schema: "evidencelens.source.v2", status: "ready" };
    const buildResult = { daemon_identity_sha256: h("1"), fixture_sha256: [h("2"), h("3"), h("4"), h("5")], image_config_sha256: h("6"), image_content_sha256: h("7"), image_id: `sha256:${h("8")}`, runtime_sha256: h("9") };
    const result = await runAutomaticBuildPipeline({
      audit: async (mode: string) => { if (mode === "build") throw new Error("legacy build mode reached"); modes.push(mode); },
      readSource: async () => source,
      prepare: async () => {
        await execFileAsync("docker", ["build"], { env: { ...process.env, PATH: `${root}:${process.env.PATH}` } });
        return { generation: h("d"), handoffPath: join(root, "handoff") };
      },
      produce: async () => ({ status: "completed" }), verify: async () => buildResult,
      seal: async (_path: string, value: unknown) => value,
    });
    expect(result).toMatchObject({ status: "ready", image_id: buildResult.image_id });
    expect(modes).toEqual(["reviews-auto", "build-auto"]);
    expect((await readFile(marker, "utf8")).trim().split("\n")).toEqual(["build"]);
  });

  it.each(["review:auto-build", "review:auto-live-once"] as const)("rejects caller argv before every external side effect: %s", async (script) => {
    const root = await mkdtemp(join(tmpdir(), "automatic-cli-path-"));
    const marker = join(root, "called");
    for (const command of ["git", "docker", "tar", "mkdir"]) {
      const path = join(root, command);
      await writeFile(path, `#!/bin/sh\nprintf called >> '${marker}'\nexit 99\n`);
      await chmod(path, 0o700);
    }
    const result = await invoke(script, ["../../hostile;docker", "--image=latest"], { PATH: `${root}:${process.env.PATH}` });
    expect(result.code).toBe(50);
    expect(result.stderr).toContain("automatic-live-review: AUTOMATIC_ARGV");
    await expect(readFile(marker, "utf8")).rejects.toThrow();
  });

  it("fails an explicit isolated invalid build tuple before Docker regardless of workspace artifacts", async () => {
    const root = await mkdtemp(join(tmpdir(), "automatic-invalid-preflight-"));
    const marker = join(root, "docker-called");
    const docker = join(root, "docker");
    await writeFile(docker, `#!/bin/sh\nprintf called > '${marker}'\nexit 99\n`); await chmod(docker, 0o700);
    const counters = { readSource: 0, prepare: 0, produce: 0, verify: 0, seal: 0 };
    await expect(runAutomaticBuildPipeline({
      audit: async (mode: string, paths: string[]) => {
        expect(mode).toBe("reviews-auto");
        expect(paths.every((path) => path.includes("10-158-"))).toBe(true);
        throw new Error("explicit isolated invalid tuple");
      },
      readSource: async () => { counters.readSource += 1; },
      prepare: async () => { counters.prepare += 1; await execFileAsync("docker", ["build"], { env: { ...process.env, PATH: `${root}:${process.env.PATH}` } }); },
      produce: async () => { counters.produce += 1; }, verify: async () => { counters.verify += 1; },
      seal: async () => { counters.seal += 1; },
    })).rejects.toThrow("explicit isolated invalid tuple");
    expect(counters).toEqual({ readSource: 0, prepare: 0, produce: 0, verify: 0, seal: 0 });
    await expect(readFile(marker, "utf8")).rejects.toThrow();
  });

  it("durably seals fixed pre-reservation evidence before credential, Docker or provider action", async () => {
    const root = await mkdtemp(join(tmpdir(), "automatic-live-preflight-"));
    const phase = join(root, ".planning/phases/10-fail-closed-provider-startup-and-credentialed-mcp-e2e");
    await mkdir(phase, { recursive: true });
    const marker = join(root, "external-called");
    for (const command of ["git", "docker"]) {
      const path = join(root, command);
      await writeFile(path, `#!/bin/sh\nprintf called >> '${marker}'\nexit 99\n`); await chmod(path, 0o700);
    }
    const result = await invokeLiveIn(root, { DEEPSEEK_API_KEY: "must-not-be-observed", PATH: `${root}:${process.env.PATH}` });
    expect(result.code).toBe(50);
    expect(result.stderr).toContain("automatic-live-review: AUTOMATIC_PREFLIGHT");
    expect(result.stderr).not.toContain("must-not-be-observed");
    const state = JSON.parse(await readFile(join(phase, ".10-160-live-state.json"), "utf8"));
    const terminal = JSON.parse(await readFile(join(phase, ".10-160-terminal-snapshot.json"), "utf8"));
    expect(state).toMatchObject({ inner_status: "failed", reservation_count: 0, mcp_tools_call_count: 0, observed_provider_requests: 0, wrapper_status: "completed" });
    expect(terminal).toMatchObject({ branch: "pre_reservation_preflight", reservation_count: 0, mcp_tools_call_count: 0, observed_provider_requests: 0 });
    await expect(readFile(marker, "utf8")).rejects.toThrow();
  });
});
