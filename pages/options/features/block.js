import { t } from "../../../shared/i18n.js";
import { flashSave } from "../save-indicator.js";

const KEY_REDIRECT_MODE = "blockRedirectMode";
const KEY_REDIRECT_URL  = "blockRedirectUrl";

export function renderBlock() {
  const mount = /** @type {HTMLElement} */ (document.getElementById("block-mount"));

  // Title
  mount.appendChild(makeField("blockTitleLabel", "blockTitleDesc"));
  const titleInput = /** @type {HTMLInputElement} */ (document.createElement("input"));
  titleInput.type = "text";
  titleInput.className = "block-text-input";
  mount.appendChild(titleInput);

  // Message
  mount.appendChild(makeField("blockMessageLabel", "blockMessageDesc"));
  const msgInput = /** @type {HTMLTextAreaElement} */ (document.createElement("textarea"));
  msgInput.className = "block-text-area";
  msgInput.rows = 3;
  mount.appendChild(msgInput);

  mount.appendChild(makeDivider());

  // Exit button redirect
  mount.appendChild(makeField("blockRedirectLabel", "blockRedirectDesc"));

  const redirectSelect = /** @type {HTMLSelectElement} */ (document.createElement("select"));
  redirectSelect.className = "block-redirect-select";
  [
    ["useless", t("blockRedirectUseless")],
    ["motivational", t("blockRedirectMotivational")],
    ["custom", t("blockRedirectCustom")],
  ].forEach(([val, label]) => {
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = label;
    redirectSelect.appendChild(opt);
  });
  mount.appendChild(redirectSelect);

  const redirectHint = document.createElement("div");
  redirectHint.className = "block-field-desc block-redirect-hint";
  redirectHint.textContent = t("blockRedirectFrameHint");
  mount.appendChild(redirectHint);

  const redirectUrlInput = /** @type {HTMLInputElement} */ (document.createElement("input"));
  redirectUrlInput.type = "text";
  redirectUrlInput.className = "block-redirect-url";
  redirectUrlInput.placeholder = t("blockRedirectUrlPlaceholder");
  mount.appendChild(redirectUrlInput);

  function syncRedirectUrlVisibility() {
    redirectUrlInput.style.display = redirectSelect.value === "custom" ? "" : "none";
  }

  chrome.storage.local.get({ [KEY_REDIRECT_MODE]: "useless", [KEY_REDIRECT_URL]: "" }, (data) => {
    redirectSelect.value = /** @type {string} */ (data[KEY_REDIRECT_MODE]);
    redirectUrlInput.value = /** @type {string} */ (data[KEY_REDIRECT_URL]);
    syncRedirectUrlVisibility();
  });

  redirectSelect.addEventListener("change", () => {
    syncRedirectUrlVisibility();
    chrome.storage.local.set({ [KEY_REDIRECT_MODE]: redirectSelect.value }, flashSave);
  });

  redirectUrlInput.addEventListener("input", () => {
    chrome.storage.local.set({ [KEY_REDIRECT_URL]: redirectUrlInput.value }, flashSave);
  });

  mount.appendChild(makeDivider());

  // Preview button
  const previewBtn = document.createElement("button");
  previewBtn.className = "block-preview-btn";
  previewBtn.textContent = t("blockPreviewButton");
  previewBtn.addEventListener("click", showTransitionPreview);
  mount.appendChild(previewBtn);

  function save() {
    chrome.storage.local.set({
      blockTitle:   titleInput.value,
      blockMessage: msgInput.value,
    }, flashSave);
  }

  chrome.storage.local.get({ blockTitle: null, blockMessage: null }, (data) => {
    const stored = /** @type {{blockTitle: string | null, blockMessage: string | null}} */ (data);
    const defaultTitle   = t("blockTitlePlaceholder");
    const defaultMessage = t("blockMessagePlaceholder");

    titleInput.value = stored.blockTitle   ?? defaultTitle;
    msgInput.value   = stored.blockMessage ?? defaultMessage;

    if (stored.blockTitle === null || stored.blockMessage === null) {
      chrome.storage.local.set({
        blockTitle:   stored.blockTitle   ?? defaultTitle,
        blockMessage: stored.blockMessage ?? defaultMessage,
      });
    }
  });

  titleInput.addEventListener("input", save);
  msgInput.addEventListener("input", save);
}

function makeDivider() {
  const hr = document.createElement("hr");
  hr.className = "setting-divider";
  return hr;
}

function showTransitionPreview() {
  const overlay = document.createElement("div");
  overlay.className = "btp-overlay";

  const logo = document.createElement("img");
  logo.src = "../../assets/BlockDoze_Original.svg";
  logo.alt = "Blockdoze";
  logo.className = "btp-logo";

  const label = document.createElement("span");
  label.className = "btp-label";
  label.textContent = t("blockTransitionLabel");

  overlay.appendChild(logo);
  overlay.appendChild(label);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => overlay.classList.add("btp-in"));
  });

  function dismiss() {
    clearTimeout(tid);
    overlay.classList.remove("btp-in");
    overlay.classList.add("btp-out");
    setTimeout(() => {
      overlay.remove();
      chrome.tabs.create({ url: chrome.runtime.getURL("pages/blocked/blocked.html?site=preview") });
    }, 800);
  }

  const tid = setTimeout(dismiss, 3500);
  overlay.addEventListener("click", dismiss);
}

/**
 * @param {string} labelKey
 * @param {string} descKey
 */
function makeField(labelKey, descKey) {
  const wrap = document.createElement("div");
  wrap.className = "block-field-header";

  const label = document.createElement("div");
  label.className = "block-label";
  label.textContent = t(labelKey);

  const desc = document.createElement("div");
  desc.className = "block-field-desc";
  desc.textContent = t(descKey);

  wrap.appendChild(label);
  wrap.appendChild(desc);
  return wrap;
}
