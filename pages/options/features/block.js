import { t } from "../../../shared/i18n.js";

const ANIMATIONS = [
  { value: "fade",  labelKey: "blockAnimFade"  },
  { value: "slide", labelKey: "blockAnimSlide" },
  { value: "scale", labelKey: "blockAnimScale" },
  { value: "none",  labelKey: "blockAnimNone"  },
];

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

  // Animation
  mount.appendChild(makeField("blockAnimationLabel", "blockAnimationDesc"));
  const animSelect = document.createElement("select");
  animSelect.className = "block-anim-select";
  ANIMATIONS.forEach(({ value, labelKey }) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = t(labelKey);
    animSelect.appendChild(opt);
  });
  mount.appendChild(animSelect);

  // Preview button
  const previewBtn = document.createElement("button");
  previewBtn.className = "block-preview-btn";
  previewBtn.textContent = t("blockPreviewButton");
  previewBtn.addEventListener("click", () => {
    const url = chrome.runtime.getURL("pages/blocked/blocked.html?site=example.com");
    chrome.tabs.create({ url });
  });
  mount.appendChild(previewBtn);

  function save() {
    chrome.storage.local.set({
      blockTitle:     titleInput.value,
      blockMessage:   msgInput.value,
      blockAnimation: animSelect.value,
    });
  }

  chrome.storage.local.get({ blockTitle: null, blockMessage: null, blockAnimation: "fade" }, (stored) => {
    const defaultTitle   = t("blockTitlePlaceholder");
    const defaultMessage = t("blockMessagePlaceholder");

    titleInput.value = stored.blockTitle   ?? defaultTitle;
    msgInput.value   = stored.blockMessage ?? defaultMessage;
    animSelect.value = stored.blockAnimation;

    if (stored.blockTitle === null || stored.blockMessage === null) {
      chrome.storage.local.set({
        blockTitle:   stored.blockTitle   ?? defaultTitle,
        blockMessage: stored.blockMessage ?? defaultMessage,
      });
    }
  });

  titleInput.addEventListener("input", save);
  msgInput.addEventListener("input", save);
  animSelect.addEventListener("change", save);
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
