const DAYS_ES = ["D", "L", "M", "M", "J", "V", "S"];

export const DaysFeature = {
  id: "days",
  label: "Días",
  description: "Seleccioná los días de la semana en que este sitio debe bloquearse.",

  render(site, ctx) {
    const box = document.createElement("div");
    box.className = "days-box";

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
