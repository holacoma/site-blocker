import { test, expect, setStorage, setActiveTimer, interceptBlank, TEST_HOST, TEST_URL } from "./fixtures.js";

test.describe("Barra de timer (overlay)", () => {
  // Abre la página de prueba con un timer activo ya configurado
  async function openPage(context) {
    const page = await context.newPage();
    await interceptBlank(page, TEST_URL);
    await page.goto(TEST_URL);
    await page.waitForSelector("#sb-footer", { timeout: 8000 });
    return page;
  }

  test.beforeEach(async ({ context }) => {
    await setActiveTimer(context, TEST_HOST);
  });

  // ── Aparición básica ───────────────────────────────────────────────────────

  test("la barra aparece cuando hay un timer activo", async ({ context }) => {
    const page = await openPage(context);
    await expect(page.locator("#sb-footer")).toBeVisible();
    await expect(page.locator("#sb-time")).toContainText("restantes");
  });

  test("el botón × oculta la barra sin recargar", async ({ context }) => {
    const page = await openPage(context);
    await page.locator("#sb-close").click();
    await expect(page.locator("#sb-footer")).toBeHidden();
  });

  // ── Estilos de barra ───────────────────────────────────────────────────────

  test("clásico: muestra track y fill", async ({ context }) => {
    await setStorage(context, { overlayBarTheme: "default" });
    const page = await openPage(context);
    await expect(page.locator("#sb-track")).toBeVisible();
    await expect(page.locator("#sb-fill")).toBeVisible();
  });

  test("puntos: renderiza 20 dots, los primeros activos en azul", async ({ context }) => {
    await setStorage(context, { overlayBarTheme: "dots" });
    const page = await openPage(context);

    const dots = page.locator(".sb-dot");
    await expect(dots).toHaveCount(20);

    // El primer dot debe tener el color azul sober aplicado por JS
    const firstBg = await dots.first().evaluate((el) => el.style.background);
    expect(firstBg).toMatch(/rgb\(26,\s*115,\s*232\)|#1a73e8/);
  });

  test("segmentos: muestra track y fill", async ({ context }) => {
    await setStorage(context, { overlayBarTheme: "segments" });
    const page = await openPage(context);
    await expect(page.locator("#sb-track")).toBeVisible();
    await expect(page.locator("#sb-fill")).toBeVisible();
  });

  test("minimalista: barra de altura reducida", async ({ context }) => {
    await setStorage(context, { overlayBarTheme: "minimal" });
    const page = await openPage(context);
    const height = await page.locator("#sb-footer").evaluate((el) =>
      parseInt(getComputedStyle(el).height)
    );
    expect(height).toBeLessThanOrEqual(26);
  });

  // ── Posiciones ─────────────────────────────────────────────────────────────

  test("abajo: bottom=0px, orientación horizontal", async ({ context }) => {
    await setStorage(context, { overlayBarPosition: "bottom" });
    const page = await openPage(context);
    const cs = await page.locator("#sb-footer").evaluate((el) => {
      const s = getComputedStyle(el);
      return { bottom: s.bottom, flexDirection: s.flexDirection };
    });
    expect(cs.bottom).toBe("0px");
    expect(cs.flexDirection).toBe("row");
  });

  test("arriba: top=0px", async ({ context }) => {
    await setStorage(context, { overlayBarPosition: "top" });
    const page = await openPage(context);
    const top = await page.locator("#sb-footer").evaluate((el) =>
      getComputedStyle(el).top
    );
    expect(top).toBe("0px");
  });

  test("izquierda: left=0px, orientación vertical (column)", async ({ context }) => {
    await setStorage(context, { overlayBarPosition: "left" });
    const page = await openPage(context);
    const cs = await page.locator("#sb-footer").evaluate((el) => {
      const s = getComputedStyle(el);
      return { left: s.left, flexDirection: s.flexDirection };
    });
    expect(cs.left).toBe("0px");
    expect(cs.flexDirection).toBe("column");
  });

  test("derecha: right=0px, orientación vertical (column)", async ({ context }) => {
    await setStorage(context, { overlayBarPosition: "right" });
    const page = await openPage(context);
    const cs = await page.locator("#sb-footer").evaluate((el) => {
      const s = getComputedStyle(el);
      return { right: s.right, flexDirection: s.flexDirection };
    });
    expect(cs.right).toBe("0px");
    expect(cs.flexDirection).toBe("column");
  });

  // ── Cambio de color según tiempo restante ─────────────────────────────────

  test("fill es azul con más del 50% del tiempo", async ({ context }) => {
    // Timer de 10 minutos → 100% restante → azul
    await setStorage(context, {
      activeTimers: { [TEST_HOST]: { expiry: Date.now() + 10 * 60 * 1000 } },
      overlayBarTheme: "default",
    });
    const page = await openPage(context);
    const bg = await page.locator("#sb-fill").evaluate((el) => el.style.background);
    expect(bg).toMatch(/rgb\(26,\s*115,\s*232\)|#1a73e8/);
  });
});
