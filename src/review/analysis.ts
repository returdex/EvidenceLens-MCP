import type {
  EvidenceRole, EvidenceType, NormalizedEvidence, NormalizedEvidenceReference, ReviewCitation
} from "../contracts/review.js";

export const ANALYSIS_LIMITS = {
  maxPayloadBytes: 32_000_000,
  maxClaims: 2_000,
  maxTokens: 20_000,
  maxCells: 10_000,
  maxClaimLength: 1_000
} as const;

export type AnalysisTableCell = { value: string; location: Extract<NormalizedEvidenceReference, { kind: "table" }> };

export interface TransientEvidenceAnalysis {
  evidenceId: string;
  role: EvidenceRole;
  type: EvidenceType;
  reference: string;
  contentHash: string;
  references: NormalizedEvidenceReference[];
  byteLength: number;
  format?: "csv" | "tsv";
  text?: string;
  tableCells?: AnalysisTableCell[];
  bytes?: Uint8Array;
}

export interface ReviewAnalysisBundle {
  normalizedEvidence: NormalizedEvidence[];
  analysisPayloads: TransientEvidenceAnalysis[];
}

export interface Claim {
  key: string;
  tokens: string[];
  value?: string;
  text: string;
  evidenceId: string;
  role: EvidenceRole;
  location: NormalizedEvidenceReference;
  kind: "requirement" | "solution";
  negated: boolean;
}

export interface ReviewAnalysisInput {
  normalizedEvidence: NormalizedEvidence[];
  payloads: TransientEvidenceAnalysis[];
  requirements: Claim[];
  solutionClaims: Claim[];
  resolveCitation: (evidenceId: string, location: NormalizedEvidenceReference, visual?: boolean) => ReviewCitation;
  clear: () => void;
}

const stopWords = new Set("a an and are be by for from has have in is it of on or that the their this to was with must shall should required requirement needs need criteria solution submit provide students student include includes included contain contains containing report reports paragraph achieve achieves achieved absent missing lack lacks no not does do without cannot can't unable discusses discussed there".split(" "));
const obligation = /\b(?:must|shall|required|needs? to|criteria)\b/iu;
const negation = /\b(?:not|no|absent|missing|lacks?|does\s+not|do\s+not|doesn't|don't|cannot|can't|unable\s+to|without)\b/iu;
const assignment = /^\s*([A-Za-z][\w .-]{0,80})\s*(?:=|:)\s*(.+?)\s*$/u;

function tokens(text: string): string[] {
  return [...new Set(text.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}%\-]+/gu, " ").split(/\s+/u).filter((token) => token && !stopWords.has(token)).slice(0, 80))].sort();
}

function claimKey(text: string): string {
  const assigned = text.match(assignment);
  const source = assigned?.[1] ?? text;
  return tokens(source).join(" ").slice(0, 180) || "statement";
}

function valueOf(text: string): string | undefined {
  const match = text.match(assignment);
  if (match) return match[2].trim().toLocaleLowerCase().replace(/\s+/gu, " ").slice(0, 200);
  const scalar = text.match(/\b(?:\d+(?:\.\d+)?%?|true|false|yes|no|(?:["']).+?(?:["']))\b/iu);
  return scalar?.[0]?.toLocaleLowerCase();
}

function makeClaim(payload: TransientEvidenceAnalysis, text: string, location: NormalizedEvidenceReference, kind: Claim["kind"]): Claim {
  const bounded = text.trim().slice(0, ANALYSIS_LIMITS.maxClaimLength);
  return { key: claimKey(bounded), tokens: tokens(bounded), value: valueOf(bounded), text: bounded, evidenceId: payload.evidenceId, role: payload.role, location, kind, negated: negation.test(bounded) };
}

function boundedLines(payload: TransientEvidenceAnalysis): Array<{ text: string; location: NormalizedEvidenceReference }> {
  if (payload.text === undefined) return [];
  const lines = payload.text.slice(0, ANALYSIS_LIMITS.maxPayloadBytes).split(/\r\n|\n|\r/u);
  return lines.slice(0, ANALYSIS_LIMITS.maxClaims).map((text, index) => ({
    text,
    location: payload.type === "pdf"
      ? (payload.references[index] ?? { kind: "pdf", pageNumber: index + 1 })
      : (payload.references.find((reference) => reference.kind === "text" && reference.startLine === index + 1) ?? { kind: "text", startLine: index + 1, endLine: index + 1 })
  }));
}

export function extractRequirementClaims(payload: TransientEvidenceAnalysis): Claim[] {
  const claims: Claim[] = [];
  for (const line of boundedLines(payload)) if (obligation.test(line.text)) claims.push(makeClaim(payload, line.text, line.location, "requirement"));
  for (const cell of (payload.tableCells ?? []).slice(0, ANALYSIS_LIMITS.maxCells)) if (obligation.test(cell.value)) claims.push(makeClaim(payload, cell.value, cell.location, "requirement"));
  return claims.slice(0, ANALYSIS_LIMITS.maxClaims);
}

export function extractSolutionClaims(payload: TransientEvidenceAnalysis): Claim[] {
  const claims: Claim[] = [];
  for (const line of boundedLines(payload)) if (line.text.trim()) claims.push(makeClaim(payload, line.text, line.location, "solution"));
  for (const cell of (payload.tableCells ?? []).slice(0, ANALYSIS_LIMITS.maxCells)) if (cell.value.trim()) claims.push(makeClaim(payload, cell.value, cell.location, "solution"));
  return claims.slice(0, ANALYSIS_LIMITS.maxClaims);
}

function visualPayloadHash(evidence: NormalizedEvidence, location: NormalizedEvidenceReference): string | undefined {
  if (evidence.source.type === "pdf" && location.kind === "pdf") return evidence.visualPayloads?.find((payload) => payload.pageNumber === location.pageNumber)?.sha256;
  if ((evidence.source.type === "image" || evidence.source.type === "screenshot") && location.kind === "image") return evidence.visualPayload?.sha256;
  return undefined;
}

export function buildReviewAnalysisInput(bundle: ReviewAnalysisBundle): ReviewAnalysisInput {
  const normalizedById = new Map(bundle.normalizedEvidence.map((evidence) => [evidence.source.id, evidence]));
  const payloads = bundle.analysisPayloads.slice(0, ANALYSIS_LIMITS.maxClaims);
  const requirements = payloads.filter((payload) => payload.role !== "solution").flatMap(extractRequirementClaims).slice(0, ANALYSIS_LIMITS.maxClaims);
  const solutionClaims = payloads.filter((payload) => payload.role === "solution").flatMap(extractSolutionClaims).slice(0, ANALYSIS_LIMITS.maxClaims);
  const resolveCitation = (evidenceId: string, location: NormalizedEvidenceReference, visual = false): ReviewCitation => {
    const evidence = normalizedById.get(evidenceId);
    if (!evidence || !evidence.references.some((candidate) => JSON.stringify(candidate) === JSON.stringify(location))) throw new Error("citation is not present in normalized evidence");
    const payloadHash = visualPayloadHash(evidence, location);
    if (visual && payloadHash === undefined) throw new Error("visual citation has no retained payload");
    const intrinsicVisual = location.kind === "image" || (location.kind === "pdf" && payloadHash !== undefined);
    return { evidenceId, role: payloads.find((payload) => payload.evidenceId === evidenceId)?.role ?? "other", contentHash: evidence.contentHash, sourceReference: evidence.source.reference, location, visual: visual || intrinsicVisual, ...(payloadHash ? { visualPayloadSha256: payloadHash } : {}) };
  };
  let cleared = false;
  const clear = () => {
    if (cleared) return;
    cleared = true;
    for (const payload of payloads) {
      if (payload.bytes) payload.bytes.fill(0);
      payload.bytes = undefined;
      payload.text = undefined;
      payload.tableCells = undefined;
    }
  };
  return { normalizedEvidence: bundle.normalizedEvidence, payloads, requirements, solutionClaims, resolveCitation, clear };
}
