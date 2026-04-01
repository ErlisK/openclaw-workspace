import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/unit/**/*.test.ts"],
    exclude: ["tests/e2e/**", "tests/smoke/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["lib/**/*.ts", "hooks/**/*.ts"],
      exclude: ["lib/database.types.ts"],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
      },
    },
    testTimeout: 30_000,
    reporters: ["verbose"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
});
