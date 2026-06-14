import { test as base, chromium } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const EXTENSION_PATH = path.resolve(__dirname, "../../");
export const TEST_HOST = "example.com";
export const TEST_URL = `https://${TEST_HOST}/`;

// ── Fixtures ──────────────────────────────────────────────────────────────────

export const test = base.extend({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext("", {
      headless: false,
      executablePath: "/usr/bin/google-chrome",
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        "--no-first-run",
        "--disable-default-apps",
      ],
    });
    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    let [sw] = context.serviceWorkers();
    if (!sw) sw = await context.waitForEvent("serviceworker");
    await use(sw.url().split("/")[2]);
  },
});

export { expect } from "@playwright/test";

// ── Helpers ───────────────────────────────────────────────────────────────────

export async function getServiceWorker(context) {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent("serviceworker");
  return sw;
}

export async function setStorage(context, data) {
  const sw = await getServiceWorker(context);
  await sw.evaluate((d) => chrome.storage.local.set(d), data);
}

export async function setActiveTimer(context, hostname, msRemaining = 5 * 60 * 1000) {
  await setStorage(context, {
    activeTimers: { [hostname]: { expiry: Date.now() + msRemaining } },
  });
}

// Intercepta la URL con una página HTML vacía (evita dependencia de red)
export async function interceptBlank(page, url) {
  await page.route(url, (route) =>
    route.fulfill({ contentType: "text/html", body: "<html><body></body></html>" })
  );
}
