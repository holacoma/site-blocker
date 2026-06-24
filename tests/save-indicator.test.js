import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setLang } from "../shared/i18n.js";
import { flashSave } from "../pages/options/save-indicator.js";

let mockEl;

beforeEach(() => {
  vi.useFakeTimers();
  setLang("es");
  mockEl = { textContent: "", className: "" };
  global.document = { getElementById: vi.fn(() => mockEl) };
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("flashSave", () => {
  it("shows saving state immediately", () => {
    flashSave();
    expect(mockEl.className).toBe("save-ind save-ind--spin");
    expect(mockEl.textContent).toBe("Guardando...");
  });

  it("transitions to saved state after 900ms", () => {
    flashSave();
    vi.advanceTimersByTime(900);
    expect(mockEl.className).toBe("save-ind save-ind--ok");
    expect(mockEl.textContent).toBe("✓ Cambio guardado");
  });

  it("starts fading 2000ms after saved state appears", () => {
    flashSave();
    vi.advanceTimersByTime(900 + 2000);
    expect(mockEl.className).toBe("save-ind save-ind--fade");
  });

  it("resets to hidden after fade completes", () => {
    flashSave();
    vi.advanceTimersByTime(900 + 2000 + 500);
    expect(mockEl.className).toBe("save-ind");
    expect(mockEl.textContent).toBe("");
  });

  it("resets the timer when called again mid-spin", () => {
    flashSave();
    vi.advanceTimersByTime(500);
    flashSave();
    // should NOT have transitioned yet (timer restarted)
    expect(mockEl.className).toBe("save-ind save-ind--spin");
    vi.advanceTimersByTime(900);
    expect(mockEl.className).toBe("save-ind save-ind--ok");
    expect(mockEl.textContent).toBe("✓ Cambio guardado");
  });

  it("uses english strings when lang is en", () => {
    setLang("en");
    flashSave();
    expect(mockEl.textContent).toBe("Saving...");
    vi.advanceTimersByTime(900);
    expect(mockEl.textContent).toBe("✓ Changes saved");
  });

  it("does nothing when element is not found", () => {
    global.document.getElementById = vi.fn(() => null);
    expect(() => flashSave()).not.toThrow();
  });
});
