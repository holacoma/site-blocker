import { test, expect } from "./fixtures.js";

test.describe("Página de opciones", () => {
  async function openOptions(context, extensionId) {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/pages/options/options.html`);
    // Navegar a la sección General donde vive Apariencia
    await page.getByRole("button", { name: /general/i }).click();
    return page;
  }

  test("carga con tema sober por defecto", async ({ context, extensionId }) => {
    const page = await openOptions(context, extensionId);
    await expect(page.locator("html[data-theme='sober']")).toBeAttached();
  });

  test("cambio de tema a retro aplica data-theme", async ({ context, extensionId }) => {
    const page = await openOptions(context, extensionId);
    await page.locator("#theme-select").selectOption("retro");
    await expect(page.locator("html[data-theme='retro']")).toBeAttached();
  });

  test("sección apariencia renderiza los 3 selects", async ({ context, extensionId }) => {
    const page = await openOptions(context, extensionId);
    const selects = page.locator("#appearance-mount select");
    await expect(selects).toHaveCount(3);
  });

  test("select de barra actualiza el preview", async ({ context, extensionId }) => {
    const page = await openOptions(context, extensionId);
    const barSelect = page.locator("#appearance-mount select").first();

    // Default → preview clásico
    await expect(page.locator(".pv-bar[data-theme='default']")).toBeVisible();

    // Cambiar a Puntos → preview con dots
    await barSelect.selectOption("dots");
    await expect(page.locator(".pv-bar[data-theme='dots']")).toBeVisible();
    await expect(page.locator(".pv-dots")).toBeVisible();

    // Cambiar a Segmentos
    await barSelect.selectOption("segments");
    await expect(page.locator(".pv-bar[data-theme='segments']")).toBeVisible();

    // Cambiar a Minimalista
    await barSelect.selectOption("minimal");
    await expect(page.locator(".pv-bar[data-theme='minimal']")).toBeVisible();
  });

  test("select de posición actualiza el indicador del preview", async ({ context, extensionId }) => {
    const page = await openOptions(context, extensionId);
    const posSelect = page.locator("#appearance-mount select").nth(1);

    await expect(page.locator(".pv-pos-indicator[data-pos='bottom']")).toBeVisible();

    await posSelect.selectOption("top");
    await expect(page.locator(".pv-pos-indicator[data-pos='top']")).toBeVisible();

    await posSelect.selectOption("left");
    await expect(page.locator(".pv-pos-indicator[data-pos='left']")).toBeVisible();

    await posSelect.selectOption("right");
    await expect(page.locator(".pv-pos-indicator[data-pos='right']")).toBeVisible();
  });

  test("select de expiración muestra los 5 estilos en el preview", async ({ context, extensionId }) => {
    const page = await openOptions(context, extensionId);
    const expirySelect = page.locator("#appearance-mount select").nth(2);

    // Default guardado es toast
    await expect(page.locator(".pv-expiry[data-theme='toast']")).toBeVisible();

    for (const theme of ["subtle", "blur", "default", "fullscreen"]) {
      await expirySelect.selectOption(theme);
      await expect(page.locator(`.pv-expiry[data-theme='${theme}']`)).toBeVisible();
    }
  });

  test("cambio de idioma recarga con textos en inglés", async ({ context, extensionId }) => {
    const page = await openOptions(context, extensionId);
    const langSelect = page.locator("#lang-select");

    await langSelect.selectOption("en");
    await page.waitForURL(/options\.html/);

    await expect(page.locator("[data-i18n='navGeneral']")).toHaveText("General");
  });
});
