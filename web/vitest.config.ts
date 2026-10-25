import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@vectors": path.resolve(import.meta.dirname, "../shared/test-vectors"),
    },
  },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
