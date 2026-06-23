import { t, setLang, getLang, SUPPORTED_LANGS } from "../../../shared/i18n.js";

function makeSettingRow(titleKey, subtitleKey, control) {
  const row = document.createElement("div");
  row.className = "setting-row";

  const info = document.createElement("div");
  info.className = "setting-info";

  const title = document.createElement("div");
  title.className = "setting-title";
  title.textContent = t(titleKey);

  const subtitle = document.createElement("div");
  subtitle.className = "setting-subtitle";
  subtitle.textContent = t(subtitleKey);

  info.appendChild(title);
  info.appendChild(subtitle);

  const ctrl = document.createElement("div");
  ctrl.className = "setting-control";
  ctrl.appendChild(control);

  row.appendChild(info);
  row.appendChild(ctrl);
  return row;
}

export function renderGeneral(themeLink) {
  const mount = document.getElementById("general-mount");

  // ── Dark mode toggle ──
  const darkToggle = document.createElement("button");
  darkToggle.type = "button";
  darkToggle.id = "dark-mode-toggle";
  darkToggle.className = "toggle-btn";

  // ── Theme select ──
  const themeSelect = document.createElement("select");
  themeSelect.id = "theme-select";
  [["retro", t("themeRetro")], ["sober", t("themeSober")]].forEach(([val, text]) => {
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = text;
    themeSelect.appendChild(opt);
  });

  // ── Language select ──
  const langSelect = document.createElement("select");
  langSelect.id = "lang-select";
  SUPPORTED_LANGS.forEach(({ code, label }) => {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = label;
    if (code === getLang()) opt.selected = true;
    langSelect.appendChild(opt);
  });

  // ── Default timer input ──
  const defaultTimerInput = document.createElement("input");
  defaultTimerInput.type = "number";
  defaultTimerInput.id = "default-timer-input";
  defaultTimerInput.min = "0";
  defaultTimerInput.max = "480";
  defaultTimerInput.placeholder = t("defaultTimerPlaceholder");

  const divider = document.createElement("hr");
  divider.className = "setting-divider";

  mount.appendChild(makeSettingRow("defaultTimerLabel", "defaultTimerSubtitle", defaultTimerInput));
  mount.appendChild(makeSettingRow("darkModeLabel", "darkModeSubtitle", darkToggle));
  mount.appendChild(makeSettingRow("themeLabel", "themeSubtitle", themeSelect));
  mount.appendChild(divider);
  mount.appendChild(makeSettingRow("languageLabel", "languageSubtitle", langSelect));

  // Dark mode logic
  function setToggle(enabled) {
    darkToggle.setAttribute("aria-pressed", String(enabled));
    darkToggle.textContent = enabled ? "On" : "Off";
  }

  chrome.storage.local.get({ darkMode: true }, ({ darkMode }) => setToggle(darkMode));

  darkToggle.addEventListener("click", () => {
    const newValue = darkToggle.getAttribute("aria-pressed") !== "true";
    chrome.storage.local.set({ darkMode: newValue });
    setToggle(newValue);
  });

  // Theme logic
  function applyTheme(theme) {
    themeLink.href = theme === "sober" ? "theme-sober.css" : "theme-retro.css";
    document.documentElement.dataset.theme = theme;
    themeSelect.value = theme;
  }

  chrome.storage.local.get({ theme: "sober" }, ({ theme }) => applyTheme(theme));

  themeSelect.addEventListener("change", () => {
    const theme = themeSelect.value;
    chrome.storage.local.set({ theme });
    applyTheme(theme);
  });

  // Default timer logic
  chrome.storage.sync.get({ defaultTimerMinutes: 5 }, ({ defaultTimerMinutes }) => {
    defaultTimerInput.value = defaultTimerMinutes;
  });

  defaultTimerInput.addEventListener("change", () => {
    const val = Math.max(0, parseInt(defaultTimerInput.value, 10) || 0);
    defaultTimerInput.value = val;
    chrome.storage.sync.set({ defaultTimerMinutes: val });
  });

  // Language logic — reload so all strings re-render with the new lang
  langSelect.addEventListener("change", () => {
    const lang = langSelect.value;
    chrome.storage.local.set({ language: lang }, () => location.reload());
  });
}
