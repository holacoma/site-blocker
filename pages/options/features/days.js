import { t } from "../../../shared/i18n.js";

export const DaysFeature = {
  id: "days",
  get label()       { return t("featureDaysLabel"); },
  get description() { return t("featureDaysDesc"); },

  render(site, ctx) {
    const days = t("dayNames").split(",");
    const box = document.createElement("div");
    box.className = "days-box";

    days.forEach((label, dayIndex) => {
      const btn = document.createElement("button");
      btn.className = "day-btn" + (site.days.includes(dayIndex) ? " active" : "");
      btn.textContent = label;
      btn.addEventListener("click", () => {
        const has = site.days.includes(dayIndex);
        site.days = has
          ? site.days.filter((d) => d !== dayIndex)
          : [...site.days, dayIndex].sort((a, b) => a - b);
        btn.className = "day-btn" + (site.days.includes(dayIndex) ? " active" : "");
        ctx.onUpdate(site);
      });
      box.appendChild(btn);
    });

    return box;
  },
};
