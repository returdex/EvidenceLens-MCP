#!/usr/bin/env node
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { constants as fsConstants, watch } from "node:fs";
import { chmod, lstat, mkdir, mkdtemp, open, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const MAX_ARCHIVE_ENTRIES = 20_000;
const MAX_ARCHIVE_BYTES = 512 * 1024 * 1024;
const SAFE_MODES = new Set(["100644", "100755"]);
const SECRET_PATH = ".evidencelens.local.json";
const utf8 = new TextDecoder("utf-8", { fatal: true });

function fail(code) { throw new Error(code); }
function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function field(bytes) {
  const value = Buffer.isBuffer(bytes) ? bytes : Buffer.from(String(bytes), "utf8");
  return Buffer.concat([Buffer.from(`${value.length}:`, "ascii"), value]);
}

function validatePath(path) {
  if (!path || path === "." || path.startsWith("/") || path.includes("\\") || path.includes("\0")) fail("SOURCE_SET_UNSAFE_PATH");
  if (path !== path.normalize("NFC")) fail("SOURCE_SET_UNSAFE_PATH");
  const parts = path.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) fail("SOURCE_SET_UNSAFE_PATH");
  if (path === SECRET_PATH) fail("SOURCE_SET_SECRET_PATH");
  return path;
}

async function git(repoDir, args, options = {}) {
  return execFileAsync("git", args, { cwd: repoDir, encoding: null, maxBuffer: MAX_ARCHIVE_BYTES + 1024, ...options });
}

function aggregate(entries) {
  const chunks = [field("NON_PLANNING_TREE_V1"), field(entries.length)];
  for (const entry of entries) {
    chunks.push(field(entry.path), field(entry.mode), field(entry.objectId), field(entry.byteLength), field(entry.sha256));
  }
  return sha256(Buffer.concat(chunks));
}

export async function createNonPlanningManifest({ repoDir, reviewedCommit }) {
  const root = resolve(repoDir);
  const resolvedCommit = (await git(root, ["rev-parse", "--verify", `${reviewedCommit}^{commit}`])).stdout.toString("utf8").trim();
  if (!/^[0-9a-f]{40,64}$/u.test(resolvedCommit)) fail("SOURCE_SET_BAD_COMMIT");
  const raw = (await git(root, ["ls-tree", "-r", "-z", "--full-tree", resolvedCommit])).stdout;
  if (raw.length > 0 && raw[raw.length - 1] !== 0) fail("SOURCE_SET_BAD_TREE");
  const records = [];
  for (let start = 0; start < raw.length - 1;) {
    const end = raw.indexOf(0, start);
    if (end < 0) fail("SOURCE_SET_BAD_TREE");
    try { records.push(utf8.decode(raw.subarray(start, end))); } catch { fail("SOURCE_SET_UNSAFE_PATH"); }
    start = end + 1;
  }
  const entries = [];
  const seen = new Set();
  for (const record of records) {
    const match = /^(\d{6}) (\S+) ([0-9a-f]{40,64})\t([\s\S]+)$/u.exec(record);
    if (!match) fail("SOURCE_SET_BAD_TREE");
    const [, mode, type, objectId, rawPath] = match;
    const path = validatePath(rawPath);
    if (path === ".planning" || path.startsWith(".planning/")) continue;
    if (type !== "blob" || !SAFE_MODES.has(mode)) fail("SOURCE_SET_UNSAFE_MODE");
    if (seen.has(path)) fail("SOURCE_SET_DUPLICATE_PATH");
    seen.add(path);
    const bytes = (await git(root, ["cat-file", "blob", objectId])).stdout;
    entries.push({ path, mode, objectId, byteLength: bytes.length, sha256: sha256(bytes) });
  }
  entries.sort((a, b) => Buffer.compare(Buffer.from(a.path, "utf8"), Buffer.from(b.path, "utf8")));
  return { reviewedCommit: resolvedCommit, entries, nonPlanningTree: aggregate(entries) };
}

async function assertNoTrackedDrift(repoDir, reviewedCommit) {
  const result = await git(repoDir, ["diff", "--name-only", "-z", reviewedCommit, "--", ".", ":(exclude).planning", ":(exclude).planning/**"]);
  if (result.stdout.length) fail("SOURCE_SET_TRACKED_DRIFT");
}

async function assertInputsTracked(repoDir, inputs) {
  for (const rawPath of inputs) {
    const path = validatePath(rawPath);
    if (path.startsWith(".planning/") || path === SECRET_PATH) fail("SOURCE_SET_RELEVANT_UNTRACKED");
    try { await git(repoDir, ["ls-files", "--error-unmatch", "--", path]); }
    catch { fail("SOURCE_SET_RELEVANT_UNTRACKED"); }
  }
}

function parseOctal(bytes, code) {
  const text = bytes.toString("ascii").replace(/\0.*$/u, "").trim();
  if (!/^[0-7]+$/u.test(text)) fail(code);
  return Number.parseInt(text, 8);
}

function tarString(header, start, length) {
  const bytes = header.subarray(start, start + length);
  const end = bytes.indexOf(0);
  return bytes.subarray(0, end < 0 ? bytes.length : end).toString("utf8");
}

async function extractGitTar(tar, destination) {
  if (tar.length > MAX_ARCHIVE_BYTES) fail("SOURCE_SET_ARCHIVE_LIMIT");
  const files = new Map();
  let offset = 0;
  let count = 0;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    count += 1;
    if (count > MAX_ARCHIVE_ENTRIES) fail("SOURCE_SET_ARCHIVE_LIMIT");
    const storedChecksum = parseOctal(header.subarray(148, 156), "SOURCE_SET_BAD_ARCHIVE");
    const checksumHeader = Buffer.from(header); checksumHeader.fill(0x20, 148, 156);
    if (checksumHeader.reduce((sum, byte) => sum + byte, 0) !== storedChecksum) fail("SOURCE_SET_BAD_ARCHIVE");
    const prefix = tarString(header, 345, 155);
    const name = tarString(header, 0, 100);
    const archiveName = (prefix ? `${prefix}/${name}` : name).replace(/\/$/u, "");
    const path = validatePath(archiveName);
    const size = parseOctal(header.subarray(124, 136), "SOURCE_SET_BAD_ARCHIVE");
    const type = String.fromCharCode(header[156] || 0x30);
    const dataStart = offset + 512;
    const dataEnd = dataStart + size;
    if (!Number.isSafeInteger(size) || dataEnd > tar.length) fail("SOURCE_SET_BAD_ARCHIVE");
    if (path === ".planning" || path.startsWith(".planning/")) fail("SOURCE_SET_PLANNING_ARCHIVE");
    if (type === "g") {
      // git archive's bounded global PAX comment identifies the source commit.
      if (size > 256 || !tar.subarray(dataStart, dataEnd).toString("utf8").startsWith("52 comment=")) fail("SOURCE_SET_BAD_ARCHIVE");
    } else if (type === "5") {
      await mkdir(join(destination, path), { recursive: true, mode: 0o700 });
    } else if (type === "0" || type === "\0") {
      if (files.has(path)) fail("SOURCE_SET_DUPLICATE_PATH");
      const target = resolve(destination, path);
      if (!target.startsWith(`${resolve(destination)}${sep}`)) fail("SOURCE_SET_UNSAFE_PATH");
      await mkdir(dirname(target), { recursive: true, mode: 0o700 });
      const handle = await open(target, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW, 0o600);
      try { await handle.writeFile(tar.subarray(dataStart, dataEnd)); } finally { await handle.close(); }
      const mode = parseOctal(header.subarray(100, 108), "SOURCE_SET_BAD_ARCHIVE") & 0o777;
      await chmod(target, mode === 0o755 ? 0o755 : 0o644);
      files.set(path, { path, mode: mode === 0o755 ? "100755" : "100644", byteLength: size, sha256: sha256(tar.subarray(dataStart, dataEnd)) });
    } else fail("SOURCE_SET_UNSAFE_ARCHIVE_TYPE");
    offset = dataStart + Math.ceil(size / 512) * 512;
  }
  return files;
}

async function inventoryContext(contextPath) {
  const files = new Map();
  async function walk(directory, prefix = "") {
    const names = await readdir(directory);
    names.sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
    for (const name of names) {
      const path = prefix ? `${prefix}/${name}` : name;
      validatePath(path);
      const absolute = join(directory, name);
      const stat = await lstat(absolute);
      if (stat.isDirectory()) await walk(absolute, path);
      else if (stat.isFile()) {
        const handle = await open(absolute, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
        let bytes; try { bytes = await handle.readFile(); } finally { await handle.close(); }
        files.set(path, { path, mode: stat.mode & 0o111 ? "100755" : "100644", byteLength: bytes.length, sha256: sha256(bytes) });
      } else fail("SOURCE_SET_UNSAFE_SNAPSHOT_TYPE");
    }
  }
  await walk(contextPath);
  return files;
}

function assertInventory(manifest, inventory, code) {
  if (inventory.size !== manifest.entries.length) fail(code);
  for (const expected of manifest.entries) {
    const actual = inventory.get(expected.path);
    if (!actual || actual.mode !== expected.mode || actual.byteLength !== expected.byteLength || actual.sha256 !== expected.sha256) fail(code);
  }
}

export async function verifyPrivateContext(snapshot) {
  if (snapshot.tainted?.()) fail("SOURCE_SET_SNAPSHOT_DRIFT");
  const inventory = await inventoryContext(snapshot.contextPath);
  assertInventory(snapshot.manifest, inventory, "SOURCE_SET_SNAPSHOT_DRIFT");
  if (snapshot.tainted?.()) fail("SOURCE_SET_SNAPSHOT_DRIFT");
  return true;
}

async function monitorTree(contextPath) {
  let changed = false;
  const watchers = [];
  async function add(directory) {
    watchers.push(watch(directory, { persistent: false }, () => { changed = true; }));
    for (const name of await readdir(directory)) {
      const absolute = join(directory, name);
      if ((await lstat(absolute)).isDirectory()) await add(absolute);
    }
  }
  await add(contextPath);
  return { tainted: () => changed, close: () => watchers.forEach((entry) => entry.close()) };
}

export async function runWithVerifiedPrivateContext(snapshot, operation) {
  await verifyPrivateContext(snapshot);
  const result = await operation({ contextPath: snapshot.contextPath, dockerfilePath: snapshot.dockerfilePath });
  await verifyPrivateContext(snapshot);
  return result;
}

export async function materializePrivateContext({ repoDir, reviewedCommit, preArchiveInputs = [] }) {
  const root = resolve(repoDir);
  await assertNoTrackedDrift(root, reviewedCommit);
  await assertInputsTracked(root, preArchiveInputs);
  const manifest = await createNonPlanningManifest({ repoDir: root, reviewedCommit });
  const privateRoot = await mkdtemp(join(tmpdir(), "evidencelens-proof-"));
  await chmod(privateRoot, 0o700);
  const contextPath = join(privateRoot, "context");
  await mkdir(contextPath, { mode: 0o700 });
  let valid = true;
  let monitor;
  const cleanup = async () => {
    if (!valid || !privateRoot.startsWith(join(tmpdir(), "evidencelens-proof-"))) fail("SOURCE_SET_CLEANUP_REFUSED");
    valid = false;
    monitor?.close();
    await rm(privateRoot, { recursive: true, force: true });
  };
  try {
    const tar = (await git(root, ["archive", "--format=tar", manifest.reviewedCommit, "--", ".", ":(exclude).planning", ":(exclude).planning/**"])).stdout;
    const extracted = await extractGitTar(tar, contextPath);
    assertInventory(manifest, extracted, "SOURCE_SET_ARCHIVE_MISMATCH");
    await verifyPrivateContext({ contextPath, manifest });
    monitor = await monitorTree(contextPath);
    return { reviewedCommit: manifest.reviewedCommit, nonPlanningTree: manifest.nonPlanningTree, manifest, contextPath, dockerfilePath: join(contextPath, "Dockerfile.proof"), tainted: monitor.tainted, cleanup };
  } catch (error) {
    await cleanup().catch(() => undefined);
    throw error;
  }
}
