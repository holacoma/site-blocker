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

const allDays = [0, 1, 2, 3, 4, 5, 6];
const SITES = [{ domain: "reddit.com", days: allDays, timerMinutes: 30 }];

// ─── onCommitted ──────────────────────────────────────────────────────────────

describe("onCommitted", () => {
  afterEach(() => vi.clearAllMocks());

  test("registra el hostname del tab en storage.session", () => {
    chrome.storage.session.get.mockImplementation((_d, cb) => cb({ tabHostnames: {} }));
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

  test("pausa el timer al navegar a una página always-allowed (youtube.com → music.youtube.com)", () => {
    const expiry = Date.now() + 60_000;
    const ytSites = [{ domain: "youtube.com", days: allDays, timerMinutes: 30 }];
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

// ─── onRemoved ────────────────────────────────────────────────────────────────

// ─── GET_TIMER_STATE ──────────────────────────────────────────────────────────

describe("GET_TIMER_STATE message handler", () => {
  afterEach(() => vi.clearAllMocks());

  test("retorna null para dominios always-allowed aunque el padre tenga timer activo", () => {
    const sendResponse = vi.fn();
    onMessageHandler({ type: "GET_TIMER_STATE", domain: "music.youtube.com" }, {}, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ expiry: null });
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
