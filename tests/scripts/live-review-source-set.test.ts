import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import {
  createNonPlanningManifest,
  materializePrivateContext,
  verifyPrivateContext,
} from "../../scripts/live-review-source-set.mjs";

const execFileAsync = promisify(execFile);

async function repository() {
  const root = await mkdtemp(join(tmpdir(), "evidencelens-source-set-"));
  await execFileAsync("git", ["init", "-q"], { cwd: root });
  await execFileAsync("git", ["config", "user.email", "test@example.invalid"], { cwd: root });
  await execFileAsync("git", ["config", "user.name", "Test"], { cwd: root });
  await mkdir(join(root, ".planning"));
  await mkdir(join(root, "src"));
  await writeFile(join(root, "src", "server.ts"), "export const value = 1;\n");
  await writeFile(join(root, "Dockerfile.proof"), "FROM scratch\nCOPY . /app\n");
  await writeFile(join(root, ".gitignore"), "ignored.bin\nnode_modules/\ndist/\n.evidencelens.local.json\n");
  await writeFile(join(root, ".planning", "STATE.md"), "mutable evidence\n");
  await execFileAsync("git", ["add", "."], { cwd: root });
  await execFileAsync("git", ["commit", "-qm", "fixture"], { cwd: root });
  return root;
}

describe("reviewed non-planning source set", () => {
  it("covers every tracked non-planning blob with a stable exhaustive identity", async () => {
    const root = await repository();
    const reviewedCommit = (await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
    const first = await createNonPlanningManifest({ repoDir: root, reviewedCommit });
    await writeFile(join(root, ".planning", "STATE.md"), "changed evidence only\n");
    const second = await createNonPlanningManifest({ repoDir: root, reviewedCommit });
    expect(first).toEqual(second);
    expect(first.reviewedCommit).toMatch(/^[0-9a-f]{40,64}$/u);
    expect(first.entries.map((entry) => entry.path)).toEqual([".gitignore", "Dockerfile.proof", "src/server.ts"]);
    expect(first.nonPlanningTree).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("rejects tracked drift but permits unrelated ordinary and ignored files", async () => {
    const root = await repository();
    const reviewedCommit = (await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
    await writeFile(join(root, "notes.txt"), "ordinary local file\n");
    await writeFile(join(root, "ignored.bin"), "ignored local file\n");
    await expect(materializePrivateContext({ repoDir: root, reviewedCommit })).resolves.toMatchObject({ nonPlanningTree: expect.any(String) });
    expect(await readFile(join(root, "notes.txt"), "utf8")).toContain("ordinary");
    expect(await readFile(join(root, "ignored.bin"), "utf8")).toContain("ignored");
    await writeFile(join(root, "src", "server.ts"), "tampered\n");
    await expect(materializePrivateContext({ repoDir: root, reviewedCommit })).rejects.toThrow("SOURCE_SET_TRACKED_DRIFT");
  });

  it("materializes only exact commit bytes and detects private snapshot mutation", async () => {
    const root = await repository();
    const reviewedCommit = (await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
    const snapshot = await materializePrivateContext({ repoDir: root, reviewedCommit });
    expect(await readFile(join(snapshot.contextPath, "src", "server.ts"), "utf8")).toContain("value = 1");
    await expect(readFile(join(snapshot.contextPath, ".planning", "STATE.md"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    await writeFile(join(snapshot.contextPath, "src", "server.ts"), "mutated\n");
    await expect(verifyPrivateContext(snapshot)).rejects.toThrow("SOURCE_SET_SNAPSHOT_DRIFT");
    await snapshot.cleanup();
  });
});
