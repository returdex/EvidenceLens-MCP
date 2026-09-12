import { PassThrough } from "node:stream";
import { describe, expect, it, vi } from "vitest";

import { executeAuthorizedOnce, readAuthorizationLine } from "../../scripts/atomic-authorized-review.mjs";

const h = (c: string) => c.repeat(64);
const echo = `authorize evidencelens review nonce=${h("a")} manifest_sha256=${h("b")}`;
const resume = { authorization_echo: echo, challenge_commit: "c".repeat(40), challenge_expires_at_ms: Date.now() + 60_000, challenge_handoff_blob: h("d"), generation: h("e"), image_id: `sha256:${h("f")}`, manifest_sha256: h("b"), nonce: h("a"), non_planning_tree: h("1"), replay_status: "unconsumed", reviewed_commit: "2".repeat(40), schema: "evidencelens.challenge-resume.v1", status: "ready" };
function input(bytes: Buffer | string) { const stream = new PassThrough(); stream.end(bytes); return stream; }

describe("atomic authorized once", () => {
  it("reads exactly one bounded LF-terminated UTF-8 line", async () => expect(readAuthorizationLine(input(`${echo}\n`))).resolves.toBe(echo));
  it.each([
    ["EOF", echo], ["CR", `${echo}\r\n`], ["NUL", `${echo}\0\n`], ["second line", `${echo}\nextra\n`], ["extra bytes", `${echo}\nx`], ["oversize", `${"x".repeat(1025)}\n`], ["invalid UTF8", Buffer.from([0xff, 0x0a])],
  ])("rejects %s before any spawn", async (_name, bytes) => expect(readAuthorizationLine(input(bytes as any))).rejects.toThrow("AUTHORIZED_STDIN"));

  it("reconstructs state, consumes durably, then spawns the pinned image once", async () => {
    const consume = vi.fn(async () => undefined), spawnPinned = vi.fn(async () => ({ status: "passed" }));
    const publishOutcome = vi.fn(async () => undefined);
    const result = await executeAuthorizedOnce("fixed", input(`${echo}\n`), { expectedPath: "fixed", verify: vi.fn(async () => resume), consume, spawnPinned, publishOutcome });
    expect(consume).toHaveBeenCalledOnce(); expect(spawnPinned).toHaveBeenCalledOnce(); expect(spawnPinned).toHaveBeenCalledWith(resume);
    expect(result).toEqual({ schema: "evidencelens.authorized-review.v1", status: "passed" }); expect(publishOutcome).toHaveBeenCalledOnce();
  });

  it("rejects wrong challenge and replay before spawning", async () => {
    const spawnPinned = vi.fn();
    await expect(executeAuthorizedOnce("fixed", input("wrong\n"), { expectedPath: "fixed", verify: async () => resume, consume: vi.fn(), spawnPinned })).rejects.toThrow("AUTHORIZED_MISMATCH");
    await expect(executeAuthorizedOnce("fixed", input(`${echo}\n`), { expectedPath: "fixed", verify: async () => resume, consume: async () => { throw new Error("AUTHORIZED_REPLAY"); }, spawnPinned })).rejects.toThrow("AUTHORIZED_REPLAY");
    expect(spawnPinned).not.toHaveBeenCalled();
  });

  it("permits at most one spawn under concurrent execution", async () => {
    let claimed = false; const spawnPinned = vi.fn(async () => ({ status: "passed" }));
    const options = { expectedPath: "fixed", verify: async () => resume, consume: async () => { if (claimed) throw new Error("AUTHORIZED_REPLAY"); claimed = true; }, spawnPinned, publishOutcome: async () => undefined };
    const outcomes = await Promise.allSettled([executeAuthorizedOnce("fixed", input(`${echo}\n`), options), executeAuthorizedOnce("fixed", input(`${echo}\n`), options)]);
    expect(outcomes.filter(x => x.status === "fulfilled")).toHaveLength(1); expect(spawnPinned).toHaveBeenCalledOnce();
  });

  it.each(["", "/absolute", "./fixed", "fixed;docker build ."])("rejects argv %s before verifier", async (path) => {
    const verify = vi.fn(); await expect(executeAuthorizedOnce(path, input(`${echo}\n`), { expectedPath: "fixed", verify })).rejects.toThrow("AUTHORIZED_ARGV"); expect(verify).not.toHaveBeenCalled();
  });
});
