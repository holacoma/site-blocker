// @ts-check
import { defineConfig } from "@playwright/test";

// Extension E2E tests only: launches the unpacked extension in a real
// Chromium via tests/e2e/fixtures.js. Kept separate from `npm test` (vitest,
// no DOM) since these are slower and hit the real network (theuselessweb.com).
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
});
