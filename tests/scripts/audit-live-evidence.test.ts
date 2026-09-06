import { describe, expect, it } from "vitest";
import { auditLiveEvidence } from "../../scripts/audit-live-evidence.mjs";

const timestamp = "2026-09-07T00:00:00.000Z";
const verification = (outcome: string, status: "passed" | "gaps_found", interpretation?: string) => `---\nstatus: ${status}\n---\n<!-- live-proof:start -->\ncommand: npm run docker:review:real\ntimestamp: ${timestamp}\noutcome: ${outcome}\ninterpretation: ${interpretation ?? (status === "passed" ? "complete credentialed Docker MCP structural proof passed" : "complete credentialed Docker MCP structural proof remains unproven")}\nstatus: ${status}\n<!-- live-proof:end -->\n`;
const requirements = (complete: boolean) => `- [${complete ? "x" : " "}] **PROV-01**: requirement\n| PROV-01 | Phase 10 | ${complete ? "Complete" : "Gap: credentialed Docker MCP proof"} |\n`;

describe("live evidence audit", () => {
  it.each([
    "credentialed review passed: 4 fixtures, 1 findings",
    "credentialed review passed: 4 fixtures, 2 findings"
  ])("accepts an exact bounded success outcome: %s", (outcome) => {
    expect(auditLiveEvidence(verification(outcome, "passed"), requirements(true))).toEqual({ passed: true });
  });

  it("accepts each mutually consistent finite non-pass outcome", () => {
    expect(auditLiveEvidence(verification("[docker-review:timeout] failed", "gaps_found"), requirements(false))).toEqual({ passed: false });
    expect(auditLiveEvidence(verification("no-authorization", "gaps_found"), requirements(false))).toEqual({ passed: false });
  });

  it.each([
    "credentialed review passed: 0 fixtures, 0 findings",
    "credentialed review passed: 0 fixtures, 1 findings",
    "credentialed review passed: 1 fixtures, 1 findings",
    "credentialed review passed: 3 fixtures, 1 findings",
    "credentialed review passed: 5 fixtures, 1 findings",
    "credentialed review passed: 4 fixtures, 0 findings",
    "credentialed review passed: -4 fixtures, 1 findings",
    "credentialed review passed: 4 fixtures, -1 findings",
    "credentialed review passed: +4 fixtures, 1 findings",
    "credentialed review passed: 4 fixtures, +1 findings",
    "credentialed review passed: 4.0 fixtures, 1 findings",
    "credentialed review passed: 4 fixtures, 1.0 findings",
    "credentialed review passed:  4 fixtures, 1 findings",
    "credentialed review passed: 4  fixtures, 1 findings",
    "credentialed review passed: 4 fixtures,  1 findings",
    "credentialed review passed: 4 fixtures, 1  findings",
    "credentialed review passed: 04 fixtures, 1 findings",
    "credentialed review passed: 4 fixtures, 01 findings",
    "credentialed review passed: fixtures, 1 findings",
    "credentialed review passed: 4 fixtures, findings",
    "credentialed review passed: 4, 1 findings",
    "credentialed review passed: 4 fixtures, 1",
    "credentialed review passed: 4 fixtures, 1 finding",
    "credentialed review passed: 4 fixtures, 1 findings trailing",
    "credentialed review passed: 4 fixtures, 1 findings\ninjected",
    "credentialed review passed: 4 fixtures, 1 findings\r",
    "credentialed review passed: 4 fixtures,\t1 findings",
    "credentialed review passed: 4 fixtures, 1 findings\u0000",
    "credentialed review passed: 4e0 fixtures, 1 findings",
    "credentialed review passed: 4 fixtures, 1e0 findings",
    "credentialed review passed: Infinity fixtures, 1 findings",
    "credentialed review passed: 4 fixtures, Infinity findings",
    "credentialed review passed: NaN fixtures, 1 findings",
    "credentialed review passed: 4 fixtures, NaN findings",
    `credentialed review passed: ${"9".repeat(128)} fixtures, 1 findings`,
    `credentialed review passed: 4 fixtures, ${"9".repeat(128)} findings`
  ])("rejects an adversarial success count: %s", (outcome) => {
    expect(() => auditLiveEvidence(verification(outcome, "passed"), requirements(true))).toThrowError(new Error("live evidence audit failed"));
  });

  it("rejects contradictory or stale outcomes", () => {
    const cases = [
      [verification("credentialed review passed: 4 fixtures, 2 findings", "passed"), requirements(false)],
      [verification("[docker-review:timeout] failed", "gaps_found"), requirements(true)],
      [verification("no-authorization", "passed"), requirements(true)],
      [verification("[docker-review:timeout] failed", "gaps_found") + "<!-- live-proof:start -->", requirements(false)]
    ];
    for (const [report, reqs] of cases) expect(() => auditLiveEvidence(report, reqs)).toThrow("live evidence audit failed");
  });

  it.each([
    "raw stderr", '{"jsonrpc":"2.0"}', "/Users/private/file", "../private/file", "https://example.test/api",
    "DEEPSEEK_API_KEY=value", "model: private-model", "stack: secret", "cause: secret", "provider prose"
  ])("rejects forbidden or extra retained evidence: %s", (extra) => {
    const report = verification("[docker-review:timeout] failed", "gaps_found").replace("status: gaps_found\n<!-- live-proof:end -->", `status: gaps_found\n${extra}\n<!-- live-proof:end -->`);
    expect(() => auditLiveEvidence(report, requirements(false))).toThrow("live evidence audit failed");
  });

  it.each([
    "duplicate live-proof block",
    "line before the five allowlisted lines",
    "line after the five allowlisted lines"
  ])("rejects non-finite retained evidence structure: %s", (variant) => {
    const base = verification("[docker-review:timeout] failed", "gaps_found");
    const report = variant === "duplicate live-proof block"
      ? `${base}${base}`
      : variant === "line before the five allowlisted lines"
        ? base.replace("command: npm run docker:review:real", "unexpected\ncommand: npm run docker:review:real")
        : base.replace("status: gaps_found\n<!-- live-proof:end -->", "status: gaps_found\nunexpected\n<!-- live-proof:end -->");
    expect(() => auditLiveEvidence(report, requirements(false))).toThrowError(new Error("live evidence audit failed"));
  });
});
