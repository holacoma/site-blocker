import { t, setLang, getLang, SUPPORTED_LANGS } from "../../../shared/i18n.js";
import { flashSave } from "../save-indicator.js";

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

  // ── Dark mode select ──
  const darkSelect = document.createElement("select");
  darkSelect.id = "dark-mode-select";
  [["device", t("darkModeDevice")], ["light", t("darkModeLight")], ["dark", t("darkModeDark")]].forEach(([val, text]) => {
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = text;
    darkSelect.appendChild(opt);
  });

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

  const langHint = document.createElement("small");
  langHint.style.cssText = "font-size:11px;opacity:0.6;margin-top:3px;display:block";

  // ── Default timer input ──
  const defaultTimerInput = document.createElement("input");
  defaultTimerInput.type = "number";
  defaultTimerInput.id = "default-timer-input";
  defaultTimerInput.min = "0";
  defaultTimerInput.max = "480";
  defaultTimerInput.placeholder = t("defaultTimerPlaceholder");

  const divider = document.createElement("hr");
  divider.className = "setting-divider";

  // Dark mode row — built manually so the subtitle can be dynamic
  const darkRow = document.createElement("div");
  darkRow.className = "setting-row";
  const darkInfo = document.createElement("div");
  darkInfo.className = "setting-info";
  const darkTitle = document.createElement("div");
  darkTitle.className = "setting-title";
  darkTitle.textContent = t("darkModeLabel");
  const darkSubtitle = document.createElement("div");
  darkSubtitle.className = "setting-subtitle";
  darkInfo.appendChild(darkTitle);
  darkInfo.appendChild(darkSubtitle);
  const darkCtrl = document.createElement("div");
  darkCtrl.className = "setting-control";
  darkCtrl.appendChild(darkSelect);
  darkRow.appendChild(darkInfo);
  darkRow.appendChild(darkCtrl);

  mount.appendChild(makeSettingRow("defaultTimerLabel", "defaultTimerSubtitle", defaultTimerInput));
  mount.appendChild(darkRow);
  mount.appendChild(makeSettingRow("themeLabel", "themeSubtitle", themeSelect));
  mount.appendChild(divider);
  const langRow = document.createElement("div");
  langRow.className = "setting-row";
  const langInfo = document.createElement("div");
  langInfo.className = "setting-info";
  const langTitle = document.createElement("div");
  langTitle.className = "setting-title";
  langTitle.textContent = t("languageLabel");
  const langSubtitle = document.createElement("div");
  langSubtitle.className = "setting-subtitle";
  langSubtitle.textContent = t("languageSubtitle");
  langInfo.appendChild(langTitle);
  langInfo.appendChild(langSubtitle);
  langInfo.appendChild(langHint);
  const langCtrl = document.createElement("div");
  langCtrl.className = "setting-control";
  langCtrl.appendChild(langSelect);
  langRow.appendChild(langInfo);
  langRow.appendChild(langCtrl);
  mount.appendChild(langRow);

  // Dark mode logic
  const systemDark = matchMedia("(prefers-color-scheme: dark)").matches;
  const systemKey  = systemDark ? "darkModeSystemDark" : "darkModeSystemLight";
  darkSubtitle.textContent = t("darkModeSystemLabel") + " " + t(systemKey);

  chrome.storage.local.get({ darkMode: "device" }, ({ darkMode }) => {
    const setting = typeof darkMode === "boolean" ? (darkMode ? "device" : "light") : darkMode;
    darkSelect.value = setting;
  });

  darkSelect.addEventListener("change", () => {
    chrome.storage.local.set({ darkMode: darkSelect.value });
    flashSave();
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
    flashSave();
  });

  // Default timer logic
  chrome.storage.sync.get({ defaultTimerMinutes: 5 }, ({ defaultTimerMinutes }) => {
    defaultTimerInput.value = defaultTimerMinutes;
  });

  defaultTimerInput.addEventListener("change", () => {
    const val = Math.max(0, parseInt(defaultTimerInput.value, 10) || 0);
    defaultTimerInput.value = val;
    chrome.storage.sync.set({ defaultTimerMinutes: val });
    flashSave();
  });

  // Language logic — reload so all strings re-render with the new lang
  langSelect.addEventListener("change", () => {
    const lang = langSelect.value;
    chrome.storage.local.set({ language: lang }, () => location.reload());
  });

  // Always show the browser's detected language as info
  const uiCode = chrome.i18n.getUILanguage().split("-")[0];
  const match = SUPPORTED_LANGS.find((l) => l.code === uiCode) ?? SUPPORTED_LANGS.find((l) => l.code === "es");
  langHint.textContent = t("languageDetectedHint") + " " + match.label;
  langHint.style.display = "block";
}
