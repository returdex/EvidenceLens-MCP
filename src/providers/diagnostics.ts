import { createHmac, timingSafeEqual } from "node:crypto";

export const CHILD_DIAGNOSTIC_SCHEMA = "evidencelens.child-diagnostic.v1" as const;
export const CHILD_DIAGNOSTIC_PREFIX = "[evidencelens-child-diagnostic] " as const;
export const CHILD_DIAGNOSTIC_MAX_BYTES = 4096;
export const CHILD_DIAGNOSTIC_GENERATION_ENV = "EVIDENCELENS_DIAGNOSTIC_GENERATION" as const;
export const CHILD_DIAGNOSTIC_KEY_ENV = "EVIDENCELENS_DIAGNOSTIC_KEY" as const;

export type DiagnosticPath = readonly (string | number)[];
export interface DiagnosticFeature { readonly path: DiagnosticPath; readonly code: string }
export interface DiagnosticSink { emit(feature: DiagnosticFeature): boolean }

const featureSpecs = [
  [["provider", "transport", "fetch"], "dns"],
  [["provider", "transport", "fetch"], "tls"],
  [["provider", "transport", "fetch"], "connection"],
  [["provider", "transport", "fetch"], "network_timeout"],
  [["provider", "transport", "fetch"], "timeout"],
  [["provider", "transport", "fetch"], "http_error"],
  [["provider", "transport", "fetch"], "rate_limited"],
  [["provider", "transport", "fetch"], "server_error"],
  [["provider", "transport", "fetch"], "retry_budget"],
  [["provider", "http", "json"], "invalid_format"],
  [["provider", "choices"], "too_small"],
  [["provider", "message", "content"], "invalid_type"],
  [["provider", "message", "reasoning_content"], "invalid_type"],
  [["provider", "content", "bytes"], "too_big"],
  [["provider", "content", "object"], "invalid_format"],
  [["findings"], "too_small"],
  [["findings", "keyset"], "unrecognized_keys"],
  [["findings", "id"], "invalid_type"],
  [["findings", "type"], "invalid_value"],
  [["findings", "enum"], "invalid_value"],
  [["findings", "text"], "too_big"],
  [["findings", "followUpChecks"], "too_small"],
  [["findings", "evidenceIds"], "custom"],
  [["findings", "citations"], "custom"],
  [["citations", "evidenceId"], "invalid_value"],
  [["citations", "location"], "invalid_value"],
  [["citations", "contentHash"], "invalid_value"],
  [["citations", "sourceReference"], "invalid_value"],
  [["citations", "visual"], "custom"],
  [["provenance", "order"], "custom"],
  [["provenance", "unique"], "custom"],
  [["metadata", "provider", "name"], "invalid_value"],
  [["metadata", "provider", "model"], "invalid_value"],
  [["disclosure", "key"], "custom"],
  [["orchestration", "object"], "invalid_type"],
  [["orchestration", "keyset"], "unrecognized_keys"],
  [["orchestration", "schema"], "custom"],
  [["orchestration", "identity"], "custom"],
  [["orchestration", "namespace"], "custom"],
  [["orchestration", "collision"], "custom"],
  [["orchestration", "merged"], "custom"]
] as const satisfies readonly (readonly [DiagnosticPath, string])[];

const canonicalFeature = (feature: DiagnosticFeature): string => JSON.stringify({ path: feature.path, code: feature.code });
const allowedFeatures = new Set(featureSpecs.map(([path, code]) => canonicalFeature({ path, code })));
const noOpSink: DiagnosticSink = Object.freeze({ emit: () => false });

interface UnsignedDiagnosticFrame {
  schema: typeof CHILD_DIAGNOSTIC_SCHEMA;
  generation: string;
  sequence: 1;
  path: (string | number)[];
  code: string;
}

interface DiagnosticFrame extends UnsignedDiagnosticFrame { mac: string }

function validGeneration(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

function validKey(value: Uint8Array): boolean { return value.byteLength === 32; }

function macFor(frame: UnsignedDiagnosticFrame, key: Uint8Array): string {
  return createHmac("sha256", key).update(JSON.stringify(frame)).digest("hex");
}

function authenticate(actual: string, expected: string): boolean {
  if (!/^[a-f0-9]{64}$/u.test(actual) || !/^[a-f0-9]{64}$/u.test(expected)) return false;
  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

function isExactFrame(value: unknown): value is DiagnosticFrame {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const object = value as Record<string, unknown>;
  const keys = Object.keys(object);
  return keys.length === 6
    && keys.every((key, index) => key === ["schema", "generation", "sequence", "path", "code", "mac"][index])
    && object.schema === CHILD_DIAGNOSTIC_SCHEMA
    && validGeneration(object.generation)
    && object.sequence === 1
    && Array.isArray(object.path)
    && object.path.every((part) => typeof part === "string" || (Number.isSafeInteger(part) && (part as number) >= 0))
    && typeof object.code === "string"
    && typeof object.mac === "string";
}

export function createChildDiagnosticSink(options: {
  generation: string;
  key: Uint8Array;
  write: (value: string) => void;
}): DiagnosticSink {
  if (!validGeneration(options.generation) || !validKey(options.key)) return noOpSink;
  const ownedKey = Buffer.from(options.key);
  let emitted = false;
  return Object.freeze({
    emit(feature: DiagnosticFeature): boolean {
      if (emitted || !allowedFeatures.has(canonicalFeature(feature))) return false;
      const unsigned: UnsignedDiagnosticFrame = {
        schema: CHILD_DIAGNOSTIC_SCHEMA,
        generation: options.generation,
        sequence: 1,
        path: [...feature.path],
        code: feature.code
      };
      const line = `${CHILD_DIAGNOSTIC_PREFIX}${JSON.stringify({ ...unsigned, mac: macFor(unsigned, ownedKey) })}\n`;
      if (Buffer.byteLength(line) > CHILD_DIAGNOSTIC_MAX_BYTES) return false;
      emitted = true;
      try { options.write(line); } finally { ownedKey.fill(0); }
      return true;
    }
  });
}

export function createChildDiagnosticSinkFromEnvironment(
  environment: Record<string, string | undefined> = process.env,
  write: (value: string) => void = (value) => { process.stderr.write(value); }
): DiagnosticSink {
  const generation = environment[CHILD_DIAGNOSTIC_GENERATION_ENV];
  const encodedKey = environment[CHILD_DIAGNOSTIC_KEY_ENV];
  delete environment[CHILD_DIAGNOSTIC_GENERATION_ENV];
  delete environment[CHILD_DIAGNOSTIC_KEY_ENV];
  if (!validGeneration(generation) || typeof encodedKey !== "string" || !/^[a-f0-9]{64}$/u.test(encodedKey)) return noOpSink;
  const key = Buffer.from(encodedKey, "hex");
  try { return createChildDiagnosticSink({ generation, key, write }); } finally { key.fill(0); }
}

export function parseChildDiagnosticFrame(
  stderr: string,
  expected: { generation: string; key: Uint8Array }
): DiagnosticFeature | undefined {
  if (!validGeneration(expected.generation) || !validKey(expected.key)) return undefined;
  const lines = stderr.split("\n").filter((line) => line.startsWith(CHILD_DIAGNOSTIC_PREFIX));
  if (lines.length !== 1 || Buffer.byteLength(`${lines[0]}\n`) > CHILD_DIAGNOSTIC_MAX_BYTES) return undefined;
  let decoded: unknown;
  try { decoded = JSON.parse(lines[0]!.slice(CHILD_DIAGNOSTIC_PREFIX.length)); } catch { return undefined; }
  if (!isExactFrame(decoded) || decoded.generation !== expected.generation) return undefined;
  const unsigned: UnsignedDiagnosticFrame = {
    schema: decoded.schema,
    generation: decoded.generation,
    sequence: decoded.sequence,
    path: decoded.path,
    code: decoded.code
  };
  if (!allowedFeatures.has(canonicalFeature(unsigned)) || !authenticate(decoded.mac, macFor(unsigned, expected.key))) return undefined;
  return { path: [...unsigned.path], code: unsigned.code };
}
