function formatMs(ms) {
  if (ms <= 0) return "0:00";
  const totalSec = Math.ceil(ms / 1000);
  return `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, "0")}`;
}

export const TimerFeature = {
  render(site, ctx) {
    const box = document.createElement("div");
    box.className = "feature-box timer-box";

    const row = document.createElement("div");
    row.className = "timer-row";

    const toggle = document.createElement("button");
    toggle.className = "timer-toggle" + (site.timerMinutes > 0 ? " active" : "");
    toggle.textContent = "⏱";
    toggle.title = "Temporizador diario";

    const section = document.createElement("div");
    section.className = "timer-section";
    section.style.display = site.timerMinutes > 0 ? "" : "none";

    toggle.addEventListener("click", () => {
      section.style.display = section.style.display === "none" ? "" : "none";
    });

    const minInput = document.createElement("input");
    minInput.type = "number";
    minInput.min = "0";
    minInput.max = "480";
    minInput.value = site.timerMinutes || "";
    minInput.placeholder = "min";
    minInput.title = "Minutos de acceso permitido por día";

    const minLabel = document.createElement("span");
    minLabel.className = "timer-label";
    minLabel.textContent = "min / día";

    const statusSpan = document.createElement("span");
    statusSpan.className = "timer-status";

    // Fill in live timer status
    const { activeTimers, pausedTimers, usedTimerDates, today } = ctx;
    const expiry   = activeTimers[site.domain] ?? null;
    const pausedMs = pausedTimers[site.domain] ?? 0;
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
      statusSpan.textContent = "En pausa: " + formatMs(pausedMs);
    } else if (usedToday && site.timerMinutes > 0) {
      statusSpan.className = "timer-status used";
      statusSpan.textContent = "Usado hoy";
    }

    minInput.addEventListener("change", () => {
      const val = Math.max(0, parseInt(minInput.value, 10) || 0);
      minInput.value = val || "";
      site.timerMinutes = val;
      toggle.className = "timer-toggle" + (val > 0 ? " active" : "");
      ctx.onUpdate(site);
      if (val === 0) {
        chrome.runtime.sendMessage({ type: "STOP_TIMER", domain: site.domain });
        statusSpan.textContent = "";
        statusSpan.className = "timer-status";
      }
    });

    section.appendChild(minInput);
    section.appendChild(minLabel);
    section.appendChild(statusSpan);

    row.appendChild(toggle);
    row.appendChild(section);
    box.appendChild(row);

    return box;
  },
};
