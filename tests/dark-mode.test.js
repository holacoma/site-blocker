import { describe, test, expect } from "vitest";
import { isDark } from "../shared/dark-mode.js";

describe("isDark", () => {
  test("activo cuando el setting esta habilitado y el sistema es oscuro", () => {
    expect(isDark(true, true)).toBe(true);
  });

  test("inactivo cuando el setting esta deshabilitado, sin importar el sistema", () => {
    expect(isDark(false, true)).toBe(false);
    expect(isDark(false, false)).toBe(false);
  });

  test("inactivo cuando el sistema es claro, sin importar el setting", () => {
    expect(isDark(true, false)).toBe(false);
  });
});
