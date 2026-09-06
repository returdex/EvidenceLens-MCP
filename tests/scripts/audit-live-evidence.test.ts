import { describe, expect, it } from "vitest";
import { auditLiveEvidence } from "../../scripts/audit-live-evidence.mjs";

const timestamp = "2026-09-07T00:00:00.000Z";
const verification = (outcome: string, status: "passed" | "gaps_found", interpretation?: string) => `---\nstatus: ${status}\n---\n<!-- live-proof:start -->\ncommand: npm run docker:review:real\ntimestamp: ${timestamp}\noutcome: ${outcome}\ninterpretation: ${interpretation ?? (status === "passed" ? "complete credentialed Docker MCP structural proof passed" : "complete credentialed Docker MCP structural proof remains unproven")}\nstatus: ${status}\n<!-- live-proof:end -->\n`;
const requirements = (complete: boolean) => `- [${complete ? "x" : " "}] **PROV-01**: requirement\n| PROV-01 | Phase 10 | ${complete ? "Complete" : "Gap: credentialed Docker MCP proof"} |\n`;

describe("live evidence audit", () => {
  it("accepts each mutually consistent finite outcome", () => {
    expect(auditLiveEvidence(verification("credentialed review passed: 4 fixtures, 2 findings", "passed"), requirements(true))).toEqual({ passed: true });
    expect(auditLiveEvidence(verification("[docker-review:timeout] failed", "gaps_found"), requirements(false))).toEqual({ passed: false });
    expect(auditLiveEvidence(verification("no-authorization", "gaps_found"), requirements(false))).toEqual({ passed: false });
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
});
