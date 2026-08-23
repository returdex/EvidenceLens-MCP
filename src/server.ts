import { pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { registerReviewTool } from "./tools/review.js";
import { createFilesystemPolicy, parseAllowedRoots, type FilesystemRootConfig } from "./filesystem/policy.js";
import { loadProviderConfig, type ProviderConfig } from "./providers/config.js";
import { createDeepSeekProvider } from "./providers/deepseek.js";
import type { ReviewProvider } from "./providers/types.js";
import { ProviderError } from "./providers/errors.js";

export interface ServerOptions {
  allowedRoots?: readonly FilesystemRootConfig[];
  provider?: ReviewProvider;
  providerConfig?: ProviderConfig;
}

export function createServer(options: ServerOptions = {}): McpServer {
  const server = new McpServer({ name: "evidencelens", version: "0.1.3" });

  let provider = options.provider;
  let providerConfig = options.providerConfig;
  if (!provider && !providerConfig) {
    try {
      providerConfig = loadProviderConfig();
    } catch (error) {
      if (!(error instanceof ProviderError) || error.code !== "PROVIDER_CONFIGURATION") throw error;
    }
  }
  if (!provider && providerConfig) provider = createDeepSeekProvider(providerConfig);

  registerReviewTool(server, {
    filesystemPolicy: createFilesystemPolicy(options.allowedRoots ?? []),
    provider,
    providerConfig
  });

  return server;
}

export async function main(): Promise<void> {
  serveStdio(() => createServer({ allowedRoots: parseAllowedRoots(process.env.EVIDENCELENS_ALLOWED_ROOTS) }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
