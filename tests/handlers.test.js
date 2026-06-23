import "../src/handlers.js";

// Capture handlers from the addListener calls made at module load time
const beforeNavigateHandler =
  chrome.webNavigation.onBeforeNavigate.addListener.mock.calls[0][0];
const committedHandler =
  chrome.webNavigation.onCommitted.addListener.mock.calls[0][0];
const onActivatedHandler =
  chrome.tabs.onActivated.addListener.mock.calls[0][0];
const onFocusChangedHandler =
  chrome.windows.onFocusChanged.addListener.mock.calls[0][0];
const onRemovedCalls = chrome.tabs.onRemoved.addListener.mock.calls;
const onRemovedHandler = onRemovedCalls[onRemovedCalls.length - 1][0];

const onMessageHandler = chrome.runtime.onMessage.addListener.mock.calls[0][0];
const onStartupHandler = chrome.runtime.onStartup.addListener.mock.calls[0][0];

const allDays = [0, 1, 2, 3, 4, 5, 6];
const SITES = [{ domain: "reddit.com", days: allDays, timerMinutes: 30, exceptions: [] }];

// ─── onCommitted ──────────────────────────────────────────────────────────────

describe("onCommitted", () => {
  afterEach(() => vi.clearAllMocks());

  test("registra el hostname del tab en storage.session", () => {
    chrome.storage.session.get.mockImplementation((_d, cb) =>
      cb({ tabHostnames: {}, activeTabPerWindow: {} })
    );
    chrome.tabs.get.mockImplementation((_id, cb) => cb({ windowId: 1, active: false }));
    committedHandler({ tabId: 42, frameId: 0, url: "https://reddit.com/r/programming" });
    const setCall = chrome.storage.session.set.mock.calls[0];
    expect(setCall[0].tabHostnames["42"]).toBe("reddit.com");
  });

  test("ignora frames que no son el frame principal", () => {
    committedHandler({ tabId: 42, frameId: 1, url: "https://reddit.com/" });
    expect(chrome.storage.session.get).not.toHaveBeenCalled();
  });
});

// ─── onBeforeNavigate — pause/resume timer ────────────────────────────────────

describe("onBeforeNavigate — pause timer on departure", () => {
  afterEach(() => vi.clearAllMocks());

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

  test("pausa el timer al navegar a excepción del sitio (youtube.com → music.youtube.com)", () => {
    const expiry = Date.now() + 60_000;
    const ytSites = [{ domain: "youtube.com", days: allDays, timerMinutes: 30, exceptions: ["music.youtube.com"] }];
    chrome.storage.session.get.mockImplementation((_d, cb) =>
      cb({ tabHostnames: { "1": "youtube.com" } })
    );
    chrome.storage.sync.get.mockImplementation((_d, cb) => cb({ blockedSites: ytSites }));
    chrome.storage.local.get.mockImplementation((_d, cb) =>
      cb({ activeTimers: { "youtube.com": expiry }, usedTimerDates: {}, pausedTimers: {} })
    );

    beforeNavigateHandler({ tabId: 1, frameId: 0, url: "https://music.youtube.com/" });

    const pauseCall = chrome.storage.local.set.mock.calls
      .find(([d]) => d.pausedTimers?.["youtube.com"] > 0);
    expect(pauseCall).toBeDefined();
    expect(pauseCall[0].activeTimers["youtube.com"]).toBeUndefined();
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

// ─── onCommitted — sync activeTabPerWindow ────────────────────────────────────

describe("onCommitted — sincroniza activeTabPerWindow", () => {
  afterEach(() => vi.clearAllMocks());

  // Regression: al recargar la extension, activeTabPerWindow queda vacío.
  // Si el usuario ya estaba en la pestaña bloqueada y navega dentro de ella,
  // onCommitted debe registrar esa pestaña como activa en su ventana.
  // Sin esto, al cambiar de pestaña onActivated no conoce la pestaña anterior
  // y no llama pauseTimerForTab → el timer sigue corriendo.
  test("registra la pestaña activa en activeTabPerWindow cuando navega en primer plano", () => {
    let sessionStore = { tabHostnames: {}, activeTabPerWindow: {} };
    chrome.storage.session.get.mockImplementation((_d, cb) => cb({ ...sessionStore }));
    chrome.storage.session.set.mockImplementation((data) => { Object.assign(sessionStore, data); });
    chrome.tabs.get.mockImplementation((_id, cb) => cb({ windowId: 99, active: true }));

    committedHandler({ tabId: 7, frameId: 0, url: "https://reddit.com/r/programming" });

    expect(sessionStore.activeTabPerWindow["99"]).toBe(7);
  });

  test("no modifica activeTabPerWindow si la pestaña está en background", () => {
    let sessionStore = { tabHostnames: {}, activeTabPerWindow: { "99": 5 } };
    chrome.storage.session.get.mockImplementation((_d, cb) => cb({ ...sessionStore }));
    chrome.storage.session.set.mockImplementation((data) => { Object.assign(sessionStore, data); });
    chrome.tabs.get.mockImplementation((_id, cb) => cb({ windowId: 99, active: false }));

    committedHandler({ tabId: 7, frameId: 0, url: "https://reddit.com/r/programming" });

    expect(sessionStore.activeTabPerWindow["99"]).toBe(5);
  });
});

// ─── onActivated — tab-switch pause/resume ────────────────────────────────────

describe("onActivated — tab-switch pause/resume", () => {
  afterEach(() => vi.clearAllMocks());

  function mockSessionGet(tabHostnames, activeTabPerWindow = {}) {
    chrome.storage.session.get.mockImplementation((defaults, cb) => {
      if ("activeTabPerWindow" in defaults) cb({ activeTabPerWindow });
      else cb({ tabHostnames });
    });
  }

  test("pausa el timer del tab anterior al cambiar de tab", () => {
    const expiry = Date.now() + 60_000;
    mockSessionGet({ "10": "reddit.com" }, { "1": 10 });
    chrome.storage.sync.get.mockImplementation((_d, cb) => cb({ blockedSites: SITES }));
    chrome.storage.local.get.mockImplementation((_d, cb) =>
      cb({ activeTimers: { "reddit.com": expiry }, usedTimerDates: {}, pausedTimers: {} })
    );

    onActivatedHandler({ tabId: 20, windowId: 1 });

    const setCalls = chrome.storage.local.set.mock.calls;
    const pauseCall = setCalls.find(([d]) => d.pausedTimers?.["reddit.com"] > 0);
    expect(pauseCall).toBeDefined();
    expect(pauseCall[0].activeTimers["reddit.com"]).toBeUndefined();
  });

  test("reanuda el timer del tab nuevo al cambiar a él", () => {
    const remaining = 45_000;
    mockSessionGet({ "20": "reddit.com" }, { "1": 10 });
    chrome.storage.sync.get.mockImplementation((_d, cb) => cb({ blockedSites: SITES }));
    chrome.storage.local.get.mockImplementation((_d, cb) =>
      cb({ activeTimers: {}, usedTimerDates: {}, pausedTimers: { "reddit.com": remaining } })
    );

    onActivatedHandler({ tabId: 20, windowId: 1 });

    const setCalls = chrome.storage.local.set.mock.calls;
    const resumeCall = setCalls.find(([d]) => d.activeTimers?.["reddit.com"] > 0);
    expect(resumeCall).toBeDefined();
    expect(resumeCall[0].pausedTimers?.["reddit.com"]).toBeUndefined();
  });

  test("no-op cuando el tab anterior no tenía timer activo", () => {
    mockSessionGet({ "10": "reddit.com" }, { "1": 10 });
    chrome.storage.sync.get.mockImplementation((_d, cb) => cb({ blockedSites: SITES }));
    chrome.storage.local.get.mockImplementation((_d, cb) =>
      cb({ activeTimers: {}, usedTimerDates: {}, pausedTimers: {} })
    );

    onActivatedHandler({ tabId: 20, windowId: 1 });

    const setCalls = chrome.storage.local.set.mock.calls;
    expect(setCalls.find(([d]) => d.pausedTimers?.["reddit.com"] > 0)).toBeUndefined();
  });

  test("no-op resume cuando el tab nuevo no tiene timer pausado", () => {
    mockSessionGet({ "20": "reddit.com" }, { "1": 10 });
    chrome.storage.sync.get.mockImplementation((_d, cb) => cb({ blockedSites: SITES }));
    chrome.storage.local.get.mockImplementation((_d, cb) =>
      cb({ activeTimers: {}, usedTimerDates: {}, pausedTimers: {} })
    );

    onActivatedHandler({ tabId: 20, windowId: 1 });

    const setCalls = chrome.storage.local.set.mock.calls;
    expect(setCalls.find(([d]) => d.activeTimers?.["reddit.com"] > 0)).toBeUndefined();
  });
});

// ─── onFocusChanged ───────────────────────────────────────────────────────────

describe("onFocusChanged", () => {
  afterEach(() => vi.clearAllMocks());

  test("WINDOW_ID_NONE: pausa todos los timers activos", () => {
    const now = Date.now();
    chrome.storage.local.get.mockImplementation((_d, cb) =>
      cb({
        activeTimers: { "reddit.com": now + 60_000, "twitter.com": now + 30_000 },
        pausedTimers: {},
      })
    );

    onFocusChangedHandler(-1);

    const setCalls = chrome.storage.local.set.mock.calls;
    const call = setCalls.find(([d]) => d.pausedTimers?.["reddit.com"] > 0);
    expect(call).toBeDefined();
    expect(call[0].pausedTimers["twitter.com"]).toBeGreaterThan(0);
    expect(Object.keys(call[0].activeTimers)).toHaveLength(0);
  });

  test("windowId: reanuda el timer del tab activo en esa ventana", () => {
    const remaining = 50_000;
    chrome.storage.session.get.mockImplementation((_d, cb) => {
      if ("activeTabPerWindow" in _d) cb({ activeTabPerWindow: { "1": 42 } });
      else cb({ tabHostnames: { "42": "reddit.com" } });
    });
    chrome.storage.sync.get.mockImplementation((_d, cb) => cb({ blockedSites: SITES }));
    chrome.storage.local.get.mockImplementation((_d, cb) =>
      cb({ activeTimers: {}, usedTimerDates: {}, pausedTimers: { "reddit.com": remaining } })
    );

    onFocusChangedHandler(1);

    const setCalls = chrome.storage.local.set.mock.calls;
    expect(setCalls.find(([d]) => d.activeTimers?.["reddit.com"] > 0)).toBeDefined();
  });
});

// ─── GET_TIMER_STATE ──────────────────────────────────────────────────────────

describe("GET_TIMER_STATE message handler", () => {
  afterEach(() => vi.clearAllMocks());

  test("retorna null para dominios que son excepción del sitio padre", () => {
    const sendResponse = vi.fn();
    const ytSites = [{ domain: "youtube.com", days: allDays, timerMinutes: 30, exceptions: ["music.youtube.com"] }];
    chrome.storage.sync.get.mockImplementation((_d, cb) => cb({ blockedSites: ytSites }));
    onMessageHandler({ type: "GET_TIMER_STATE", domain: "music.youtube.com" }, {}, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ expiry: null });
  });

  // Bug: el test anterior no mockeaba activeTimers, entonces pasaba aunque
  // isAlwaysAllowed estuviera roto (ambos caminos devuelven null).
  // Este test verifica el caso real: timer activo del padre + excepción.
  test("retorna null para excepción aunque el timer del padre esté corriendo", () => {
    const expiry = Date.now() + 30_000;
    const sendResponse = vi.fn();
    const ytSites = [{ domain: "youtube.com", days: allDays, timerMinutes: 30, exceptions: ["music.youtube.com"] }];
    chrome.storage.sync.get.mockImplementation((_d, cb) => cb({ blockedSites: ytSites }));
    chrome.storage.local.get.mockImplementation((_d, cb) => cb({ activeTimers: { "youtube.com": expiry } }));
    onMessageHandler({ type: "GET_TIMER_STATE", domain: "music.youtube.com" }, {}, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ expiry: null });
  });

  test("devuelve el expiry del timer activo para el dominio bloqueado (popup)", () => {
    const expiry = Date.now() + 30_000;
    const sendResponse = vi.fn();
    chrome.storage.sync.get.mockImplementation((_d, cb) => cb({ blockedSites: SITES }));
    chrome.storage.local.get.mockImplementation((_d, cb) =>
      cb({ activeTimers: { "reddit.com": expiry }, pausedTimers: {} })
    );
    onMessageHandler({ type: "GET_TIMER_STATE", domain: "reddit.com" }, {}, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ expiry });
  });

  // El popup debe mostrar tiempo restante aunque el timer esté en pausa
  // (el usuario tiene tiempo sin usar, pero está en otro tab)
  test("incluye pausedRemaining cuando el timer está pausado", () => {
    const remaining = 45_000;
    const sendResponse = vi.fn();
    chrome.storage.sync.get.mockImplementation((_d, cb) => cb({ blockedSites: SITES }));
    chrome.storage.local.get.mockImplementation((_d, cb) =>
      cb({ activeTimers: {}, pausedTimers: { "reddit.com": remaining } })
    );
    onMessageHandler({ type: "GET_TIMER_STATE", domain: "reddit.com" }, {}, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ expiry: null, pausedRemaining: remaining });
  });
});

// ─── onRemoved ────────────────────────────────────────────────────────────────

describe("onRemoved", () => {
  afterEach(() => vi.clearAllMocks());

  test("pausa el timer cuando se cierra el tab", () => {
    const expiry = Date.now() + 60_000;
    chrome.storage.session.get.mockImplementation((defaults, cb) => {
      if ("tabHostnames" in defaults && "activeTabPerWindow" in defaults)
        cb({ tabHostnames: { "5": "reddit.com" }, activeTabPerWindow: { "1": 5 } });
      else if ("activeTabPerWindow" in defaults)
        cb({ activeTabPerWindow: { "1": 5 } });
      else
        cb({ tabHostnames: { "5": "reddit.com" } });
    });
    chrome.storage.sync.get.mockImplementation((_d, cb) => cb({ blockedSites: SITES }));
    chrome.storage.local.get.mockImplementation((_d, cb) =>
      cb({ activeTimers: { "reddit.com": expiry }, usedTimerDates: {}, pausedTimers: {} })
    );

    onRemovedHandler(5, { windowId: 1 });

    const setCalls = chrome.storage.local.set.mock.calls;
    const pauseCall = setCalls.find(([d]) => d.pausedTimers?.["reddit.com"] > 0);
    expect(pauseCall).toBeDefined();
    expect(pauseCall[0].activeTimers["reddit.com"]).toBeUndefined();
  });

  test("no-op cuando el tab cerrado no tenía timer activo", () => {
    chrome.storage.session.get.mockImplementation((defaults, cb) => {
      if ("tabHostnames" in defaults && "activeTabPerWindow" in defaults)
        cb({ tabHostnames: { "5": "reddit.com" }, activeTabPerWindow: {} });
      else if ("activeTabPerWindow" in defaults)
        cb({ activeTabPerWindow: {} });
      else
        cb({ tabHostnames: { "5": "reddit.com" } });
    });
    chrome.storage.sync.get.mockImplementation((_d, cb) => cb({ blockedSites: SITES }));
    chrome.storage.local.get.mockImplementation((_d, cb) =>
      cb({ activeTimers: {}, usedTimerDates: {}, pausedTimers: {} })
    );

    onRemovedHandler(5, { windowId: 1 });

    const setCalls = chrome.storage.local.set.mock.calls;
    expect(setCalls.find(([d]) => d.pausedTimers?.["reddit.com"] > 0)).toBeUndefined();
  });
});

// ─── onStartup ────────────────────────────────────────────────────────────────

describe("onStartup", () => {
  afterEach(() => vi.clearAllMocks());

  test("reconstruye tabHostnames en session y pausa tabs en background", () => {
    const expiry = Date.now() + 60_000;
    const allTabs = [
      { id: 1, url: "https://reddit.com/r/programming" },
      { id: 2, url: "https://github.com/" },
    ];
    let sessionStore = { tabHostnames: {} };
    chrome.tabs.query
      .mockImplementationOnce((_q, cb) => cb(allTabs))
      .mockImplementationOnce((_q, cb) => cb([{ id: 2, url: "https://github.com/" }]));
    chrome.storage.session.set.mockImplementation((data) => {
      Object.assign(sessionStore, data);
    });
    chrome.storage.session.get.mockImplementation((_d, cb) => cb({ ...sessionStore }));
    chrome.storage.sync.get.mockImplementation((_d, cb) => cb({ blockedSites: SITES }));
    chrome.storage.local.get.mockImplementation((_d, cb) =>
      cb({ activeTimers: { "reddit.com": expiry }, usedTimerDates: {}, pausedTimers: {} })
    );

    onStartupHandler();

    expect(sessionStore.tabHostnames["1"]).toBe("reddit.com");
    expect(sessionStore.tabHostnames["2"]).toBe("github.com");

    const localSetCalls = chrome.storage.local.set.mock.calls;
    const pauseCall = localSetCalls.find(([d]) => d.pausedTimers?.["reddit.com"] > 0);
    expect(pauseCall).toBeDefined();
    expect(pauseCall[0].activeTimers["reddit.com"]).toBeUndefined();
  });

  test("no pausa el tab activo", () => {
    const expiry = Date.now() + 60_000;
    const allTabs = [{ id: 1, url: "https://reddit.com/" }];
    let sessionStore = { tabHostnames: {} };
    chrome.tabs.query
      .mockImplementationOnce((_q, cb) => cb(allTabs))
      .mockImplementationOnce((_q, cb) => cb([{ id: 1, url: "https://reddit.com/" }]));
    chrome.storage.session.set.mockImplementation((data) => {
      Object.assign(sessionStore, data);
    });
    chrome.storage.session.get.mockImplementation((_d, cb) => cb({ ...sessionStore }));
    chrome.storage.sync.get.mockImplementation((_d, cb) => cb({ blockedSites: SITES }));
    chrome.storage.local.get.mockImplementation((_d, cb) =>
      cb({ activeTimers: { "reddit.com": expiry }, usedTimerDates: {}, pausedTimers: {} })
    );

    onStartupHandler();

    const localSetCalls = chrome.storage.local.set.mock.calls;
    expect(localSetCalls.find(([d]) => d.pausedTimers?.["reddit.com"] > 0)).toBeUndefined();
  });

  test("ignora tabs sin URL valida al reconstruir tabHostnames", () => {
    chrome.tabs.query
      .mockImplementationOnce((_q, cb) => cb([{ id: 3, url: undefined }, { id: 4, url: "https://reddit.com/" }]))
      .mockImplementationOnce((_q, cb) => cb([{ id: 4, url: "https://reddit.com/" }]));
    let sessionStore = { tabHostnames: {} };
    chrome.storage.session.set.mockImplementation((data) => {
      Object.assign(sessionStore, data);
    });
    chrome.storage.session.get.mockImplementation((_d, cb) => cb({ ...sessionStore }));
    chrome.storage.sync.get.mockImplementation((_d, cb) => cb({ blockedSites: SITES }));
    chrome.storage.local.get.mockImplementation((_d, cb) =>
      cb({ activeTimers: {}, usedTimerDates: {}, pausedTimers: {} })
    );

    onStartupHandler();

    expect(sessionStore.tabHostnames["3"]).toBeUndefined();
    expect(sessionStore.tabHostnames["4"]).toBe("reddit.com");
  });
});
