import { t } from "../../../shared/i18n.js";
import { flashSave } from "../save-indicator.js";

export function renderBlock() {
  const mount = document.getElementById("block-mount");

  // Title
  mount.appendChild(makeField("blockTitleLabel", "blockTitleDesc"));
  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.className = "block-text-input";
  mount.appendChild(titleInput);

  // Message
  mount.appendChild(makeField("blockMessageLabel", "blockMessageDesc"));
  const msgInput = document.createElement("textarea");
  msgInput.className = "block-text-area";
  msgInput.rows = 3;
  mount.appendChild(msgInput);

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

  chrome.storage.local.get({ blockTitle: null, blockMessage: null }, (stored) => {
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
