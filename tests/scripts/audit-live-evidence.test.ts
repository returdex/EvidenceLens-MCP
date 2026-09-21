import { describe, expect, it } from "vitest";
import { auditLiveEvidence } from "../../scripts/audit-live-evidence.mjs";

const timestamp = "2026-09-07T00:00:00.000Z";
const verification = (outcome: string, status: "passed" | "gaps_found", interpretation?: string) => `---\nstatus: ${status}\n---\n<!-- live-proof:start -->\ncommand: npm run docker:review:real\ntimestamp: ${timestamp}\noutcome: ${outcome}\ninterpretation: ${interpretation ?? (status === "passed" ? "complete credentialed Docker MCP structural proof passed" : "complete credentialed Docker MCP structural proof remains unproven")}\nstatus: ${status}\n<!-- live-proof:end -->\n`;
const requirements = (complete: boolean) => `- [${complete ? "x" : " "}] **PROV-01**: requirement\n| PROV-01 | Phase 10 | ${complete ? "Complete" : "Gap: credentialed Docker MCP proof"} |\n`;

describe("live evidence audit", () => {
  const h = (c: string) => c.repeat(64);
  const proof = (outcome: string, overrides: Record<string, unknown> = {}) => ({
    build_sha256: h("1"), execution_sha256: h("2"), review_sha256: h("3"), security_sha256: h("4"), source_sha256: h("5"),
    certifier_sha256: { audit_live_evidence_sha256: h("a"), audit_proof_chain_sha256: h("b") },
    clean_exit: outcome === "passed", fixture_count: outcome === "passed" ? 4 : 0,
    finding_count: outcome === "passed" ? 1 : 0, manifest_sha256: h("c"), non_planning_tree: h("d"),
    outcome, reviewed_commit: "e".repeat(40), schema: "evidencelens.live-proof.v3",
    status: outcome === "passed" ? "passed" : "gaps_found", ...overrides,
  });
  const phase = (n: 7 | 10, status: "passed" | "gaps_found") => `---\nphase: ${n}\nstatus: ${status}\n---\n`;

  it("audits sealed proof, Phase 7, Phase 10 and requirements together", () => {
    expect(auditLiveEvidence(proof("passed"), phase(7, "passed"), phase(10, "passed"), requirements(true))).toEqual({ passed: true });
  });

  it("allows Markdown horizontal rules after the opening frontmatter", () => {
    const phase10 = `${phase(10, "passed")}\n## Evidence\n\n---\n\nVerified body content.\n`;
    expect(auditLiveEvidence(proof("passed"), phase(7, "passed"), phase10, requirements(true))).toEqual({ passed: true });
  });

  it.each(["diagnostic_failed", "preflight_failed", "review_failed", "build_failed", "request_failed", "timeout", "protocol_failed", "disclosure", "malformed", "abnormal_close"])("forces %s to the three-way gap state", (outcome) => {
    expect(auditLiveEvidence(proof(outcome), phase(7, "gaps_found"), phase(10, "gaps_found"), requirements(false))).toEqual({ passed: false });
  });

  it("rejects false success and contradictory four-input state", () => {
    expect(() => auditLiveEvidence(proof("passed", { clean_exit: false }), phase(7, "passed"), phase(10, "passed"), requirements(true))).toThrow("live evidence audit failed");
    expect(() => auditLiveEvidence(proof("timeout"), phase(7, "passed"), phase(10, "gaps_found"), requirements(false))).toThrow("live evidence audit failed");
    expect(() => auditLiveEvidence({ ...proof("passed"), extra: true }, phase(7, "passed"), phase(10, "passed"), requirements(true))).toThrow("live evidence audit failed");
  });

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
    ["duplicate frontmatter status", verification("[docker-review:timeout] failed", "gaps_found").replace("status: gaps_found\n---", "status: gaps_found\nstatus: passed\n---"), requirements(false)],
    ["body-only status", verification("[docker-review:timeout] failed", "gaps_found").replace(/^---\nstatus: gaps_found\n---\n/u, "status: gaps_found\n"), requirements(false)],
    ["duplicate checklist", verification("[docker-review:timeout] failed", "gaps_found"), `${requirements(false)}- [ ] **PROV-01**: duplicate\n`],
    ["duplicate trace", verification("[docker-review:timeout] failed", "gaps_found"), `${requirements(false)}| PROV-01 | Phase 10 | Gap: credentialed Docker MCP proof |\n`],
  ])("rejects non-unique authority: %s", (_label, report, reqs) => {
    expect(() => auditLiveEvidence(report, reqs)).toThrow("live evidence audit failed");
  });

  it("rejects duplicate or body-only status in sealed phase inputs", () => {
    expect(() => auditLiveEvidence(proof("timeout"), "---\nphase: 7\nstatus: gaps_found\nstatus: passed\n---\n", phase(10, "gaps_found"), requirements(false))).toThrow("live evidence audit failed");
    expect(() => auditLiveEvidence(proof("timeout"), "phase: 7\nstatus: gaps_found\n", phase(10, "gaps_found"), requirements(false))).toThrow("live evidence audit failed");
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
