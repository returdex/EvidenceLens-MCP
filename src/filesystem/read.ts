import { constants } from "node:fs";
import { lstat as nodeLstat, open as nodeOpen, type FileHandle } from "node:fs/promises";
import type { Stats } from "node:fs";
import type { EvidenceType, FilesystemSource } from "../contracts/review.js";
import { EvidenceLensError } from "../errors.js";
import { MAX_IMAGE_BYTES, MAX_PDF_BYTES, MAX_TABLE_BYTES, MAX_TEXT_BYTES } from "../evidence/limits.js";
import { FilesystemAccessDeniedError, type AuthorizedFilesystemTarget, type FilesystemPolicy } from "./policy.js";

export interface FilesystemStat {
  dev: number | bigint;
  ino: number | bigint;
  mode: number;
  size: number;
  isFile: boolean;
}

export interface FilesystemDescriptor {
  fstat(): Promise<FilesystemStat>;
  read(buffer: Buffer, offset: number, length: number, position: number): Promise<{ bytesRead: number }>;
  close(): Promise<void>;
}

export interface FilesystemReadAdapter {
  stat?: (path: string) => Promise<FilesystemStat>;
  open?: (path: string, flags: number) => Promise<FilesystemDescriptor>;
  openAnchored?: (rootDescriptor: number, relativePath: string, flags: number, rootPath?: string) => Promise<FilesystemDescriptor>;
}

export interface FilesystemReadResult {
  bytes: Buffer;
  rootId: string;
  relativePath: string;
  provenanceReference: `filesystem://${string}`;
}

const MAX_BYTES: Record<EvidenceType, number> = {
  text: MAX_TEXT_BYTES,
  table: MAX_TABLE_BYTES,
  pdf: MAX_PDF_BYTES,
  image: MAX_IMAGE_BYTES,
  screenshot: MAX_IMAGE_BYTES
};

const stableError = (code: ConstructorParameters<typeof EvidenceLensError>[0], message: string): EvidenceLensError =>
  new EvidenceLensError(code, message);

function defaultStat(stats: Stats): FilesystemStat {
  return { dev: stats.dev, ino: stats.ino, mode: stats.mode, size: stats.size, isFile: stats.isFile() };
}

function defaultAdapter(): FilesystemReadAdapter {
  return {
    openAnchored: async (rootDescriptor, relativePath, flags, rootPath) => {
      const components = relativePath.split("/");
      if (components.some((component) => component === "" || component === "." || component === "..")) {
        throw new Error("Invalid anchored filesystem path");
      }

      if (process.platform === "darwin") {
        // Darwin's Node API has no openat/openat2 binding. Reject symlinked
        // components immediately after resolving the already-open root fd;
        // Linux uses the stronger fd-relative walk below.
        if (rootPath === undefined) throw new Error("Missing anchored filesystem root");
        let currentPath = rootPath;
        for (const component of components) {
          currentPath = `${currentPath}/${component}`;
          const componentStat = await nodeLstat(currentPath);
          if (componentStat.isSymbolicLink()) throw new Error("Symlinked filesystem component");
        }
        const file = await nodeOpen(currentPath, flags | (constants.O_NOFOLLOW ?? 0));
        return {
          fstat: async () => defaultStat(await file.stat()),
          read: async (buffer, offset, length, position) => file.read(buffer, offset, length, position),
          close: async () => { await file.close(); }
        };
      }
      if (process.platform !== "linux") throw new Error("Anchored filesystem reads are unavailable on this platform");

      let directory: FileHandle | undefined;
      try {
        directory = await nodeOpen(`/proc/self/fd/${rootDescriptor}`, constants.O_RDONLY | (constants.O_DIRECTORY ?? 0) | (constants.O_NOFOLLOW ?? 0));
        for (const component of components.slice(0, -1)) {
          const next = await nodeOpen(`/proc/self/fd/${directory.fd}/${component}`, constants.O_RDONLY | (constants.O_DIRECTORY ?? 0) | (constants.O_NOFOLLOW ?? 0));
          await directory.close();
          directory = next;
        }

        const leaf = components[components.length - 1];
        if (leaf === undefined) throw new Error("Invalid anchored filesystem path");
        const file = await nodeOpen(`/proc/self/fd/${directory.fd}/${leaf}`, flags | (constants.O_NOFOLLOW ?? 0));
        await directory.close();
        directory = undefined;
        return {
          fstat: async () => defaultStat(await file.stat()),
          read: async (buffer, offset, length, position) => file.read(buffer, offset, length, position),
          close: async () => { await file.close(); }
        };
      } finally {
        if (directory !== undefined) await directory.close();
      }
    }
  };
}

function sameIdentity(left: FilesystemStat, right: FilesystemStat): boolean {
  return left.dev === right.dev && left.ino === right.ino && left.mode === right.mode && left.isFile === right.isFile;
}

function unsupportedType(type: EvidenceType): never {
  throw stableError("UNSUPPORTED_FORMAT", `Unsupported evidence format: ${String(type)}`);
}

export async function readFilesystemEvidence(
  policy: FilesystemPolicy,
  source: FilesystemSource,
  evidenceType: EvidenceType,
  injectedAdapter?: FilesystemReadAdapter
): Promise<FilesystemReadResult> {
  let authorized: AuthorizedFilesystemTarget;
  try {
    authorized = await policy.authorize(source);
  } catch (error) {
    if (error instanceof EvidenceLensError) throw error;
    if (error instanceof FilesystemAccessDeniedError) throw stableError("ACCESS_DENIED", "Filesystem access denied");
    throw stableError("INTERNAL_ERROR", "Filesystem authorization failed");
  }
  const limit = MAX_BYTES[evidenceType];
  if (limit === undefined) unsupportedType(evidenceType);

  const adapter = injectedAdapter ?? defaultAdapter();
  let descriptor: FilesystemDescriptor | undefined;
  let targetStat: FilesystemStat | undefined;
  let failure: unknown;

  try {
    try {
      if (authorized.rootDescriptor !== undefined && adapter.openAnchored !== undefined) {
        descriptor = await adapter.openAnchored(authorized.rootDescriptor, authorized.relativePath, constants.O_RDONLY, authorized.rootPath);
      } else if (authorized.rootDescriptor === undefined && adapter.stat !== undefined && adapter.open !== undefined) {
        targetStat = await adapter.stat(authorized.resolvedPath);
        if (!targetStat.isFile) throw stableError("ACCESS_DENIED", "Filesystem target is not a regular file");
        if (targetStat.size > limit) throw stableError("LIMIT_EXCEEDED", "Filesystem evidence exceeds the configured size limit");
        descriptor = await adapter.open(authorized.resolvedPath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
      } else {
        throw stableError("ACCESS_DENIED", "Filesystem target is not authorized");
      }
    } catch (error) {
      if (error instanceof EvidenceLensError) throw error;
      if (authorized.rootDescriptor !== undefined) {
        throw stableError("ACCESS_DENIED", "Filesystem target is not authorized");
      }
      if (typeof error === "object" && error !== null && "code" in error && ["EACCES", "ELOOP", "ENOENT", "ENOTDIR"].includes(String(error.code))) {
        throw stableError("ACCESS_DENIED", "Filesystem target is not authorized");
      }
      throw error;
    }
    if (descriptor === undefined) throw stableError("ACCESS_DENIED", "Filesystem target is not authorized");
    const beforeRead = await descriptor.fstat();
    if (!beforeRead.isFile) throw stableError("ACCESS_DENIED", "Filesystem target is not a regular file");
    if (targetStat !== undefined && !sameIdentity(targetStat, beforeRead)) {
      throw stableError("ACCESS_DENIED", "Filesystem target changed before reading");
    }
    if (beforeRead.size > limit) throw stableError("LIMIT_EXCEEDED", "Filesystem evidence exceeds the configured size limit");

    const bytes = Buffer.allocUnsafe(beforeRead.size);
    let offset = 0;
    while (offset < bytes.byteLength) {
      const read = await descriptor.read(bytes, offset, bytes.byteLength - offset, offset);
      if (read.bytesRead <= 0 || read.bytesRead > bytes.byteLength - offset) {
        throw stableError("INTERNAL_ERROR", "Filesystem read was incomplete");
      }
      offset += read.bytesRead;
    }

    const afterRead = await descriptor.fstat();
    if (!afterRead.isFile || !sameIdentity(beforeRead, afterRead) || afterRead.size !== beforeRead.size || offset !== afterRead.size) {
      throw stableError("INTERNAL_ERROR", "Filesystem target changed while reading");
    }

    return {
      bytes,
      rootId: authorized.rootId,
      relativePath: authorized.relativePath,
      provenanceReference: `filesystem://${authorized.rootId}/${authorized.relativePath}`
    };
  } catch (error) {
    failure = error;
    if (error instanceof EvidenceLensError) throw error;
    throw stableError("PROVIDER_FAILURE", "Filesystem read failed");
  } finally {
    if (descriptor !== undefined) {
      try {
        await descriptor.close();
      } catch (closeError) {
        if (failure === undefined) throw stableError("PROVIDER_FAILURE", "Filesystem descriptor could not be closed");
      }
    }
  }
}
