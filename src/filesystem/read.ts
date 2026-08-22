import { constants } from "node:fs";
import { open as nodeOpen, stat as nodeStat, type FileHandle } from "node:fs/promises";
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
  stat(path: string): Promise<FilesystemStat>;
  open(path: string, flags: number): Promise<FilesystemDescriptor>;
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
    stat: async (path) => defaultStat(await nodeStat(path)),
    open: async (path, flags) => {
      const handle: FileHandle = await nodeOpen(path, flags);
      return {
        fstat: async () => defaultStat(await handle.stat()),
        read: async (buffer, offset, length, position) => handle.read(buffer, offset, length, position),
        close: async () => { await handle.close(); }
      };
    }
  };
}

function sameIdentity(left: FilesystemStat, right: FilesystemStat): boolean {
  return left.dev === right.dev && left.ino === right.ino && left.mode === right.mode && left.isFile === right.isFile;
}

function targetOf(authorized: AuthorizedFilesystemTarget): string {
  return authorized.resolvedPath;
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
    if (error instanceof FilesystemAccessDeniedError) throw stableError("ACCESS_DENIED", "Filesystem access denied");
    throw stableError("INTERNAL_ERROR", "Filesystem authorization failed");
  }
  const limit = MAX_BYTES[evidenceType];
  if (limit === undefined) unsupportedType(evidenceType);

  const adapter = injectedAdapter ?? defaultAdapter();
  const target = targetOf(authorized);
  let descriptor: FilesystemDescriptor | undefined;
  let failure: unknown;

  try {
    const targetStat = await adapter.stat(target);
    if (!targetStat.isFile) throw stableError("ACCESS_DENIED", "Filesystem target is not a regular file");
    if (targetStat.size > limit) throw stableError("LIMIT_EXCEEDED", "Filesystem evidence exceeds the configured size limit");

    const noFollow = "O_NOFOLLOW" in constants ? constants.O_NOFOLLOW : 0;
    try {
      descriptor = await adapter.open(target, constants.O_RDONLY | noFollow);
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "ELOOP") {
        throw stableError("ACCESS_DENIED", "Filesystem target is not authorized");
      }
      throw error;
    }
    const beforeRead = await descriptor.fstat();
    if (!beforeRead.isFile || !sameIdentity(targetStat, beforeRead)) {
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
