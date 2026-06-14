import { t } from "../../../shared/i18n.js";
import { BAR_THEMES, BAR_POSITIONS, EXPIRY_THEMES } from "../../../shared/overlay-themes.js";

const KEY_BAR      = "overlayBarTheme";
const KEY_POSITION = "overlayBarPosition";
const KEY_EXPIRY   = "overlayExpiryTheme";

export function renderAppearance() {
  const mount = document.getElementById("appearance-mount");

  chrome.storage.local.get(
    { [KEY_BAR]: "default", [KEY_POSITION]: "bottom", [KEY_EXPIRY]: "toast" },
    (prefs) => {
      mount.appendChild(
        buildSubsection({
          titleKey:     "appearanceBarTitle",
          subtitleKey:  "appearanceBarSubtitle",
          themes:       BAR_THEMES,
          selectedId:   prefs[KEY_BAR],
          storageKey:   KEY_BAR,
          buildPreview: buildBarPreview,
        })
      );

      mount.appendChild(makeDivider());

      mount.appendChild(
        buildSubsection({
          titleKey:     "appearancePositionTitle",
          subtitleKey:  "appearancePositionSubtitle",
          themes:       BAR_POSITIONS,
          selectedId:   prefs[KEY_POSITION],
          storageKey:   KEY_POSITION,
          buildPreview: buildPositionPreview,
        })
      );

      mount.appendChild(makeDivider());

      mount.appendChild(
        buildSubsection({
          titleKey:     "appearanceExpiryTitle",
          subtitleKey:  "appearanceExpirySubtitle",
          themes:       EXPIRY_THEMES,
          selectedId:   prefs[KEY_EXPIRY],
          storageKey:   KEY_EXPIRY,
          buildPreview: buildExpiryPreview,
        })
      );
    }
  );
}

function makeDivider() {
  const hr = document.createElement("hr");
  hr.className = "setting-divider";
  return hr;
}

function buildSubsection({ titleKey, subtitleKey, themes, selectedId, storageKey, buildPreview }) {
  const wrap = document.createElement("div");

  // Select element
  const sel = document.createElement("select");
  themes.forEach((theme) => {
    const opt = document.createElement("option");
    opt.value = theme.id;
    opt.textContent = theme.name;
    if (theme.id === selectedId) opt.selected = true;
    sel.appendChild(opt);
  });

  // Setting row (same pattern as general.js)
  wrap.appendChild(makeSettingRow(titleKey, subtitleKey, sel));

  // Live preview
  const previewWrap = document.createElement("div");
  previewWrap.className = "appearance-preview";
  let currentPreview = buildPreview(selectedId);
  previewWrap.appendChild(currentPreview);
  wrap.appendChild(previewWrap);

  sel.addEventListener("change", () => {
    chrome.storage.local.set({ [storageKey]: sel.value });
    const next = buildPreview(sel.value);
    previewWrap.replaceChild(next, currentPreview);
    currentPreview = next;
  });

  return wrap;
}

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

const PV_DOT_COUNT = 12;
const PV_DOT_ACTIVE = 8; // ~65% for preview

function buildBarPreview(themeId) {
  const screen = document.createElement("div");
  screen.className = "preview-screen";

  const bg = document.createElement("div");
  bg.className = "preview-page-bg";
  bg.textContent = "— sitio web —";

  const bar = document.createElement("div");
  bar.className = "pv-bar";
  bar.dataset.theme = themeId;

  if (themeId === "dots") {
    let inner = '<div class="pv-dots">';
    for (let i = 0; i < PV_DOT_COUNT; i++) {
      inner += `<span class="pv-dot ${i < PV_DOT_ACTIVE ? "pv-dot--on" : "pv-dot--off"}"></span>`;
    }
    inner += "</div>";
    bar.innerHTML =
      inner +
      '<span class="pv-time">3:45 restantes</span>' +
      '<button class="pv-close" tabindex="-1">×</button>';
  } else {
    bar.innerHTML =
      '<div class="pv-track"><div class="pv-fill"></div></div>' +
      '<span class="pv-time">3:45 restantes</span>' +
      '<button class="pv-close" tabindex="-1">×</button>';
  }

  screen.appendChild(bg);
  screen.appendChild(bar);
  return screen;
}

function buildPositionPreview(posId) {
  const screen = document.createElement("div");
  screen.className = "preview-screen";

  const bg = document.createElement("div");
  bg.className = "preview-page-bg";
  bg.textContent = "— sitio web —";

  const indicator = document.createElement("div");
  indicator.className = "pv-pos-indicator";
  indicator.dataset.pos = posId;

  screen.appendChild(bg);
  screen.appendChild(indicator);
  return screen;
}

function buildExpiryPreview(themeId) {
  const screen = document.createElement("div");
  screen.className = "preview-screen";

  const bg = document.createElement("div");
  bg.className = "preview-page-bg";
  bg.textContent = "— sitio web —";

  const overlay = document.createElement("div");
  overlay.className = "pv-expiry";
  overlay.dataset.theme = themeId;
  overlay.innerHTML =
    '<div class="pv-countdown">15.0000</div>' +
    '<div class="pv-expiry-msg">¡Tiempo agotado!</div>';

  screen.appendChild(bg);
  screen.appendChild(overlay);
  return screen;
}
