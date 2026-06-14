import { test, expect, setStorage, interceptBlank, TEST_HOST, TEST_URL } from "./fixtures.js";

// El timer expira en 2 segundos → suficiente para que el content script arranque
const EXPIRES_IN_MS = 2000;

test.describe("Overlay de expiración", () => {
  async function setupAndOpen(context, expiryTheme) {
    await setStorage(context, {
      activeTimers: { [TEST_HOST]: { expiry: Date.now() + EXPIRES_IN_MS } },
      overlayExpiryTheme: expiryTheme,
    });

    const page = await context.newPage();
    await interceptBlank(page, TEST_URL);
    await page.goto(TEST_URL);

    // Esperar la barra primero, después el overlay de expiración
    await page.waitForSelector("#sb-footer", { timeout: 6000 });
    await page.waitForSelector("#sb-expiry-overlay", { timeout: 8000 });
    return page;
  }

  test("toast: card en esquina inferior-derecha", async ({ context }) => {
    const page = await setupAndOpen(context, "toast");
    const overlay = page.locator("#sb-expiry-overlay");
    await expect(overlay).toBeVisible();

    const cs = await overlay.evaluate((el) => {
      const s = getComputedStyle(el);
      return { right: s.right, bottom: s.bottom, borderRadius: s.borderRadius };
    });
    expect(cs.right).toBe("24px");
    expect(cs.bottom).toBe("24px");
    expect(parseFloat(cs.borderRadius)).toBeGreaterThan(0);

    // El countdown es rojo (#d93025)
    const countdownColor = await page.locator("#sb-countdown").evaluate((el) =>
      getComputedStyle(el).color
    );
    expect(countdownColor).toMatch(/rgb\(217,\s*48,\s*37\)/);
  });

  test("sutil: banner en la parte inferior", async ({ context }) => {
    const page = await setupAndOpen(context, "subtle");
    const overlay = page.locator("#sb-expiry-overlay");
    await expect(overlay).toBeVisible();

    const cs = await overlay.evaluate((el) => {
      const s = getComputedStyle(el);
      return { bottom: s.bottom, height: s.height };
    });
    expect(cs.bottom).toBe("0px");
    expect(parseInt(cs.height)).toBeLessThanOrEqual(60);
  });

  test("desenfocado: cubre pantalla completa con blur", async ({ context }) => {
    const page = await setupAndOpen(context, "blur");
    const overlay = page.locator("#sb-expiry-overlay");
    await expect(overlay).toBeVisible();

    const backdropFilter = await overlay.evaluate((el) =>
      getComputedStyle(el).backdropFilter
    );
    expect(backdropFilter).toContain("blur");

    // Debe cubrir todo el viewport
    const box = await overlay.boundingBox();
    const vp = page.viewportSize();
    expect(box.width).toBeCloseTo(vp.width, -1);
    expect(box.height).toBeCloseTo(vp.height, -1);
  });

  test("clásico: overlay rojo pulsante en la parte inferior", async ({ context }) => {
    const page = await setupAndOpen(context, "default");
    const overlay = page.locator("#sb-expiry-overlay");
    await expect(overlay).toBeVisible();

    const cs = await overlay.evaluate((el) => {
      const s = getComputedStyle(el);
      return { bottom: s.bottom, animationName: s.animationName };
    });
    expect(cs.bottom).toBe("0px");
    expect(cs.animationName).toContain("sb-pulse");
  });

  test("pantalla completa: cubre todo el viewport", async ({ context }) => {
    const page = await setupAndOpen(context, "fullscreen");
    const overlay = page.locator("#sb-expiry-overlay");
    await expect(overlay).toBeVisible();

    const box = await overlay.boundingBox();
    const vp = page.viewportSize();
    expect(box.width).toBeCloseTo(vp.width, -1);
    expect(box.height).toBeCloseTo(vp.height, -1);

    // Animación breathing
    const animName = await overlay.evaluate((el) =>
      getComputedStyle(el).animationName
    );
    expect(animName).toContain("sb-breathe");
  });

  test("el countdown es visible en todos los estilos", async ({ context }) => {
    for (const theme of ["toast", "subtle", "blur", "default", "fullscreen"]) {
      await setStorage(context, {
        activeTimers: { [TEST_HOST]: { expiry: Date.now() + EXPIRES_IN_MS } },
        overlayExpiryTheme: theme,
      });
      const page = await context.newPage();
      await interceptBlank(page, TEST_URL);
      await page.goto(TEST_URL);
      await page.waitForSelector("#sb-expiry-overlay", { timeout: 8000 });
      await expect(page.locator("#sb-countdown")).toBeVisible();
      await page.close();
    }
  });
});
