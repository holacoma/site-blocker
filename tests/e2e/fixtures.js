import { test as base, chromium } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pathToExtension = resolve(__dirname, "../../");

// Loads the unpacked extension itself (no build step), the same way
// chrome://extensions -> "Cargar descomprimida" would, so these tests drive
// the real service worker / storage instead of a stubbed harness.
export const test = base.extend({
  // eslint-disable-next-line no-empty-pattern -- Playwright fixture signature requires this shape
  context: async ({}, use) => {
    const userDataDir = mkdtempSync(join(tmpdir(), "blockdoze-pw-"));
    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: "chromium",
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        "--headless=new",
      ],
    });
    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers();
    if (!background) background = await context.waitForEvent("serviceworker");
    const extensionId = background.url().split("/")[2];
    await use(extensionId);
  },
});

export const expect = test.expect;
