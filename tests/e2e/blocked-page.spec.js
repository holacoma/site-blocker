import { test, expect } from "./fixtures.js";

// blocked.js timeline: INITIAL_WAIT_MS (10s) + BORED_ENTER_MS (5s) +
// BORED_SIT_MS (10s) = 25s before the reveal (inert clear + attemptFrame)
// even starts, plus REVEAL_MS (5s) for the height/toolbar transition, plus
// real network time to theuselessweb.com.
const PANEL_TIMEOUT = 30000;
const FRAME_TIMEOUT = 45000;

/**
 * Waits for the destination window's actual reveal: setupRedirectFrame
 * clears #redirect-panel's `inert` at the 25s mark, right as it starts
 * growing from height:0. Checking `inert` directly instead of a Playwright
 * locator "visible" wait sidesteps any ambiguity around how Playwright's own
 * visibility heuristic treats a height-animated element mid-transition.
 * @param {import("@playwright/test").Page} page
 * @param {number} timeout
 */
async function waitForPanelRevealed(page, timeout) {
  await page.waitForFunction(
    () => !(/** @type {HTMLElement} */ (document.getElementById("redirect-panel")).inert),
    { timeout },
  );
}

async function waitForOutcome(page, timeout) {
  // Both #frame-toolbar and #frame-fallback always exist in the DOM (only
  // one is ever un-hidden), so a locator-visibility race isn't reliable
  // here - poll the actual `hidden` property directly instead.
  await page.waitForFunction(
    () => {
      const toolbar = document.getElementById("frame-toolbar");
      const fallback = document.getElementById("frame-fallback");
      return (toolbar && !toolbar.hidden) || (fallback && !fallback.hidden);
    },
    { timeout },
  );
  return await page.evaluate(() => !document.getElementById("frame-toolbar").hidden);
}

test.describe("Pantalla de bloqueo - panel de destino (Useless Web)", () => {
  test("el panel crece en pantallas grandes en vez de quedar fijo en ~400px", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 700, height: 900 });
    await page.goto(`chrome-extension://${extensionId}/pages/blocked/blocked.html?site=preview`);

    // #redirect-panel is width:100% of .redirect-area even at height:0 (pre-
    // reveal), so its box width already reflects the responsive clamp() -
    // no need to wait almost 30s for the actual reveal just to check width.
    const panel = page.locator("#redirect-panel");
    const smallBox = await panel.boundingBox();

    await page.setViewportSize({ width: 1800, height: 1100 });
    const bigBox = await panel.boundingBox();

    expect(smallBox).not.toBeNull();
    expect(bigBox).not.toBeNull();
    expect(bigBox.width).toBeGreaterThan(smallBox.width * 1.3);

    await page.close();
  });

  test("aparece la barra de herramientas cuando el sitio carga, y abre en pestaña nueva", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(`chrome-extension://${extensionId}/pages/blocked/blocked.html?site=preview`);

    // The destination loads in the background as soon as the page loads
    // (see the comment above attemptFrame's call site in blocked.js), well
    // before the panel is revealed - so this settles quickly, independent of
    // the 25s reveal wait. theuselessweb.com is still a live external site
    // that may not finish framing within FRAME_TIMEOUT_MS, in which case
    // blocked.js correctly falls back to the quote view instead; both are
    // valid outcomes, only the "it loaded" branch has a toolbar/new-tab to test.
    const loaded = await waitForOutcome(page, FRAME_TIMEOUT);
    test.skip(!loaded, "theuselessweb.com did not finish loading in this run; app correctly fell back to the quote view");

    // The buttons are inert until the panel is actually revealed at the 25s
    // mark, regardless of how early the content itself settled.
    await waitForPanelRevealed(page, PANEL_TIMEOUT);
    await expect(page.locator("#redirect-iframe")).toBeVisible();

    const [popup] = await Promise.all([
      context.waitForEvent("page"),
      page.locator("#frame-newtab-btn").click(),
    ]);
    await popup.waitForLoadState();
    expect(popup.url()).toContain("theuselessweb.com");
    await popup.close();

    await page.close();
  });

  test("recargar pide una página nueva al azar (cache-bust)", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(`chrome-extension://${extensionId}/pages/blocked/blocked.html?site=preview`);

    const loaded = await waitForOutcome(page, FRAME_TIMEOUT);
    test.skip(!loaded, "theuselessweb.com did not finish loading in this run; app correctly fell back to the quote view");

    await waitForPanelRevealed(page, PANEL_TIMEOUT);
    const srcBefore = await page.locator("#redirect-iframe").getAttribute("src");

    await page.locator("#frame-reload-btn").click();
    await expect(page.locator("#frame-toolbar")).toBeVisible({ timeout: FRAME_TIMEOUT });
    const srcAfter = await page.locator("#redirect-iframe").getAttribute("src");

    expect(srcAfter).not.toBe(srcBefore);
    expect(srcAfter).toContain("_r=");

    await page.close();
  });

  test("pantalla completa expande el panel y el botón cambia a restaurar", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(`chrome-extension://${extensionId}/pages/blocked/blocked.html?site=preview`);

    await waitForPanelRevealed(page, PANEL_TIMEOUT);
    await page.locator("#frame-fullscreen-btn").click();

    await expect(page.locator("#frame-fullscreen-btn")).toHaveText("🗗");
    const isFullscreen = await page.evaluate(() => !!document.fullscreenElement);
    expect(isFullscreen).toBe(true);

    await page.close();
  });

  test("modo motivacional no muestra iframe ni barra de herramientas", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/pages/options/options.html`);
    await page.evaluate(() => chrome.storage.local.set({ blockRedirectMode: "motivational" }));

    await page.goto(`chrome-extension://${extensionId}/pages/blocked/blocked.html?site=preview`);
    // showQuote() runs immediately (same background-load timing as the
    // iframe path), well before the panel itself is revealed - check the
    // underlying state directly rather than via Playwright's locator
    // visibility, which doesn't account for the still-collapsed ancestor
    // panel (height:0/overflow:hidden) the same way a human eye would.
    await page.waitForFunction(() => !document.getElementById("frame-fallback").hidden, { timeout: PANEL_TIMEOUT });
    const state = await page.evaluate(() => ({
      fallbackHidden: document.getElementById("frame-fallback").hidden,
      iframeHidden: document.getElementById("redirect-iframe").hidden,
      toolbarHidden: document.getElementById("frame-toolbar").hidden,
    }));
    expect(state.fallbackHidden).toBe(false);
    expect(state.iframeHidden).toBe(true);
    expect(state.toolbarHidden).toBe(true);

    await page.close();
  });
});
