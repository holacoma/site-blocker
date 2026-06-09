const DAYS_ES = ["D", "L", "M", "M", "J", "V", "S"];

export const DaysFeature = {
  render(site, ctx) {
    const box = document.createElement("div");
    box.className = "feature-box days-box";

    DAYS_ES.forEach((label, dayIndex) => {
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
