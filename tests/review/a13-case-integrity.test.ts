import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const base = new URL('../fixtures/reviews/fit5032-a13/', import.meta.url);
const inputText = readFileSync(new URL('blind-input.json', base), 'utf8');
const oracleText = readFileSync(new URL('evaluation.json', base), 'utf8');
const input = JSON.parse(inputText);
const oracle = JSON.parse(oracleText);

// Dataset integrity only. These assertions do not execute or grade a model.
describe('A1.3 real-case dataset boundaries', () => {
  it('keeps outcome labels and later marking evidence out of the blind input', () => {
    expect(inputText).not.toMatch(/observedOutcome|S-FEEDBACK|S-GRADE|1\.15|Claude|five.band/i);
    const contents = input.sources.map((s: {content: string}) => s.content).join('\n');
    expect(contents).not.toMatch(/\b70(?:\.00)?\b/);
    expect(input.stage).toBe('final');
  });
  it('retains distinct criterion sources and resolves every oracle evidence reference', () => {
    const ids = input.sources.map((s: { id: string }) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ['R1', 'R2', 'R3', 'R4']) expect(ids).toContain(id);
    for (const r of oracle.requirements) {
      expect(r.sourceIds.length).toBeGreaterThan(0);
      for (const id of r.sourceIds) expect(ids).toContain(id);
    }
  });
  it('preserves contradictory CRUD evidence and the source version distinction', () => {
    expect(input.sources.find((s: {id: string}) => s.id === 'C3').content).toContain('Remove button');
    expect(oracle.scenarios.find((s: {id: string}) => s.id === 'feedback-reconciliation').additionalEvidence).toContain('five numeric bands');
    expect(oracle.gradingProtocol.forbiddenInferences).toContain('The submitted admin has no CRUD');
  });
  it('keeps scenarios linked to defined expectations and quarantines hindsight', () => {
    const checks = oracle.requirements.map((r: {id: string}) => r.id);
    expect(new Set(oracle.scenarios.map((s: {id: string}) => s.id)).size).toBe(oracle.scenarios.length);
    for (const s of oracle.scenarios) {
      for (const id of s.checks) expect(checks).toContain(id);
      for (const file of s.inputFiles) expect(file).toBe('blind-input.json');
    }
    expect(oracle.scenarios.find((s: {id: string}) => s.id === 'early-planning').inputFiles).toEqual([]);
  });
  it('records the observed arithmetic without making it the predicted target', () => {
    const o = oracle.observedOutcome;
    expect((o['C.1'] + o['C.2'] + o['C.3'] + o['C.4']) / (4 * o.maximumPerCriterion) * 100).toBe(o.percent);
    expect(oracle.gradingProtocol.forbiddenInferences).toContain('Exactly 70 is the predicted score');
  });
  it('excludes raw identities, private URLs, local paths and executable credentials', () => {
    expect(inputText + oracleText).not.toMatch(/\/Users\/|\/var\/folders\/|https?:\/\/|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b\d{8}\b|password\s*[:=]\s*["']/i);
    expect(input.representation).toContain('not verbatim');
    expect(oracle.status).toContain('NOT_RUN');
  });
});
