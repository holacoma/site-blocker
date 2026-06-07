const {
  ALWAYS_ALLOWED,
  normalizeSites,
  isActiveToday,
  isAlwaysAllowed,
  isBlocked,
} = require("./background");

// ─── normalizeSites ───────────────────────────────────────────────────────────

describe("normalizeSites", () => {
  test("convierte strings a objetos con todos los días", () => {
    const result = normalizeSites(["youtube.com"]);
    expect(result).toEqual([{ domain: "youtube.com", days: [0, 1, 2, 3, 4, 5, 6] }]);
  });

  test("deja los objetos existentes sin cambios", () => {
    const entry = { domain: "reddit.com", days: [1, 2, 3] };
    expect(normalizeSites([entry])).toEqual([entry]);
  });

  test("maneja listas mixtas", () => {
    const result = normalizeSites(["twitter.com", { domain: "reddit.com", days: [1] }]);
    expect(result[0].days).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(result[1].days).toEqual([1]);
  });
});

// ─── isActiveToday ────────────────────────────────────────────────────────────

describe("isActiveToday", () => {
  afterEach(() => jest.restoreAllMocks());

  test("retorna true si hoy está en el schedule", () => {
    jest.spyOn(Date.prototype, "getDay").mockReturnValue(3); // miércoles
    expect(isActiveToday({ days: [1, 2, 3, 4, 5] })).toBe(true);
  });

  test("retorna false si hoy NO está en el schedule", () => {
    jest.spyOn(Date.prototype, "getDay").mockReturnValue(0); // domingo
    expect(isActiveToday({ days: [1, 2, 3, 4, 5] })).toBe(false);
  });
});

// ─── isAlwaysAllowed ──────────────────────────────────────────────────────────

describe("isAlwaysAllowed", () => {
  test("permite los dominios en ALWAYS_ALLOWED", () => {
    for (const domain of ALWAYS_ALLOWED) {
      expect(isAlwaysAllowed(`https://${domain}/`)).toBe(true);
    }
  });

  test("permite music.youtube.com aunque youtube.com esté bloqueado", () => {
    expect(isAlwaysAllowed("https://music.youtube.com/watch?v=123")).toBe(true);
  });

  test("permite accounts.google.com", () => {
    expect(isAlwaysAllowed("https://accounts.google.com/signin")).toBe(true);
  });

  test("NO permite youtube.com (dominio padre)", () => {
    expect(isAlwaysAllowed("https://youtube.com/")).toBe(false);
  });

  test("NO permite studio.youtube.com (no está en la lista)", () => {
    expect(isAlwaysAllowed("https://studio.youtube.com/")).toBe(false);
  });

  test("ignora el prefijo www al comparar", () => {
    expect(isAlwaysAllowed("https://www.music.youtube.com/")).toBe(true);
  });

  test("retorna false para URLs inválidas", () => {
    expect(isAlwaysAllowed("no-es-una-url")).toBe(false);
  });

  test("permite reddit.com/chat/room/ y sus subrutas", () => {
    expect(isAlwaysAllowed("https://www.reddit.com/chat/room/abc123")).toBe(true);
    expect(isAlwaysAllowed("https://reddit.com/chat/room/")).toBe(true);
  });

  test("NO permite reddit.com fuera de /chat/room/", () => {
    expect(isAlwaysAllowed("https://www.reddit.com/r/programming")).toBe(false);
    expect(isAlwaysAllowed("https://reddit.com/")).toBe(false);
  });
});

// ─── isBlocked ────────────────────────────────────────────────────────────────

describe("isBlocked", () => {
  afterEach(() => jest.restoreAllMocks());

  const allDays = [0, 1, 2, 3, 4, 5, 6];

  function mockDay(day) {
    jest.spyOn(Date.prototype, "getDay").mockReturnValue(day);
  }

  test("bloquea el dominio exacto", () => {
    mockDay(1);
    const sites = [{ domain: "youtube.com", days: allDays }];
    expect(isBlocked("https://youtube.com/", sites)).toBe(true);
  });

  test("bloquea www del dominio bloqueado", () => {
    mockDay(1);
    const sites = [{ domain: "youtube.com", days: allDays }];
    expect(isBlocked("https://www.youtube.com/", sites)).toBe(true);
  });

  test("bloquea subdominios no permitidos (studio.youtube.com)", () => {
    mockDay(1);
    const sites = [{ domain: "youtube.com", days: allDays }];
    expect(isBlocked("https://studio.youtube.com/", sites)).toBe(true);
  });

  test("NO bloquea music.youtube.com aunque youtube.com esté bloqueado", () => {
    mockDay(1);
    const sites = [{ domain: "youtube.com", days: allDays }];
    expect(isBlocked("https://music.youtube.com/", sites)).toBe(false);
  });

  test("NO bloquea accounts.youtube.com aunque youtube.com esté bloqueado", () => {
    mockDay(1);
    const sites = [{ domain: "youtube.com", days: allDays }];
    expect(isBlocked("https://accounts.youtube.com/", sites)).toBe(false);
  });

  test("NO bloquea si el día de hoy no está en el schedule", () => {
    mockDay(0); // domingo
    const sites = [{ domain: "youtube.com", days: [1, 2, 3, 4, 5] }]; // solo lunes-viernes
    expect(isBlocked("https://youtube.com/", sites)).toBe(false);
  });

  test("NO bloquea sitios que no están en la lista", () => {
    mockDay(1);
    const sites = [{ domain: "reddit.com", days: allDays }];
    expect(isBlocked("https://youtube.com/", sites)).toBe(false);
  });

  test("retorna false con lista vacía", () => {
    mockDay(1);
    expect(isBlocked("https://youtube.com/", [])).toBe(false);
  });

  test("NO bloquea reddit.com/chat/room/ aunque reddit.com esté bloqueado", () => {
    mockDay(1);
    const sites = [{ domain: "reddit.com", days: allDays }];
    expect(isBlocked("https://www.reddit.com/chat/room/abc123", sites)).toBe(false);
  });

  test("sigue bloqueando reddit.com fuera de /chat/room/", () => {
    mockDay(1);
    const sites = [{ domain: "reddit.com", days: allDays }];
    expect(isBlocked("https://www.reddit.com/r/programming", sites)).toBe(true);
  });

  test("retorna false para URLs inválidas", () => {
    mockDay(1);
    const sites = [{ domain: "youtube.com", days: allDays }];
    expect(isBlocked("no-es-una-url", sites)).toBe(false);
  });

  test("bloquea correctamente con múltiples dominios en la lista", () => {
    mockDay(1);
    const sites = [
      { domain: "reddit.com", days: allDays },
      { domain: "twitter.com", days: allDays },
      { domain: "youtube.com", days: allDays },
    ];
    expect(isBlocked("https://twitter.com/home", sites)).toBe(true);
    expect(isBlocked("https://github.com/", sites)).toBe(false);
  });
});
