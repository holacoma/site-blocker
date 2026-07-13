import { t } from "../../shared/i18n.js";

/** @type {ReturnType<typeof setTimeout> | null} */
let _tid = null;

export function flashSave() {
  const el = document.getElementById("save-indicator");
  if (!el) return;
  clearTimeout(_tid);

  el.textContent = t("savingIndicator");
  el.className = "save-ind save-ind--spin";

  _tid = setTimeout(() => {
    el.textContent = "✓ " + t("savedIndicator");
    el.className = "save-ind save-ind--ok";
    _tid = setTimeout(() => {
      el.className = "save-ind save-ind--fade";
      _tid = setTimeout(() => {
        el.className = "save-ind";
        el.textContent = "";
      }, 500);
    }, 2000);
  }, 900);
}
