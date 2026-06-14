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

  const divider = document.createElement("hr");
  divider.className = "setting-divider";

  mount.appendChild(makeSettingRow("themeLabel", "themeSubtitle", themeSelect));
  mount.appendChild(divider);
  mount.appendChild(makeSettingRow("languageLabel", "languageSubtitle", langSelect));

  // Theme logic
  function applyTheme(theme) {
    themeLink.href = theme === "sober" ? "theme-sober.css" : "theme-retro.css";
    themeSelect.value = theme;
  }

  chrome.storage.local.get({ theme: "retro" }, ({ theme }) => applyTheme(theme));

  themeSelect.addEventListener("change", () => {
    const theme = themeSelect.value;
    chrome.storage.local.set({ theme });
    applyTheme(theme);
  });

  // Language logic — reload so all strings re-render with the new lang
  langSelect.addEventListener("change", () => {
    const lang = langSelect.value;
    chrome.storage.local.set({ language: lang }, () => location.reload());
  });
}
