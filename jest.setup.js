global.chrome = {
  runtime: {
    getURL: (path) => `chrome-extension://test/${path}`,
    onMessage: { addListener: jest.fn() },
  },
  storage: {
    sync: { get: jest.fn() },
    local: { get: jest.fn(), set: jest.fn() },
    session: { get: jest.fn(), set: jest.fn() },
  },
  webNavigation: {
    onBeforeNavigate: { addListener: jest.fn() },
    onCommitted: { addListener: jest.fn() },
  },
  tabs: {
    update: jest.fn(),
    get: jest.fn(),
    query: jest.fn().mockImplementation((_q, cb) => cb([])),
    onRemoved: { addListener: jest.fn() },
    onActivated: { addListener: jest.fn() },
  },
  windows: {
    onFocusChanged: { addListener: jest.fn() },
    WINDOW_ID_NONE: -1,
  },
};
