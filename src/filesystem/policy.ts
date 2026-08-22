import { accessSync, constants, fstatSync, openSync, realpathSync, statSync, type Stats } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { filesystemSourceSchema, type FilesystemSource } from "../contracts/review.js";

const ROOT_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,31}$/u;
const CONFIGURATION_ERROR = "Invalid filesystem root configuration";
const ACCESS_DENIED_ERROR = "Filesystem source is not authorized";

export interface FilesystemRootConfig {
  id: string;
  path: string;
}

export interface FilesystemPrimitives {
  realpathSync: (path: string) => string;
  statSync: (path: string) => Pick<Stats, "isDirectory">;
  accessSync: (path: string, mode?: number) => void;
}

export interface AuthorizedFilesystemTarget {
  rootId: string;
  relativePath: string;
  resolvedPath: string;
  reference: string;
  rootDescriptor?: number;
}

export interface FilesystemPolicy {
  authorize(source: FilesystemSource): AuthorizedFilesystemTarget;
}

export class FilesystemConfigurationError extends Error {
  constructor() {
    super(CONFIGURATION_ERROR);
    this.name = "FilesystemConfigurationError";
  }
}

export class FilesystemAccessDeniedError extends Error {
  constructor() {
    super(ACCESS_DENIED_ERROR);
    this.name = "FilesystemAccessDeniedError";
  }
}

function configurationFailure(): never {
  throw new FilesystemConfigurationError();
}

function accessDenied(): never {
  throw new FilesystemAccessDeniedError();
}

function defaultPrimitives(): FilesystemPrimitives {
  return { realpathSync, statSync, accessSync };
}

export function parseAllowedRoots(raw: string | undefined): FilesystemRootConfig[] {
  if (raw === undefined || raw.trim() === "") return [];

  const entries = raw.split(/[,;]/u);
  if (entries.some((entry) => entry.trim() === "")) configurationFailure();

  return entries.map((rawEntry) => {
    const entry = rawEntry.trim();
    const separator = entry.indexOf("=");
    if (separator <= 0 || separator !== entry.lastIndexOf("=")) configurationFailure();

    const id = entry.slice(0, separator);
    const path = entry.slice(separator + 1);
    if (!ROOT_ID_PATTERN.test(id) || path.length === 0 || !isAbsolute(path)) configurationFailure();
    return { id, path };
  });
}

function normalizedRelativePath(rootPath: string, targetPath: string): string {
  const candidate = relative(rootPath, targetPath);
  if (candidate === "" || candidate === "." || candidate.startsWith(".." + sep) || isAbsolute(candidate) || candidate === "..") {
    accessDenied();
  }
  return candidate.split(sep).join("/");
}

export function createFilesystemPolicy(
  roots: readonly FilesystemRootConfig[],
  injectedPrimitives?: FilesystemPrimitives
): FilesystemPolicy {
  const primitives = injectedPrimitives ?? defaultPrimitives();
  const canonicalRoots = new Map<string, { id: string; path: string; descriptor?: number }>();
  const canonicalPaths = new Set<string>();

  try {
    for (const root of roots) {
      if (!ROOT_ID_PATTERN.test(root.id) || root.path.length === 0 || !isAbsolute(root.path) || canonicalRoots.has(root.id)) {
        configurationFailure();
      }

      const canonicalPath = primitives.realpathSync(root.path);
      primitives.accessSync(canonicalPath, constants.R_OK);
      if (!primitives.statSync(canonicalPath).isDirectory() || canonicalPaths.has(canonicalPath)) configurationFailure();
      const descriptor = injectedPrimitives === undefined
        ? openSync(canonicalPath, constants.O_RDONLY | (constants.O_DIRECTORY ?? 0) | (constants.O_NOFOLLOW ?? 0))
        : undefined;
      if (descriptor !== undefined && !fstatSync(descriptor).isDirectory()) configurationFailure();
      canonicalRoots.set(root.id, { id: root.id, path: canonicalPath, descriptor });
      canonicalPaths.add(canonicalPath);
    }
  } catch (error) {
    if (error instanceof FilesystemConfigurationError) throw error;
    configurationFailure();
  }

  return {
    authorize(source: FilesystemSource): AuthorizedFilesystemTarget {
      const parsed = filesystemSourceSchema.safeParse(source);
      if (!parsed.success) accessDenied();

      const root = canonicalRoots.get(parsed.data.rootId);
      if (root === undefined) accessDenied();

      try {
        const lexicalTarget = resolve(root.path, ...parsed.data.relativePath.split("/"));
        const resolvedPath = primitives.realpathSync(lexicalTarget);
        const safeRelativePath = normalizedRelativePath(root.path, resolvedPath);
        if (primitives.statSync(resolvedPath).isDirectory()) accessDenied();
        return {
          rootId: root.id,
          relativePath: safeRelativePath,
          resolvedPath,
          reference: `filesystem://${root.id}/${safeRelativePath}`,
          rootDescriptor: root.descriptor
        };
      } catch (error) {
        if (error instanceof FilesystemAccessDeniedError) throw error;
        accessDenied();
      }
    }
  };
}

export type { FilesystemSource } from "../contracts/review.js";
