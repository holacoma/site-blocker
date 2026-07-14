// timer-overlay.js is an IIFE content script with no exports.
// We execute it in a vm context with mocked browser globals so we can
// verify the pause/resume state machine without a real browser.

import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "fs";
import { createContext, runInContext } from "vm";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const OVERLAY_SRC = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../content/timer-overlay.js"),
  "utf-8"
);

// Flush pending microtasks (fetch chains inside templatesReady, etc.)
const flush = () => new Promise((r) => setTimeout(r, 20));

function makeFakeEl() {
  const el = {
    id: "", className: "", textContent: "", title: "", rel: "", href: "",
    style: { setProperty: vi.fn(), removeProperty: vi.fn(), cssText: "" },
    classList: { add: vi.fn(), remove: vi.fn() },
    dataset: {},
    addEventListener: vi.fn(),
    appendChild: vi.fn(() => makeFakeEl()),
    remove: vi.fn(),
    // querySelector returns a fake element so bar-fill / sb-time don't throw
    querySelector: vi.fn(() => ({
      style: { setProperty: vi.fn() },
      textContent: "",
      addEventListener: vi.fn(),
      appendChild: vi.fn(() => makeFakeEl()),
    })),
    querySelectorAll: vi.fn(() => { const a = []; a.forEach = Array.prototype.forEach.bind(a); return a; }),
    content: { cloneNode: vi.fn(() => makeFakeEl()) },
    get innerHTML() { return ""; },
    set innerHTML(_) {},
  };
  return el;
}

function buildOverlay(hostname = "reddit.com") {
  const storageListeners = [];
  const sendMsgCalls = [];
  const timeoutCallbacks = [];
  let nextIntervalId = 100;
  let activeIntervalId = null;
  let intervalWasCleared = false;

  const setIntervalMock = vi.fn((_fn) => {
    const id = nextIntervalId++;
    activeIntervalId = id;
    return id;
  });

  const clearIntervalMock = vi.fn((id) => {
    if (id === activeIntervalId) {
      intervalWasCleared = true;
      activeIntervalId = null;
    }
  });

  const chrome = {
    storage: {
      onChanged: {
        addListener: vi.fn((fn) => storageListeners.push(fn)),
        removeListener: vi.fn((fn) => {
          const i = storageListeners.indexOf(fn);
          if (i !== -1) storageListeners.splice(i, 1);
        }),
      },
      local: {
        get: vi.fn((_, cb) =>
          cb({ overlayBarTheme: "dots", overlayBarPosition: "bottom", overlayExpiryTheme: "blur", darkMode: true })
        ),
      },
    },
    runtime: {
      sendMessage: vi.fn((msg, cb) => sendMsgCalls.push({ msg, cb })),
      getURL: vi.fn((p) => `chrome-extension://fake/${p}`),
    },
    i18n: {
      getMessage: vi.fn(() => "Site blocked"),
    },
  };

  const ctx = createContext({
    chrome,
    document: {
      createElement: vi.fn(() => makeFakeEl()),
      head: { appendChild: vi.fn() },
      body: { appendChild: vi.fn() },
      documentElement: { appendChild: vi.fn() },
      getElementById: vi.fn(() => null),
    },
    location: { hostname },
    fetch: vi.fn(() => Promise.resolve({ text: () => Promise.resolve("<div></div>") })),
    setInterval: setIntervalMock,
    clearInterval: clearIntervalMock,
    setTimeout: vi.fn((fn) => { timeoutCallbacks.push(fn); return timeoutCallbacks.length; }),
    clearTimeout: vi.fn(),
    requestAnimationFrame: vi.fn((fn) => { fn(); return 0; }),
    matchMedia: vi.fn(() => ({ matches: true })),
    Promise, Date, Math, String, Number, Array, Object, Boolean, Symbol,
  });

  runInContext(OVERLAY_SRC, ctx);

  return {
    chrome,
    storageListeners,
    sendMsgCalls,
    timeoutCallbacks,
    setIntervalMock,
    clearIntervalMock,
    intervalWasCleared: () => intervalWasCleared,
    setIntervalCallCount: () => setIntervalMock.mock.calls.length,
  };
}

describe("timer-overlay — pause/resume state machine", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("keeps the storage listener active after the overlay starts", async () => {
    const { storageListeners, sendMsgCalls, chrome } = buildOverlay();

    // Simulate service worker responding: timer is active
    sendMsgCalls.shift()?.cb({ expiry: Date.now() + 60_000 });
    await flush();

    // The listener must NOT be removed — it needs to respond to future pauses.
    // Regression: old code called removeListener() inside startIfValid().
    expect(chrome.storage.onChanged.removeListener).not.toHaveBeenCalled();
    expect(storageListeners.length).toBe(1);
  });

  it("clears the running interval when the service worker pauses the timer", async () => {
    const { storageListeners, sendMsgCalls, intervalWasCleared } = buildOverlay();

    // Start the overlay
    sendMsgCalls.shift()?.cb({ expiry: Date.now() + 60_000 });
    await flush();

    // Simulate service worker deleting activeTimers[domain] (tab switch / focus lost)
    storageListeners[0]?.({ activeTimers: {} }, "local");
    // onStorageChange sends GET_TIMER_STATE → service worker says no active timer
    sendMsgCalls.shift()?.cb({ expiry: null });

    expect(intervalWasCleared()).toBe(true);
  });

  it("can restart the overlay when the timer is resumed after a pause", async () => {
    const { storageListeners, sendMsgCalls, setIntervalCallCount } = buildOverlay();

    // Start
    sendMsgCalls.shift()?.cb({ expiry: Date.now() + 60_000 });
    await flush();
    const callsAfterStart = setIntervalCallCount();
    expect(callsAfterStart).toBe(1);

    // Pause (user switched away from the blocked site)
    storageListeners[0]?.({ activeTimers: {} }, "local");
    sendMsgCalls.shift()?.cb({ expiry: null });

    // Resume (user switched back)
    storageListeners[0]?.({ activeTimers: {} }, "local");
    sendMsgCalls.shift()?.cb({ expiry: Date.now() + 30_000 });
    await flush();

    // A second interval must be created for the resumed timer
    expect(setIntervalCallCount()).toBeGreaterThan(callsAfterStart);
  });

  it("requests \"border\" as the default bar theme when nothing is stored", async () => {
    const { chrome, sendMsgCalls } = buildOverlay();

    sendMsgCalls.shift()?.cb({ expiry: Date.now() + 60_000 });
    await flush();

    expect(chrome.storage.local.get.mock.calls[0][0]).toEqual({
      overlayBarTheme: "border",
      overlayBarPosition: "bottom",
      overlayExpiryTheme: "blur",
    });
  });

  it("sends REDIRECT_TO_BLOCKED (not chrome-extension://invalid/) after block transition", async () => {
    const { sendMsgCalls, timeoutCallbacks, setIntervalMock } = buildOverlay("reddit.com");

    const nowBase = Date.now();
    sendMsgCalls.shift()?.cb({ expiry: nowBase + 60_000 });
    await flush();

    // Advance Date.now past expiry and fire the normal-phase bar interval
    const dateSpy = vi.spyOn(Date, "now").mockReturnValue(nowBase + 120_000);
    setIntervalMock.mock.calls[0][0](); // remaining <= 0 → startExpiryPhase()

    // Advance Date.now past expiryEnd (set at nowBase+120_000+30_000) and fire expiry ticker
    dateSpy.mockReturnValue(nowBase + 200_000);
    setIntervalMock.mock.calls[1][0](); // msLeft = 0 → startBlockTransition("reddit.com")

    // startBlockTransition queued a setTimeout; fire it now
    expect(timeoutCallbacks).toHaveLength(1);
    timeoutCallbacks[0]();

    expect(sendMsgCalls).toHaveLength(1);
    expect(sendMsgCalls[0].msg).toEqual({ type: "REDIRECT_TO_BLOCKED", site: "reddit.com" });
  });
});
