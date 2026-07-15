// @vitest-environment happy-dom
import { setLang } from "../shared/i18n.js";
import { renderAppearance } from "../pages/options/features/appearance.js";

function setupDom() {
  document.body.innerHTML = '<div id="appearance-mount"></div>';
}

function render() {
  setupDom();
  renderAppearance(/** @type {any} */ ({}));
}

beforeEach(() => {
  chrome.storage.local.get.mockImplementation((defaults, cb) => cb(defaults));
});

describe("renderAppearance — opciones de la barra según idioma", () => {
  test("en español muestra los nombres en español", () => {
    setLang("es");
    render();
    const barSelect = /** @type {HTMLSelectElement} */ (document.querySelectorAll("select")[2]);
    const labels = [...barSelect.options].map((o) => o.textContent);
    expect(labels).toEqual(["Clásico", "Puntos", "Segmentos", "Borde"]);
  });

  test("en inglés muestra los nombres en inglés, no en español", () => {
    setLang("en");
    render();
    const barSelect = /** @type {HTMLSelectElement} */ (document.querySelectorAll("select")[2]);
    const labels = [...barSelect.options].map((o) => o.textContent);
    expect(labels).toEqual(["Classic", "Dots", "Segments", "Border"]);
  });

  test("en inglés, la posición y el estilo de expiración también se traducen", () => {
    setLang("en");
    render();
    const selects = document.querySelectorAll("select");
    const positionLabels = [...(/** @type {HTMLSelectElement} */ (selects[3])).options].map((o) => o.textContent);
    const expiryLabels = [...(/** @type {HTMLSelectElement} */ (selects[4])).options].map((o) => o.textContent);
    expect(positionLabels).toEqual(["Bottom", "Top", "Left", "Right"]);
    expect(expiryLabels).toEqual(["Toast", "Blur", "Full Screen"]);
  });

  test("por defecto (sin preferencia guardada) selecciona el estilo \"Borde\"", () => {
    setLang("es");
    render();
    const barSelect = /** @type {HTMLSelectElement} */ (document.querySelectorAll("select")[2]);
    expect(barSelect.value).toBe("border");
  });
});
