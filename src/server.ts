import { pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { registerReviewTool } from "./tools/review.js";
import { createFilesystemPolicy, parseAllowedRoots, type FilesystemRootConfig } from "./filesystem/policy.js";
import { loadProviderConfig, type ProviderConfig } from "./providers/config.js";
import { createDeepSeekProvider } from "./providers/deepseek.js";
import { ProviderError, serializeProviderError } from "./providers/errors.js";
import type { ReviewProvider } from "./providers/types.js";

export interface ServerOptions {
  allowedRoots?: readonly FilesystemRootConfig[];
  provider?: ReviewProvider;
  providerConfig?: ProviderConfig;
}

export function createServer(options: ServerOptions = {}): McpServer {
  const server = new McpServer({ name: "evidencelens", version: "0.1.3" });

  let provider = options.provider;
  let providerConfig = options.providerConfig;
  const providerDisabled = process.env.EVIDENCELENS_DISABLE_PROVIDER === "1";
  if (!provider && !providerConfig && !providerDisabled) {
    providerConfig = loadProviderConfig();
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
  const server = createServer({ allowedRoots: parseAllowedRoots(process.env.EVIDENCELENS_ALLOWED_ROOTS) });
  serveStdio(() => server);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    if (error instanceof ProviderError && error.code === "PROVIDER_CONFIGURATION") {
      const diagnostic = serializeProviderError(error);
      process.stderr.write(`${diagnostic.code}: ${diagnostic.message}\n`);
      process.exitCode = 1;
    } else {
      throw error;
    }
  }
}
