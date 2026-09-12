import { describe, expect, it } from "vitest";
import { validateResumeBlock } from "../../scripts/prelive-review-gate.mjs";

const h = (c: string) => c.repeat(64);
const valid = { authorization_echo: `authorize evidencelens review nonce=${h("a")} manifest_sha256=${h("b")}`, challenge_commit: "c".repeat(40), challenge_expires_at_ms: 2000, challenge_handoff_blob: h("d"), generation: h("e"), image_id: `sha256:${h("f")}`, manifest_sha256: h("b"), nonce: h("a"), non_planning_tree: h("1"), replay_status: "unconsumed", reviewed_commit: "2".repeat(40), schema: "evidencelens.challenge-resume.v1", status: "ready" };

describe("prelive resume gate", () => {
  it("accepts only the complete strict resume schema", () => expect(validateResumeBlock(valid)).toEqual(valid));
  it.each([["extra", 1], ["status", "failed"], ["replay_status", "consumed"], ["nonce", h("0")]])("rejects %s mismatch", (key, value) => {
    const candidate: any = { ...valid, [key]: value };
    if (key === "nonce") candidate.authorization_echo = valid.authorization_echo;
    expect(() => validateResumeBlock(candidate)).toThrow("PRELIVE_RESUME");
  });
});
