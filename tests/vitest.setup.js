global.chrome = {
  i18n: {
    getUILanguage: vi.fn().mockReturnValue("es"),
  },
  runtime: {
    getURL: (path) => `chrome-extension://test/${path}`,
    onMessage: { addListener: vi.fn() },
  },
  storage: {
    sync:    { get: vi.fn() },
    local:   { get: vi.fn(), set: vi.fn() },
    session: { get: vi.fn(), set: vi.fn() },
    onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
  },
  webNavigation: {
    onBeforeNavigate: { addListener: vi.fn() },
    onCommitted:      { addListener: vi.fn() },
  },
  tabs: {
    update: vi.fn(),
    get:    vi.fn(),
    query:  vi.fn().mockImplementation((_q, cb) => cb([])),
    onRemoved:   { addListener: vi.fn() },
    onActivated: { addListener: vi.fn() },
  },
  windows: {
    onFocusChanged: { addListener: vi.fn() },
    WINDOW_ID_NONE: -1,
  },
};
