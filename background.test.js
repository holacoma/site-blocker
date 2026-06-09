const {
  ALWAYS_ALLOWED,
  normalizeSites,
  isActiveToday,
  isAlwaysAllowed,
  isBlocked,
  findSiteEntry,
  shouldAutoStart,
} = require("./background");

// ─── normalizeSites ───────────────────────────────────────────────────────────

describe("normalizeSites", () => {
  test("convierte strings a objetos con todos los días", () => {
    const result = normalizeSites(["youtube.com"]);
    expect(result).toEqual([{ domain: "youtube.com", days: [0, 1, 2, 3, 4, 5, 6], timerMinutes: 0 }]);
  });

  test("agrega timerMinutes: 0 a objetos sin ese campo", () => {
    const entry = { domain: "reddit.com", days: [1, 2, 3] };
    expect(normalizeSites([entry])).toEqual([{ ...entry, timerMinutes: 0 }]);
  });

  test("respeta timerMinutes existente en el objeto", () => {
    const entry = { domain: "reddit.com", days: [1, 2, 3], timerMinutes: 30 };
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

// ─── isBlocked — timer bypass ─────────────────────────────────────────────────

describe("isBlocked — timer bypass", () => {
  afterEach(() => jest.restoreAllMocks());

  const allDays = [0, 1, 2, 3, 4, 5, 6];

  function mockDay(day) {
    jest.spyOn(Date.prototype, "getDay").mockReturnValue(day);
  }

  test("permite acceso cuando hay un timer activo para el dominio", () => {
    mockDay(1);
    const sites = [{ domain: "reddit.com", days: allDays }];
    const activeTimers = { "reddit.com": Date.now() + 60_000 };
    expect(isBlocked("https://reddit.com/r/programming", sites, activeTimers)).toBe(false);
  });

  test("bloquea de nuevo cuando el timer expiró", () => {
    mockDay(1);
    const sites = [{ domain: "reddit.com", days: allDays }];
    const activeTimers = { "reddit.com": Date.now() - 1 };
    expect(isBlocked("https://reddit.com/r/programming", sites, activeTimers)).toBe(true);
  });

  test("el timer de un dominio no afecta a otros dominios", () => {
    mockDay(1);
    const sites = [
      { domain: "reddit.com", days: allDays },
      { domain: "twitter.com", days: allDays },
    ];
    const activeTimers = { "reddit.com": Date.now() + 60_000 };
    expect(isBlocked("https://reddit.com/", sites, activeTimers)).toBe(false);
    expect(isBlocked("https://twitter.com/", sites, activeTimers)).toBe(true);
  });

  test("el timer aplica a www del dominio (www stripping)", () => {
    mockDay(1);
    const sites = [{ domain: "reddit.com", days: allDays }];
    const activeTimers = { "reddit.com": Date.now() + 60_000 };
    expect(isBlocked("https://www.reddit.com/r/programming", sites, activeTimers)).toBe(false);
  });

  test("activeTimers vacío no cambia el comportamiento de bloqueo por día", () => {
    mockDay(1);
    const sites = [{ domain: "reddit.com", days: allDays }];
    expect(isBlocked("https://reddit.com/", sites, {})).toBe(true);
  });

  test("activeTimers undefined es retro-compatible (usa default {})", () => {
    mockDay(1);
    const sites = [{ domain: "reddit.com", days: allDays }];
    expect(isBlocked("https://reddit.com/", sites, undefined)).toBe(true);
  });
});

// ─── findSiteEntry ────────────────────────────────────────────────────────────

describe("findSiteEntry", () => {
  const sites = [
    { domain: "reddit.com",  days: [1,2,3,4,5], timerMinutes: 30 },
    { domain: "youtube.com", days: [0,1,2,3,4,5,6], timerMinutes: 0 },
  ];

  test("encuentra entrada por dominio exacto", () => {
    const entry = findSiteEntry("reddit.com", sites);
    expect(entry?.domain).toBe("reddit.com");
  });

  test("encuentra entrada ignorando www del hostname", () => {
    const entry = findSiteEntry("www.reddit.com".replace(/^www\./, ""), sites);
    expect(entry?.domain).toBe("reddit.com");
  });

  test("encuentra entrada para subdominio del dominio bloqueado", () => {
    const entry = findSiteEntry("old.reddit.com", sites);
    expect(entry?.domain).toBe("reddit.com");
  });

  test("retorna null si no hay match", () => {
    expect(findSiteEntry("github.com", sites)).toBeNull();
  });
});

// ─── onBeforeNavigate — pause on departure ───────────────────────────────────

describe("onBeforeNavigate — pause timer on departure", () => {
  const allDays = [0, 1, 2, 3, 4, 5, 6];
  const SITES = [{ domain: "reddit.com", days: allDays, timerMinutes: 30 }];

  let beforeNavigateHandler;
  let committedHandler;

  beforeAll(() => {
    beforeNavigateHandler =
      chrome.webNavigation.onBeforeNavigate.addListener.mock.calls[0][0];
    committedHandler =
      chrome.webNavigation.onCommitted.addListener.mock.calls[0][0];
  });

  afterEach(() => jest.clearAllMocks());

  test("onCommitted registra el hostname del tab en storage.session", () => {
    chrome.storage.session.get.mockImplementation((_d, cb) => cb({ tabHostnames: {} }));
    committedHandler({ tabId: 42, frameId: 0, url: "https://reddit.com/r/programming" });
    const setCall = chrome.storage.session.set.mock.calls[0];
    expect(setCall[0].tabHostnames["42"]).toBe("reddit.com");
  });

  test("pausa el timer al navegar fuera del dominio bloqueado", () => {
    const expiry = Date.now() + 60_000;

    chrome.storage.session.get.mockImplementation((_d, cb) =>
      cb({ tabHostnames: { "1": "reddit.com" } })
    );
    chrome.storage.sync.get.mockImplementation((_d, cb) => cb({ blockedSites: SITES }));
    chrome.storage.local.get.mockImplementation((_d, cb) =>
      cb({ activeTimers: { "reddit.com": expiry }, usedTimerDates: {}, pausedTimers: {} })
    );

    beforeNavigateHandler({ tabId: 1, frameId: 0, url: "https://github.com/" });

    const setCalls = chrome.storage.local.set.mock.calls;
    const pauseCall = setCalls.find(([data]) => data.pausedTimers?.["reddit.com"] > 0);
    expect(pauseCall).toBeDefined();
    expect(pauseCall[0].activeTimers["reddit.com"]).toBeUndefined();
  });

  test("reanuda el timer al volver al dominio bloqueado", () => {
    const remaining = 45_000;

    chrome.storage.session.get.mockImplementation((_d, cb) =>
      cb({ tabHostnames: { "1": "github.com" } })
    );
    chrome.storage.sync.get.mockImplementation((_d, cb) => cb({ blockedSites: SITES }));
    chrome.storage.local.get.mockImplementation((_d, cb) =>
      cb({
        activeTimers: {},
        usedTimerDates: { "reddit.com": "2026-06-08" },
        pausedTimers: { "reddit.com": remaining },
      })
    );

    beforeNavigateHandler({ tabId: 1, frameId: 0, url: "https://reddit.com/" });

    const setCalls = chrome.storage.local.set.mock.calls;
    const resumeCall = setCalls.find(([data]) => data.activeTimers?.["reddit.com"] > 0);
    expect(resumeCall).toBeDefined();
    expect(resumeCall[0].pausedTimers?.["reddit.com"]).toBeUndefined();
  });

  test("no pausa si la navegación es dentro del mismo dominio bloqueado", () => {
    const expiry = Date.now() + 60_000;

    chrome.storage.session.get.mockImplementation((_d, cb) =>
      cb({ tabHostnames: { "1": "reddit.com" } })
    );
    chrome.storage.sync.get.mockImplementation((_d, cb) => cb({ blockedSites: SITES }));
    chrome.storage.local.get.mockImplementation((_d, cb) =>
      cb({ activeTimers: { "reddit.com": expiry }, usedTimerDates: {}, pausedTimers: {} })
    );

    beforeNavigateHandler({ tabId: 1, frameId: 0, url: "https://reddit.com/r/programming" });

    const setCalls = chrome.storage.local.set.mock.calls;
    const pauseCall = setCalls.find(([data]) => data.pausedTimers?.["reddit.com"] > 0);
    expect(pauseCall).toBeUndefined();
  });
});

// ─── shouldAutoStart ──────────────────────────────────────────────────────────

describe("shouldAutoStart", () => {
  const TODAY = "2026-06-07";
  const YESTERDAY = "2026-06-06";
  const entry30 = { domain: "reddit.com", days: [1,2,3,4,5], timerMinutes: 30 };
  const entry0  = { domain: "reddit.com", days: [1,2,3,4,5], timerMinutes: 0 };

  test("retorna true si timerMinutes > 0 y no se usó hoy", () => {
    expect(shouldAutoStart("reddit.com", entry30, {}, TODAY)).toBe(true);
  });

  test("retorna false si ya se usó hoy", () => {
    expect(shouldAutoStart("reddit.com", entry30, { "reddit.com": TODAY }, TODAY)).toBe(false);
  });

  test("retorna true si la fecha guardada es de ayer (nuevo día)", () => {
    expect(shouldAutoStart("reddit.com", entry30, { "reddit.com": YESTERDAY }, TODAY)).toBe(true);
  });

  test("retorna false si timerMinutes === 0", () => {
    expect(shouldAutoStart("reddit.com", entry0, {}, TODAY)).toBe(false);
  });

  test("retorna false si siteEntry es null", () => {
    expect(shouldAutoStart("reddit.com", null, {}, TODAY)).toBe(false);
  });

  test("retorna false si siteEntry es undefined", () => {
    expect(shouldAutoStart("reddit.com", undefined, {}, TODAY)).toBe(false);
  });
});
