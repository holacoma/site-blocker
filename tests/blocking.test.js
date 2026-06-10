import { ALWAYS_ALLOWED, isAlwaysAllowed, isBlocked } from "../src/blocking.js";
import { BlockedSite } from "../shared/BlockedSite.js";

const allDays = [0, 1, 2, 3, 4, 5, 6];

function sites(...domains) {
  return domains.map((d) => BlockedSite.from({ domain: d, days: allDays, timerMinutes: 0 }));
}

describe("isAlwaysAllowed", () => {
  test("permite dominios en ALWAYS_ALLOWED", () => {
    expect(isAlwaysAllowed("https://music.youtube.com/watch?v=1")).toBe(true);
    expect(isAlwaysAllowed("https://accounts.google.com/signin")).toBe(true);
  });

  test("permite music.youtube.com aunque youtube.com esté bloqueado", () => {
    expect(isAlwaysAllowed("https://music.youtube.com/")).toBe(true);
  });

  test("NO permite youtube.com", () => {
    expect(isAlwaysAllowed("https://www.youtube.com/")).toBe(false);
  });

  test("NO permite studio.youtube.com", () => {
    expect(isAlwaysAllowed("https://studio.youtube.com/")).toBe(false);
  });

  test("ignora prefijo www", () => {
    expect(isAlwaysAllowed("https://www.music.youtube.com/")).toBe(true);
  });

  test("retorna false para URLs inválidas", () => {
    expect(isAlwaysAllowed("not-a-url")).toBe(false);
  });

  test("permite reddit.com/chat/room/ y subrutas", () => {
    expect(isAlwaysAllowed("https://reddit.com/chat/room/12345")).toBe(true);
    expect(isAlwaysAllowed("https://www.reddit.com/chat/room/abc")).toBe(true);
  });

  test("NO permite reddit.com fuera de /chat/room/", () => {
    expect(isAlwaysAllowed("https://reddit.com/r/programming")).toBe(false);
    expect(isAlwaysAllowed("https://reddit.com/chat/")).toBe(false);
  });
});

describe("isBlocked", () => {
  test("bloquea el dominio exacto", () => {
    expect(isBlocked("https://reddit.com/", sites("reddit.com"))).toBe(true);
  });

  test("bloquea www del dominio bloqueado", () => {
    expect(isBlocked("https://www.reddit.com/", sites("reddit.com"))).toBe(true);
  });

  test("bloquea subdominios no permitidos", () => {
    expect(isBlocked("https://studio.youtube.com/", sites("youtube.com"))).toBe(true);
  });

  test("NO bloquea music.youtube.com aunque youtube.com esté bloqueado", () => {
    expect(isBlocked("https://music.youtube.com/", sites("youtube.com"))).toBe(false);
  });

  test("NO bloquea si hoy no está en el schedule", () => {
    const s = new BlockedSite({ domain: "reddit.com", days: [], timerMinutes: 0 });
    expect(isBlocked("https://reddit.com/", [s])).toBe(false);
  });

  test("NO bloquea sitios que no están en la lista", () => {
    expect(isBlocked("https://github.com/", sites("reddit.com"))).toBe(false);
  });

  test("retorna false con lista vacía", () => {
    expect(isBlocked("https://reddit.com/", [])).toBe(false);
  });

  test("retorna false para URLs inválidas", () => {
    expect(isBlocked("not-a-url", sites("reddit.com"))).toBe(false);
  });

  test("NO bloquea reddit.com/chat/room/", () => {
    expect(isBlocked("https://reddit.com/chat/room/123", sites("reddit.com"))).toBe(false);
  });

  test("sigue bloqueando reddit.com fuera de /chat/room/", () => {
    expect(isBlocked("https://reddit.com/r/news", sites("reddit.com"))).toBe(true);
  });
});

describe("isBlocked — timer bypass", () => {
  test("permite acceso cuando hay un timer activo", () => {
    const activeTimers = { "reddit.com": Date.now() + 60_000 };
    expect(isBlocked("https://reddit.com/", sites("reddit.com"), activeTimers)).toBe(false);
  });

  test("bloquea de nuevo cuando el timer expiró", () => {
    const activeTimers = { "reddit.com": Date.now() - 1 };
    expect(isBlocked("https://reddit.com/", sites("reddit.com"), activeTimers)).toBe(true);
  });

  test("el timer de un dominio no afecta a otros", () => {
    const activeTimers = { "twitter.com": Date.now() + 60_000 };
    expect(isBlocked("https://reddit.com/", sites("reddit.com"), activeTimers)).toBe(true);
  });

  test("el timer bajo el dominio canónico aplica a subdominios (web.facebook.com)", () => {
    const s = BlockedSite.from({ domain: "facebook.com", days: allDays, timerMinutes: 0 });
    const activeTimers = { "facebook.com": Date.now() + 60_000 };
    expect(isBlocked("https://web.facebook.com/", [s], activeTimers)).toBe(false);
  });
});
