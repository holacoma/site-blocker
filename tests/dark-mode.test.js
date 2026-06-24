import { describe, test, expect } from "vitest";
import { isDark } from "../shared/dark-mode.js";

describe("isDark", () => {
  test("dark: siempre oscuro sin importar el sistema", () => {
    expect(isDark("dark", true)).toBe(true);
    expect(isDark("dark", false)).toBe(true);
  });

  test("light: siempre claro sin importar el sistema", () => {
    expect(isDark("light", true)).toBe(false);
    expect(isDark("light", false)).toBe(false);
  });

  test("device: sigue la preferencia del sistema", () => {
    expect(isDark("device", true)).toBe(true);
    expect(isDark("device", false)).toBe(false);
  });
});
