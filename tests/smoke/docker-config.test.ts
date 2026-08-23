import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function readText(path: string): Promise<string> {
  return readFile(path, "utf8");
}

describe("Docker deployment configuration", () => {
  it("declares a single-stage non-root stdio image without secrets", async () => {
    const dockerfile = await readText("Dockerfile");

    expect(dockerfile.match(/^FROM\s+/gim)).toHaveLength(1);
    expect(dockerfile).toContain("npm ci");
    expect(dockerfile).toContain("npm run build");
    expect(dockerfile).toContain("WORKDIR /app");
    expect(dockerfile).toContain("USER node");
    expect(dockerfile).toContain('ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]');
    expect(dockerfile).not.toMatch(/COPY[^\n]*\.evidencelens\.local\.json/iu);
    expect(dockerfile).not.toMatch(/DEEPSEEK_API_KEY\s*=/iu);
  });

  it("preflights provider configuration and fails closed without fallback", async () => {
    const entrypoint = await readText("docker-entrypoint.sh");

    expect(entrypoint).toContain("loadProviderConfig");
    expect(entrypoint).toContain("EVIDENCELENS_DISABLE_PROVIDER");
    expect(entrypoint).toContain("PROVIDER_CONFIGURATION");
    expect(entrypoint).toContain("DEEPSEEK_API_KEY");
    expect(entrypoint).toContain("process.exitCode = 1");
    expect(entrypoint).toContain("exit 1");
    expect(entrypoint).toContain("exec node dist/server.js");
    expect(entrypoint).not.toMatch(/fallback|deterministic/iu);
    expect(entrypoint).not.toMatch(/console\.error\(error|stack|request|upstream/iu);
  });

  it("locks offline, credentialed, and mounted-file Compose boundaries", async () => {
    const compose = await readText("compose.yaml");
    const reviewSection = compose.split("\n  review:\n", 2)[1]?.split("\n  review-file:\n", 1)[0] ?? "";

    expect(compose).toContain("smoke:");
    expect(compose).toContain("review:");
    expect(compose).toContain("review-file:");
    expect(compose).toContain('EVIDENCELENS_ALLOWED_ROOTS: "course=/workspace"');
    expect(compose).toContain('EVIDENCELENS_DISABLE_PROVIDER: "1"');
    expect(compose).toContain("DEEPSEEK_API_KEY:");
    expect(compose).toContain("target: /workspace");
    expect(compose).toContain("read_only: true");
    expect(compose).toContain("tmpfs:");
    expect(compose).toContain("- /tmp");
    expect(compose).toContain("cap_drop:");
    expect(compose).toContain("- ALL");
    expect(compose).toContain("no-new-privileges:true");
    expect(compose).toContain("network_mode: none");
    expect(compose).toContain("target: /app/.evidencelens.local.json");
    expect(compose).toContain("EVIDENCELENS_CONFIG_FILE=./.evidencelens.local.json");
    expect(compose).toContain("working_dir: /app");
    expect(compose).not.toMatch(/privileged\s*:\s*true/iu);
    expect(compose).not.toMatch(/network_mode:\s*host/iu);
    expect(compose).not.toMatch(/\/var\/run\/docker\.sock/iu);
    expect(compose).not.toMatch(/target:\s*\/workspace\s*\n\s*read_only:\s*false/iu);
    expect(reviewSection).not.toContain("EVIDENCELENS_DISABLE_PROVIDER");
    expect(compose).not.toMatch(/DEEPSEEK_API_KEY\s*:\s*['"](?:sk-|dummy|test|replace)/iu);
  });

  it("keeps the build context free of local credentials while retaining fixtures", async () => {
    const dockerignore = await readText(".dockerignore");

    expect(dockerignore).toContain(".evidencelens.local.json");
    expect(dockerignore).toContain(".env");
    expect(dockerignore).toContain("node_modules");
    expect(dockerignore).toContain(".planning");
    expect(dockerignore).not.toMatch(/^tests\/?$/m);
    expect(dockerignore).not.toMatch(/^tests\/fixtures(?:\/|$)/m);
  });
});
