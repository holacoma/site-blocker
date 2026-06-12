// @vitest-environment happy-dom
import { ExceptionsFeature } from "../pages/options/features/exceptions.js";
import { BlockedSite } from "../shared/BlockedSite.js";

const allDays = [0, 1, 2, 3, 4, 5, 6];

function makeSite(exceptions = []) {
  return BlockedSite.from({ domain: "youtube.com", days: allDays, timerMinutes: 0, exceptions });
}

function makeCtx() {
  return { onUpdate: vi.fn() };
}

function getToggle(box) { return box.querySelector(".exc-toggle"); }
function getSection(box) { return box.querySelector(".exc-section"); }
function getTags(box) { return [...box.querySelectorAll(".exc-tag")]; }
function getInput(box) { return box.querySelector(".exc-input"); }
function getAddBtn(box) { return box.querySelector(".exc-add-btn"); }

describe("ExceptionsFeature — render inicial", () => {
  test("sin excepciones: toggle sin clase active, texto 'Excepciones', sección oculta", () => {
    const box = ExceptionsFeature.render(makeSite(), makeCtx());
    const toggle = getToggle(box);
    expect(toggle.className).toBe("exc-toggle");
    expect(toggle.textContent).toBe("Excepciones");
    expect(getSection(box).style.display).toBe("none");
  });

  test("con excepciones: toggle con clase active, texto con contador, sección visible", () => {
    const box = ExceptionsFeature.render(makeSite(["music.youtube.com", "accounts.google.com"]), makeCtx());
    const toggle = getToggle(box);
    expect(toggle.className).toBe("exc-toggle active");
    expect(toggle.textContent).toBe("Excepciones (2)");
    expect(getSection(box).style.display).toBe("");
  });

  test("con excepciones: muestra un chip por excepción", () => {
    const box = ExceptionsFeature.render(makeSite(["music.youtube.com", "accounts.google.com"]), makeCtx());
    const tags = getTags(box);
    expect(tags).toHaveLength(2);
    expect(tags[0].textContent).toContain("music.youtube.com");
    expect(tags[1].textContent).toContain("accounts.google.com");
  });

  test("siempre renderiza el input de agregar", () => {
    const box = ExceptionsFeature.render(makeSite(), makeCtx());
    expect(getInput(box)).not.toBeNull();
    expect(getAddBtn(box)).not.toBeNull();
  });
});

describe("ExceptionsFeature — toggle", () => {
  test("click en toggle muestra la sección cuando estaba oculta", () => {
    const box = ExceptionsFeature.render(makeSite(), makeCtx());
    const section = getSection(box);
    expect(section.style.display).toBe("none");
    getToggle(box).click();
    expect(section.style.display).toBe("");
  });

  test("click en toggle oculta la sección cuando estaba visible", () => {
    const box = ExceptionsFeature.render(makeSite(["music.youtube.com"]), makeCtx());
    const section = getSection(box);
    expect(section.style.display).toBe("");
    getToggle(box).click();
    expect(section.style.display).toBe("none");
  });
});

describe("ExceptionsFeature — agregar excepción", () => {
  test("click en botón + agrega la excepción y llama onUpdate", () => {
    const site = makeSite();
    const ctx = makeCtx();
    const box = ExceptionsFeature.render(site, ctx);

    getInput(box).value = "music.youtube.com";
    getAddBtn(box).click();

    expect(site.exceptions).toEqual(["music.youtube.com"]);
    expect(ctx.onUpdate).toHaveBeenCalledWith(site);
  });

  test("Enter en el input tiene el mismo efecto que el botón", () => {
    const site = makeSite();
    const ctx = makeCtx();
    const box = ExceptionsFeature.render(site, ctx);

    getInput(box).value = "accounts.google.com";
    getInput(box).dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

    expect(site.exceptions).toEqual(["accounts.google.com"]);
    expect(ctx.onUpdate).toHaveBeenCalledWith(site);
  });

  test("al agregar, el toggle pasa a active y muestra el contador", () => {
    const site = makeSite();
    const ctx = makeCtx();
    const box = ExceptionsFeature.render(site, ctx);

    getInput(box).value = "music.youtube.com";
    getAddBtn(box).click();

    expect(getToggle(box).className).toBe("exc-toggle active");
    expect(getToggle(box).textContent).toBe("Excepciones (1)");
  });

  test("al agregar, el input queda vacío", () => {
    const site = makeSite();
    const box = ExceptionsFeature.render(site, makeCtx());
    getInput(box).value = "music.youtube.com";
    getAddBtn(box).click();
    expect(getInput(box).value).toBe("");
  });

  test("normaliza la URL: quita http://, https:// y www.", () => {
    const site = makeSite();
    const ctx = makeCtx();
    const box = ExceptionsFeature.render(site, ctx);

    getInput(box).value = "https://www.music.youtube.com";
    getAddBtn(box).click();

    expect(site.exceptions).toEqual(["music.youtube.com"]);
  });

  test("preserva el path (reddit.com/chat/room/)", () => {
    const site = BlockedSite.from({ domain: "reddit.com", days: allDays, timerMinutes: 0, exceptions: [] });
    const ctx = makeCtx();
    const box = ExceptionsFeature.render(site, ctx);

    getInput(box).value = "reddit.com/chat/room/";
    getAddBtn(box).click();

    expect(site.exceptions).toEqual(["reddit.com/chat/room/"]);
  });

  test("ignora input vacío", () => {
    const site = makeSite();
    const ctx = makeCtx();
    const box = ExceptionsFeature.render(site, ctx);

    getInput(box).value = "   ";
    getAddBtn(box).click();

    expect(site.exceptions).toEqual([]);
    expect(ctx.onUpdate).not.toHaveBeenCalled();
  });

  test("ignora duplicado", () => {
    const site = makeSite(["music.youtube.com"]);
    const ctx = makeCtx();
    const box = ExceptionsFeature.render(site, ctx);

    getInput(box).value = "music.youtube.com";
    getAddBtn(box).click();

    expect(site.exceptions).toEqual(["music.youtube.com"]);
    expect(ctx.onUpdate).not.toHaveBeenCalled();
  });
});

describe("ExceptionsFeature — eliminar excepción", () => {
  test("click en × elimina la excepción y llama onUpdate", () => {
    const site = makeSite(["music.youtube.com", "accounts.google.com"]);
    const ctx = makeCtx();
    const box = ExceptionsFeature.render(site, ctx);

    const delBtns = box.querySelectorAll(".exc-tag-del");
    delBtns[0].click();

    expect(site.exceptions).toEqual(["accounts.google.com"]);
    expect(ctx.onUpdate).toHaveBeenCalledWith(site);
  });

  test("al eliminar la última excepción, el toggle vuelve a estado inactivo", () => {
    const site = makeSite(["music.youtube.com"]);
    const ctx = makeCtx();
    const box = ExceptionsFeature.render(site, ctx);

    box.querySelector(".exc-tag-del").click();

    expect(getToggle(box).className).toBe("exc-toggle");
    expect(getToggle(box).textContent).toBe("Excepciones");
  });

  test("al eliminar, la lista de chips se actualiza", () => {
    const site = makeSite(["music.youtube.com", "accounts.google.com"]);
    const ctx = makeCtx();
    const box = ExceptionsFeature.render(site, ctx);

    box.querySelectorAll(".exc-tag-del")[0].click();

    expect(getTags(box)).toHaveLength(1);
    expect(getTags(box)[0].textContent).toContain("accounts.google.com");
  });
});
