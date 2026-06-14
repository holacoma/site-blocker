import { t } from "../../../shared/i18n.js";

function formatMs(ms) {
  if (ms <= 0) return "0:00";
  const totalSec = Math.ceil(ms / 1000);
  return `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, "0")}`;
}

export const TimerFeature = {
  id: "timer",
  get label()       { return t("featureTimerLabel"); },
  get description() { return t("featureTimerDesc"); },

  render(site, ctx) {
    const box = document.createElement("div");
    box.className = "timer-section";

    const row = document.createElement("div");
    row.className = "timer-row";

    const minInput = document.createElement("input");
    minInput.type = "number";
    minInput.min = "0";
    minInput.max = "480";
    minInput.value = site.timerMinutes || "";
    minInput.placeholder = "min";
    minInput.title = t("timerMinTitle");

    const minLabel = document.createElement("span");
    minLabel.className = "timer-label";
    minLabel.textContent = t("timerMinLabel");

    const statusSpan = document.createElement("span");
    statusSpan.className = "timer-status";

    const { activeTimers, pausedTimers, usedTimerDates, today } = ctx;
    const expiry    = activeTimers[site.domain] ?? null;
    const pausedMs  = pausedTimers[site.domain] ?? 0;
    const usedToday = usedTimerDates[site.domain] === today;
    const isRunning = expiry && Date.now() < expiry;
    const isPaused  = !isRunning && pausedMs > 0;

    if (isRunning) {
      statusSpan.className = "timer-status running";
      statusSpan.textContent = formatMs(expiry - Date.now());
      const iv = setInterval(() => {
        if (Date.now() >= expiry) { clearInterval(iv); ctx.refresh(); return; }
        statusSpan.textContent = formatMs(expiry - Date.now());
      }, 1000);
    } else if (isPaused) {
      statusSpan.className = "timer-status paused";
      statusSpan.textContent = t("timerStatusPaused") + " " + formatMs(pausedMs);
    } else if (usedToday && site.timerMinutes > 0) {
      statusSpan.className = "timer-status used";
      statusSpan.textContent = t("timerStatusUsed");
    }

    minInput.addEventListener("change", () => {
      const val = Math.max(0, parseInt(minInput.value, 10) || 0);
      minInput.value = val || "";
      site.timerMinutes = val;
      ctx.onUpdate(site);
      if (val === 0) {
        chrome.runtime.sendMessage({ type: "STOP_TIMER", domain: site.domain });
        statusSpan.textContent = "";
        statusSpan.className = "timer-status";
      }
    });

    row.appendChild(minInput);
    row.appendChild(minLabel);
    row.appendChild(statusSpan);
    box.appendChild(row);

    return box;
  },
};
