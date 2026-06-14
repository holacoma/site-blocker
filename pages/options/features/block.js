import { t } from "../../../shared/i18n.js";

const DEFAULTS = { blockTitle: "", blockMessage: "", blockAnimation: "fade" };

const ANIMATIONS = [
  { value: "fade",  labelKey: "blockAnimFade"  },
  { value: "slide", labelKey: "blockAnimSlide" },
  { value: "scale", labelKey: "blockAnimScale" },
  { value: "none",  labelKey: "blockAnimNone"  },
];

export function renderBlock() {
  const mount = document.getElementById("block-mount");

  // Title
  mount.appendChild(makeLabel(t("blockTitleLabel")));
  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.className = "block-text-input";
  titleInput.placeholder = t("blockTitlePlaceholder");
  mount.appendChild(titleInput);

  // Message
  mount.appendChild(makeLabel(t("blockMessageLabel")));
  const msgInput = document.createElement("textarea");
  msgInput.className = "block-text-area";
  msgInput.placeholder = t("blockMessagePlaceholder");
  msgInput.rows = 3;
  mount.appendChild(msgInput);

  // Animation
  mount.appendChild(makeLabel(t("blockAnimationLabel")));
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
      blockTitle:     titleInput.value.trim(),
      blockMessage:   msgInput.value.trim(),
      blockAnimation: animSelect.value,
    });
  }

  chrome.storage.local.get(DEFAULTS, ({ blockTitle, blockMessage, blockAnimation }) => {
    titleInput.value  = blockTitle;
    msgInput.value    = blockMessage;
    animSelect.value  = blockAnimation;
  });

  titleInput.addEventListener("input", save);
  msgInput.addEventListener("input", save);
  animSelect.addEventListener("change", save);
}

function makeLabel(text) {
  const el = document.createElement("div");
  el.className = "block-label";
  el.textContent = text;
  return el;
}
