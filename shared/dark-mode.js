/**
 * @param {"dark" | "light" | "device" | boolean} setting
 * @param {boolean} systemDark
 */
export function isDark(setting, systemDark) {
  if (setting === "dark")  return true;
  if (setting === "light") return false;
  return Boolean(systemDark); // "device" or legacy boolean true
}
