import { execFile } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

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

  it("reaches the real fixed build preflight and reports only a stable code", async () => {
    const root = await mkdtemp(join(tmpdir(), "automatic-cli-docker-"));
    const marker = join(root, "docker-called");
    const docker = join(root, "docker");
    await writeFile(docker, `#!/bin/sh\nprintf called > '${marker}'\nexit 99\n`);
    await chmod(docker, 0o700);
    const result = await invoke("review:auto-build", [], { PATH: `${root}:${process.env.PATH}` });
    expect(result.code).toBe(50);
    expect(result.stderr).toContain("automatic-live-review: AUTOMATIC_PREFLIGHT");
    expect(result.stderr).not.toMatch(/DEEPSEEK_API_KEY|\/Users\/|stack|cause/iu);
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
    const state = JSON.parse(await readFile(join(phase, ".10-59-live-state.json"), "utf8"));
    const terminal = JSON.parse(await readFile(join(phase, ".10-59-terminal-snapshot.json"), "utf8"));
    expect(state).toMatchObject({ inner_status: "failed", reservation_count: 0, mcp_tools_call_count: 0, observed_provider_requests: 0, wrapper_status: "completed" });
    expect(terminal).toMatchObject({ branch: "pre_reservation_preflight", reservation_count: 0, mcp_tools_call_count: 0, observed_provider_requests: 0 });
    await expect(readFile(marker, "utf8")).rejects.toThrow();
  });
});
