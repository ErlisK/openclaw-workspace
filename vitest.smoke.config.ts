import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/smoke/**/*.test.ts"],
    testTimeout: 30_000,
    reporters: ["verbose"],
  },
  resolve: {
    alias: { "@": resolve(__dirname, ".") },
  },
});
