const input  = document.getElementById("site-input");
const addBtn = document.getElementById("add-btn");
const list   = document.getElementById("site-list");

const DAYS_ES = ["D","L","M","M","J","V","S"];

const countdownIntervals = {};

function normalizeSites(raw) {
  return raw.map(entry =>
    typeof entry === "string"
      ? { domain: entry, days: [0,1,2,3,4,5,6], timerMinutes: 0 }
      : { timerMinutes: 0, ...entry }
  );
}

function formatRemaining(expiry) {
  const ms = expiry - Date.now();
  if (ms <= 0) return "0:00";
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function formatMs(ms) {
  if (ms <= 0) return "0:00";
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function load() {
  const today = new Date().toISOString().slice(0, 10);
  chrome.storage.sync.get({ blockedSites: [] }, ({ blockedSites }) => {
    chrome.storage.local.get(
      { activeTimers: {}, usedTimerDates: {}, pausedTimers: {} },
      ({ activeTimers, usedTimerDates, pausedTimers }) => {
        render(normalizeSites(blockedSites), activeTimers, usedTimerDates, pausedTimers, today);
      }
    );
  });
}

function render(sites, activeTimers, usedTimerDates, pausedTimers, today) {
  Object.values(countdownIntervals).forEach(clearInterval);
  Object.keys(countdownIntervals).forEach(k => delete countdownIntervals[k]);

  list.innerHTML = "";
  if (sites.length === 0) {
    list.innerHTML = '<li class="empty">Sin sitios bloqueados</li>';
    return;
  }

  sites.forEach((entry) => {
    const li = document.createElement("li");

    // ── Site row ─────────────────────────────────────────────────────────────
    const siteRow = document.createElement("div");
    siteRow.className = "site-row";

    const span = document.createElement("span");
    span.textContent = entry.domain;

    const timerToggle = document.createElement("button");
    timerToggle.textContent = "⏱";
    timerToggle.title = "Temporizador";
    timerToggle.className = "timer-toggle" + (entry.timerMinutes > 0 ? " active" : "");
    timerToggle.addEventListener("click", () => {
      const section = li.querySelector(".timer-section");
      section.style.display = section.style.display === "none" ? "" : "none";
    });

    const delBtn = document.createElement("button");
    delBtn.textContent = "×";
    delBtn.title = "Eliminar";
    delBtn.addEventListener("click", () => remove(entry.domain));

    siteRow.appendChild(span);
    siteRow.appendChild(timerToggle);
    siteRow.appendChild(delBtn);

    // ── Days row ──────────────────────────────────────────────────────────────
    const daysRow = document.createElement("div");
    daysRow.className = "days-row";
    DAYS_ES.forEach((label, dayIndex) => {
      const btn = document.createElement("button");
      btn.className = "day-btn" + (entry.days.includes(dayIndex) ? " active" : "");
      btn.textContent = label;
      btn.addEventListener("click", () => toggleDay(entry.domain, dayIndex));
      daysRow.appendChild(btn);
    });

    // ── Timer section ─────────────────────────────────────────────────────────
    const timerSection = document.createElement("div");
    timerSection.className = "timer-section";
    timerSection.style.display = entry.timerMinutes > 0 ? "" : "none";

    const timerRow = document.createElement("div");
    timerRow.className = "timer-row";

    const minInput = document.createElement("input");
    minInput.type = "number";
    minInput.min = "0";
    minInput.max = "480";
    minInput.value = entry.timerMinutes || "";
    minInput.placeholder = "min";
    minInput.title = "Minutos de acceso permitido";
    minInput.addEventListener("change", () => {
      const val = Math.max(0, parseInt(minInput.value, 10) || 0);
      minInput.value = val || "";
      setTimerMinutes(entry.domain, val);
      timerToggle.className = "timer-toggle" + (val > 0 ? " active" : "");
    });

    const minLabel = document.createElement("span");
    minLabel.className = "timer-label";
    minLabel.textContent = "min";

    timerRow.appendChild(minInput);
    timerRow.appendChild(minLabel);

    const expiry    = activeTimers[entry.domain] ?? null;
    const isRunning = expiry && Date.now() < expiry;
    const isPaused  = !isRunning && (pausedTimers[entry.domain] ?? 0) > 0;
    const usedToday = !isRunning && !isPaused && usedTimerDates[entry.domain] === today;

    if (isRunning) {
      const statusSpan = document.createElement("span");
      statusSpan.className = "timer-status";
      statusSpan.textContent = formatRemaining(expiry);
      timerRow.appendChild(statusSpan);

      countdownIntervals[entry.domain] = setInterval(() => {
        if (Date.now() >= expiry) {
          clearInterval(countdownIntervals[entry.domain]);
          delete countdownIntervals[entry.domain];
          load();
          return;
        }
        statusSpan.textContent = formatRemaining(expiry);
      }, 1000);
    } else if (isPaused) {
      const pausedLabel = document.createElement("span");
      pausedLabel.className = "timer-label";
      pausedLabel.textContent = "En pausa: " + formatMs(pausedTimers[entry.domain]);
      pausedLabel.style.color = "#888";
      timerRow.appendChild(pausedLabel);

    } else if (usedToday) {
      const usedLabel = document.createElement("span");
      usedLabel.className = "timer-label";
      usedLabel.textContent = "Usado hoy";
      usedLabel.style.color = "#444";
      timerRow.appendChild(usedLabel);
    }

    timerSection.appendChild(timerRow);

    li.appendChild(siteRow);
    li.appendChild(daysRow);
    li.appendChild(timerSection);
    list.appendChild(li);
  });
}

function add() {
  const raw = input.value.trim().toLowerCase()
    .replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  if (!raw) return;
  chrome.storage.sync.get({ blockedSites: [] }, ({ blockedSites }) => {
    const sites = normalizeSites(blockedSites);
    if (!sites.some(e => e.domain === raw)) {
      const updated = [...sites, { domain: raw, days: [0,1,2,3,4,5,6], timerMinutes: 0 }];
      chrome.storage.sync.set({ blockedSites: updated }, load);
    }
    input.value = "";
  });
}

function remove(domain) {
  chrome.storage.sync.get({ blockedSites: [] }, ({ blockedSites }) => {
    const updated = normalizeSites(blockedSites).filter(e => e.domain !== domain);
    chrome.storage.sync.set({ blockedSites: updated }, () => {
      chrome.runtime.sendMessage({ type: "STOP_TIMER", domain }, load);
    });
  });
}

function toggleDay(domain, dayIndex) {
  chrome.storage.sync.get({ blockedSites: [] }, ({ blockedSites }) => {
    const sites = normalizeSites(blockedSites);
    const updated = sites.map(entry => {
      if (entry.domain !== domain) return entry;
      const has = entry.days.includes(dayIndex);
      const newDays = has
        ? entry.days.filter(d => d !== dayIndex)
        : [...entry.days, dayIndex].sort((a, b) => a - b);
      return { ...entry, days: newDays };
    });
    chrome.storage.sync.set({ blockedSites: updated }, load);
  });
}

function setTimerMinutes(domain, minutes) {
  chrome.storage.sync.get({ blockedSites: [] }, ({ blockedSites }) => {
    const sites = normalizeSites(blockedSites);
    const updated = sites.map(e =>
      e.domain === domain ? { ...e, timerMinutes: minutes } : e
    );
    chrome.storage.sync.set({ blockedSites: updated }, () => {
      if (minutes === 0) {
        chrome.runtime.sendMessage({ type: "STOP_TIMER", domain });
      }
    });
  });
}

addBtn.addEventListener("click", add);
input.addEventListener("keydown", (e) => { if (e.key === "Enter") add(); });

load();
