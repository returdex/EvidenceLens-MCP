import { pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { registerReviewTool } from "./tools/review.js";
import { createFilesystemPolicy, parseAllowedRoots, type FilesystemRootConfig } from "./filesystem/policy.js";

export interface ServerOptions {
  allowedRoots?: readonly FilesystemRootConfig[];
}

export function createServer(options: ServerOptions = {}): McpServer {
  const server = new McpServer({ name: "evidencelens", version: "0.1.1" });

  registerReviewTool(server, { filesystemPolicy: createFilesystemPolicy(options.allowedRoots ?? []) });

  return server;
}

export async function main(): Promise<void> {
  serveStdio(() => createServer({ allowedRoots: parseAllowedRoots(process.env.EVIDENCELENS_ALLOWED_ROOTS) }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
