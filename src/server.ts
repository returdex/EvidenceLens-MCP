import { pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { registerReviewTool } from "./tools/review.js";

export function createServer(): McpServer {
  const server = new McpServer({ name: "evidencelens", version: "0.1.0" });

  registerReviewTool(server);

  return server;
}

export async function main(): Promise<void> {
  serveStdio(() => createServer());
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
