import { test, expect } from "./fixtures.js";

// The bar/position/expiry <select> elements are appended to #appearance-mount
// in this fixed order: dark mode, theme, bar style, bar position, expiry style.
const BAR_SELECT_INDEX = 2;

test.describe("Página de opciones - Apariencia", () => {
  test("sin preferencia guardada, la barra de progreso usa el estilo \"Borde\" por defecto", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/pages/options/options.html`);
    await page.locator('.nav-item[data-section="appearance"]').click();

    const barSelect = page.locator("#appearance-mount select").nth(BAR_SELECT_INDEX);
    await expect(barSelect).toHaveValue("border");

    await page.close();
  });

  test("en inglés, las opciones de la barra se muestran en inglés (no en español)", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/pages/options/options.html`);
    await page.evaluate(() => chrome.storage.local.set({ language: "en" }));
    await page.reload();

    await page.locator('.nav-item[data-section="appearance"]').click();

    const barSelect = page.locator("#appearance-mount select").nth(BAR_SELECT_INDEX);
    const labels = await barSelect.locator("option").allTextContents();

    expect(labels).toEqual(["Classic", "Dots", "Segments", "Border"]);
    expect(labels).not.toContain("Borde");
    expect(labels).not.toContain("Puntos");

    await page.close();
  });
});
