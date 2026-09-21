#!/usr/bin/env node
import { execFile } from "node:child_process";
import { promisify } from "node:util";

export const REVIEW_SENTINEL = "EVIDENCELENS_REVIEW_PREFLIGHT_SENTINEL";
export const PROOF_SENTINEL = "EVIDENCELENS_PROOF_PREFLIGHT_SENTINEL";
const SECRET_SLOT = "<runtime-secret>";
export const CERTIFIED_LIVE_USES_PROVIDER_DEFAULT_MAX_TOKENS = true;
const execFileAsync = promisify(execFile);
const providerKeys = [
  "DEEPSEEK_API_KEY", "DEEPSEEK_BASE_URL", "DEEPSEEK_MODEL", "DEEPSEEK_TIMEOUT_MS",
  "DEEPSEEK_MAX_RETRIES", "DEEPSEEK_MAX_TOTAL_WAIT_MS", "DEEPSEEK_TEMPERATURE",
  "EVIDENCELENS_ALLOWED_ROOTS",
];

function fail(kind = "preflight") {
  throw new Error(`proof runtime ${kind} failed`);
}

function ordinary(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function occurrences(value, needle, path = [], found = []) {
  if (value === needle) found.push(path.join("."));
  else if (Array.isArray(value)) value.forEach((child, index) => occurrences(child, needle, [...path, String(index)], found));
  else if (ordinary(value)) Object.entries(value).forEach(([key, child]) => occurrences(child, needle, [...path, key], found));
  return found;
}

function safeEnvironment(baseEnvironment) {
  const allowed = ["PATH", "HOME", "DOCKER_HOST", "DOCKER_CONTEXT", "XDG_CONFIG_HOME", "TMPDIR"];
  const environment = {};
  for (const key of allowed) if (typeof baseEnvironment[key] === "string") environment[key] = baseEnvironment[key];
  environment.DEEPSEEK_API_KEY = REVIEW_SENTINEL;
  environment.EVIDENCELENS_PROOF_DEEPSEEK_API_KEY = PROOF_SENTINEL;
  return environment;
}

function normalizeList(value) {
  return Array.isArray(value) ? [...value].map(String).sort() : [];
}

function normalizeEnvironment(value) {
  if (!ordinary(value)) fail();
  if (Object.prototype.hasOwnProperty.call(value, "DEEPSEEK_MAX_TOKENS")) fail();
  const result = {};
  for (const key of providerKeys) {
    if (typeof value[key] !== "string") fail();
    result[key] = value[key];
  }
  return result;
}

function assertNoKeyLikeSurface(value, path = []) {
  if (Array.isArray(value)) return value.forEach((child, index) => assertNoKeyLikeSurface(child, [...path, String(index)]));
  if (!ordinary(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = [...path, key];
    if (/key/iu.test(key) && childPath.join(".") !== "environment.DEEPSEEK_API_KEY") fail();
    assertNoKeyLikeSurface(child, childPath);
  }
}

function normalizeService(service, name) {
  if (!ordinary(service) || !ordinary(service.environment)) fail();
  if (name === "proof" && Array.isArray(service.volumes) && service.volumes.length !== 0) fail();
  assertNoKeyLikeSurface(service);
  const environment = normalizeEnvironment(service.environment);
  const normalized = {
    entrypoint: Array.isArray(service.entrypoint) ? service.entrypoint.map(String) : ["/usr/local/bin/docker-entrypoint.sh"],
    command: Array.isArray(service.command) ? service.command.map(String) : null,
    workingDir: typeof service.working_dir === "string" ? service.working_dir : "/app",
    user: typeof service.user === "string" ? service.user : "node",
    readOnly: service.read_only === true,
    tmpfs: normalizeList(service.tmpfs),
    capDrop: normalizeList(service.cap_drop),
    securityOpt: normalizeList(service.security_opt),
    network: typeof service.network_mode === "string" ? service.network_mode : "default",
    environment,
  };
  if (normalized.entrypoint.join("\0") !== "/usr/local/bin/docker-entrypoint.sh"
    || normalized.command !== null || normalized.workingDir !== "/app" || normalized.user !== "node"
    || !normalized.readOnly || !normalized.tmpfs.includes("/tmp") || !normalized.capDrop.includes("ALL")
    || !normalized.securityOpt.includes("no-new-privileges:true")) fail();
  return normalized;
}

function assertContract(review, proof) {
  const shared = ["DEEPSEEK_BASE_URL", "DEEPSEEK_MODEL", "DEEPSEEK_TIMEOUT_MS", "DEEPSEEK_MAX_TOTAL_WAIT_MS", "DEEPSEEK_TEMPERATURE"];
  for (const key of shared) if (review.environment[key] !== proof.environment[key]) fail();
  if (proof.environment.EVIDENCELENS_ALLOWED_ROOTS !== "course=/proof-fixtures" || proof.environment.DEEPSEEK_MAX_RETRIES !== "0") fail();
  for (const key of ["entrypoint", "command", "workingDir", "user", "readOnly", "tmpfs", "capDrop", "securityOpt", "network"])
    if (JSON.stringify(review[key]) !== JSON.stringify(proof[key])) fail();
}

export async function deriveProofRuntimeSpec(runCompose = execFileAsync, baseEnvironment = process.env) {
  try {
    const { stdout } = await runCompose("docker", ["compose", "--profile", "review", "--profile", "proof", "config", "--format", "json"], {
      env: safeEnvironment(baseEnvironment), maxBuffer: 4_000_000, encoding: "utf8",
    });
    const parsed = JSON.parse(stdout);
    if (!ordinary(parsed) || !ordinary(parsed.services)) fail();
    const reviewPath = "services.review.environment.DEEPSEEK_API_KEY";
    const proofPath = "services.proof.environment.DEEPSEEK_API_KEY";
    if (occurrences(parsed, REVIEW_SENTINEL).join() !== reviewPath || occurrences(parsed, PROOF_SENTINEL).join() !== proofPath) fail();
    parsed.services.review.environment.DEEPSEEK_API_KEY = SECRET_SLOT;
    parsed.services.proof.environment.DEEPSEEK_API_KEY = SECRET_SLOT;
    const review = normalizeService(parsed.services.review, "review");
    const proof = normalizeService(parsed.services.proof, "proof");
    assertContract(review, proof);
    const result = { review, proof, composeMetadata: { proofDockerfile: "Dockerfile.proof", fixtureRoot: "/proof-fixtures", intentionalDifferences: ["image-identity", "fixture-root", "retry-zero", "no-volumes"] } };
    const serialized = JSON.stringify(result);
    if (serialized.includes(REVIEW_SENTINEL) || serialized.includes(PROOF_SENTINEL) || serialized.includes("EVIDENCELENS_PROOF_DEEPSEEK_API_KEY")) fail();
    return result;
  } catch {
    fail();
  }
}

export function proofDockerRunArgv(spec, imageId) {
  try {
    if (!ordinary(spec?.proof) || !/^sha256:[0-9a-f]{64}$/u.test(imageId)) fail("argv");
    const proof = spec.proof;
    if (JSON.stringify(proof.entrypoint) !== JSON.stringify(["/usr/local/bin/docker-entrypoint.sh"])
      || proof.command !== null || proof.workingDir !== "/app" || proof.user !== "node"
      || proof.readOnly !== true || JSON.stringify(proof.tmpfs) !== JSON.stringify(["/tmp"])
      || JSON.stringify(proof.capDrop) !== JSON.stringify(["ALL"])
      || JSON.stringify(proof.securityOpt) !== JSON.stringify(["no-new-privileges:true"])
      || proof.network !== "default" || !ordinary(proof.environment)
      || JSON.stringify(Object.keys(proof.environment).sort()) !== JSON.stringify([...providerKeys].sort())) fail("argv");
    for (const key of providerKeys) if (typeof proof.environment[key] !== "string") fail("argv");
    if (proof.environment.DEEPSEEK_API_KEY !== SECRET_SLOT
      || proof.environment.EVIDENCELENS_ALLOWED_ROOTS !== "course=/proof-fixtures"
      || proof.environment.DEEPSEEK_MAX_RETRIES !== "0") fail("argv");
    const argv = ["run", "--rm", "-i", "--read-only", "--tmpfs=/tmp", "--cap-drop=ALL", "--security-opt=no-new-privileges:true", "--network=bridge"];
    argv.push(`--workdir=${proof.workingDir}`, `--user=${proof.user}`, `--entrypoint=${proof.entrypoint[0]}`);
    for (const key of providerKeys) argv.push("--env", `${key}=${proof.environment[key]}`);
    argv.push(imageId);
    const serialized = JSON.stringify(argv);
    if (/EVIDENCELENS_(?:REVIEW|PROOF)_PREFLIGHT_SENTINEL|EVIDENCELENS_PROOF_DEEPSEEK_API_KEY|--mount|--volume|\bpull\b|\bbuild\b/u.test(serialized)) fail("argv");
    return argv;
  } catch {
    fail("argv");
  }
}
