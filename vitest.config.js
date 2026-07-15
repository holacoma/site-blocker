import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/vitest.setup.js"],
    globals: true,
    // tests/e2e is Playwright (npm run test:e2e), not a vitest suite.
    exclude: ["**/node_modules/**", "tests/e2e/**"],
  },
});
