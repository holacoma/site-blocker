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

function getTags(box) { return [...box.querySelectorAll(".exc-tag")]; }
function getInput(box) { return box.querySelector(".exc-input"); }
function getAddBtn(box) { return box.querySelector(".exc-add-btn"); }

describe("ExceptionsFeature — render inicial", () => {
  test("sin excepciones: no hay chips, sí hay input y botón", () => {
    const box = ExceptionsFeature.render(makeSite(), makeCtx());
    expect(getTags(box)).toHaveLength(0);
    expect(getInput(box)).not.toBeNull();
    expect(getAddBtn(box)).not.toBeNull();
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

  test("al agregar, aparece el nuevo chip en la lista", () => {
    const site = makeSite();
    const ctx = makeCtx();
    const box = ExceptionsFeature.render(site, ctx);

    getInput(box).value = "music.youtube.com";
    getAddBtn(box).click();

    expect(getTags(box)).toHaveLength(1);
    expect(getTags(box)[0].textContent).toContain("music.youtube.com");
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

  test("al eliminar, la lista de chips se actualiza", () => {
    const site = makeSite(["music.youtube.com", "accounts.google.com"]);
    const ctx = makeCtx();
    const box = ExceptionsFeature.render(site, ctx);

    box.querySelectorAll(".exc-tag-del")[0].click();

    expect(getTags(box)).toHaveLength(1);
    expect(getTags(box)[0].textContent).toContain("accounts.google.com");
  });

  test("al eliminar la última excepción, desaparece la lista de chips", () => {
    const site = makeSite(["music.youtube.com"]);
    const ctx = makeCtx();
    const box = ExceptionsFeature.render(site, ctx);

    box.querySelector(".exc-tag-del").click();

    expect(getTags(box)).toHaveLength(0);
  });
});
