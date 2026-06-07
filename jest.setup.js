global.chrome = {
  runtime: { getURL: (path) => `chrome-extension://test/${path}` },
  storage: { sync: { get: jest.fn() } },
  webNavigation: { onBeforeNavigate: { addListener: jest.fn() } },
  tabs: { update: jest.fn() },
};
