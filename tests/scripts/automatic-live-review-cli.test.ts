import { execFile } from "node:child_process";
import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
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
    const result = await invoke("review:auto-build");
    expect(result.code).toBe(50);
    expect(result.stderr).toContain("automatic-live-review: AUTOMATIC_PREFLIGHT");
    expect(result.stderr).not.toMatch(/DEEPSEEK_API_KEY|\/Users\/|stack|cause/iu);
  });

  it("reaches the real fixed live preflight before credential access", async () => {
    const result = await invoke("review:auto-live-once", [], { DEEPSEEK_API_KEY: "must-not-be-observed" });
    expect(result.code).toBe(50);
    expect(result.stderr).toContain("automatic-live-review: AUTOMATIC_PREFLIGHT");
    expect(result.stderr).not.toContain("must-not-be-observed");
  });
});
