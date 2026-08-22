import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function readJson(path: string): Promise<Record<string, any>> {
  const contents = await readFile(path, "utf8");
  return JSON.parse(contents);
}

describe("project configuration", () => {
  it("declares the expected package identity, scripts, and MCP dependency", async () => {
    const packageJson = await readJson("package.json");

    expect(packageJson.name).toBe("evidencelens-mcp");
    expect(packageJson.version).toBe("0.1.3");
    expect(packageJson.type).toBe("module");
    expect(packageJson.scripts).toMatchObject({
      dev: "tsx src/server.ts",
      build: "tsc -p tsconfig.json",
      start: "node dist/server.js",
      test: "vitest run"
    });
    expect(packageJson.dependencies["@modelcontextprotocol/server"]).toBe("^2.0.0");
  });

  it("uses strict NodeNext TypeScript settings for source builds", async () => {
    const tsconfig = await readJson("tsconfig.json");

    expect(tsconfig.compilerOptions).toMatchObject({
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      rootDir: "src",
      outDir: "dist",
      strict: true,
      skipLibCheck: true
    });
    expect(tsconfig.include).toEqual(["src/**/*.ts"]);
  });
});
