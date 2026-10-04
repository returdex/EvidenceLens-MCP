import { pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { registerReviewTool } from "./tools/review.js";
import { createFilesystemPolicy, parseAllowedRoots, type FilesystemRootConfig } from "./filesystem/policy.js";
import { loadProviderConfig, type ProviderConfig } from "./providers/config.js";
import { createDeepSeekProvider, type DeepSeekTransport } from "./providers/deepseek.js";
import { ProviderError, serializeProviderError } from "./providers/errors.js";
import type { ReviewProvider } from "./providers/types.js";
import { createChildDiagnosticSinkFromEnvironment, type DiagnosticSink } from "./providers/diagnostics.js";
import { createProviderRequestProofFromEnvironment, type ProviderRequestProof } from "./providers/request-budget.js";

export interface ServerOptions {
  allowedRoots?: readonly FilesystemRootConfig[];
  provider?: ReviewProvider;
  providerConfig?: ProviderConfig;
  providerTransport?: DeepSeekTransport;
  diagnosticSink?: DiagnosticSink;
  providerRequestProof?: ProviderRequestProof;
}

export function createServer(options: ServerOptions = {}): McpServer {
  const server = new McpServer({ name: "evidencelens", version: "0.3.0" });

  let provider = options.provider;
  let providerConfig = options.providerConfig;
  const providerRequestProof = options.providerRequestProof ?? createProviderRequestProofFromEnvironment();
  let requestReceiptEmitted = false;
  const coordinatedProviderRequestProof = providerRequestProof === undefined ? undefined : Object.freeze({
    requestBudget: providerRequestProof.requestBudget,
    receiptSink: (receipt: Parameters<ProviderRequestProof["receiptSink"]>[0]): void => {
      providerRequestProof.receiptSink(receipt);
      requestReceiptEmitted = true;
    }
  });
  const diagnosticSink = options.diagnosticSink ?? createChildDiagnosticSinkFromEnvironment();
  const providerDisabled = process.env.EVIDENCELENS_DISABLE_PROVIDER === "1";
  if (!provider && !providerConfig && !providerDisabled) {
    providerConfig = loadProviderConfig();
  }
  if (!provider && providerConfig) provider = createDeepSeekProvider(providerConfig, options.providerTransport, diagnosticSink, coordinatedProviderRequestProof);

  registerReviewTool(server, {
    filesystemPolicy: createFilesystemPolicy(options.allowedRoots ?? []),
    provider,
    providerConfig,
    diagnosticSink,
    onRequestSettled: coordinatedProviderRequestProof === undefined ? undefined : () => {
      if (requestReceiptEmitted) return;
      coordinatedProviderRequestProof.receiptSink(coordinatedProviderRequestProof.requestBudget.receipt());
    }
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
