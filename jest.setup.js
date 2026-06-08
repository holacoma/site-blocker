global.chrome = {
  runtime: {
    getURL: (path) => `chrome-extension://test/${path}`,
    onMessage: { addListener: jest.fn() },
  },
  storage: {
    sync: { get: jest.fn() },
    local: { get: jest.fn(), set: jest.fn() },
  },
  webNavigation: { onBeforeNavigate: { addListener: jest.fn() } },
  tabs: { update: jest.fn() },
};
