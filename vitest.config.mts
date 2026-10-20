import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { defineConfig } from "vitest/config";

const root = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { "server-only": root("./tests/stubs/server-only.ts") },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.ts"],
    // .env.example plus dummy secrets, so modules that import lib/env.ts load in tests.
    env: {
      ...parseEnv(readFileSync(root("./.env.example"), "utf8")),
      BETTER_AUTH_SECRET: "test-better-auth-secret-0123456789abcdef",
      IP_HASH_SECRET: "test-ip-hash-secret-0123456789abcdefghij",
    },
  },
});
