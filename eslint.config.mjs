import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    rules: {
      "no-console": "error", // use lib/logger.ts
      "react/no-danger": "error", // SECURITY.md C3
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "import/no-default-export": "error",
    },
  },
  {
    files: ["**/*.test.{ts,tsx}", "tests/**"],
    rules: { "@typescript-eslint/no-non-null-assertion": "off" },
  },
  {
    // Next.js files and tool configs must default-export.
    files: ["src/app/**", "*.config.{ts,mts,mjs}"],
    rules: { "import/no-default-export": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
