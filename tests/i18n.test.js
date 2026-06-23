import { describe, it, expect, beforeEach, vi } from "vitest";
import { initLang, getLang, setLang } from "../shared/i18n.js";

beforeEach(() => {
  setLang("es");
  vi.restoreAllMocks();
});

describe("initLang", () => {
  it("uses stored language when present", async () => {
    chrome.storage.local.get.mockImplementation((_key, cb) => {
      if (cb) cb({ language: "en" });
      else return Promise.resolve({ language: "en" });
    });
    chrome.i18n.getUILanguage.mockReturnValue("es");

    await initLang();

    expect(getLang()).toBe("en");
  });

  it("falls back to browser UI language when no preference is stored", async () => {
    chrome.storage.local.get.mockImplementation((_key, cb) => {
      if (cb) cb({});
      else return Promise.resolve({});
    });
    chrome.i18n.getUILanguage.mockReturnValue("en-US");

    await initLang();

    expect(getLang()).toBe("en");
  });

  it("strips region code from UI language", async () => {
    chrome.storage.local.get.mockImplementation((_key, cb) => {
      if (cb) cb({});
      else return Promise.resolve({});
    });
    chrome.i18n.getUILanguage.mockReturnValue("es-AR");

    await initLang();

    expect(getLang()).toBe("es");
  });

  it("falls back to es when browser language is unsupported", async () => {
    chrome.storage.local.get.mockImplementation((_key, cb) => {
      if (cb) cb({});
      else return Promise.resolve({});
    });
    chrome.i18n.getUILanguage.mockReturnValue("fr-FR");

    await initLang();

    expect(getLang()).toBe("es");
  });

  it("ignores browser language when user has a saved preference", async () => {
    chrome.storage.local.get.mockImplementation((_key, cb) => {
      if (cb) cb({ language: "es" });
      else return Promise.resolve({ language: "es" });
    });
    chrome.i18n.getUILanguage.mockReturnValue("en-US");

    await initLang();

    expect(getLang()).toBe("es");
  });
});
