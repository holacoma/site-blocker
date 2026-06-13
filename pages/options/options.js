import { BlockedSite } from "../../shared/BlockedSite.js";
import { DaysFeature } from "./features/days.js";
import { TimerFeature } from "./features/timer.js";
import { ExceptionsFeature } from "./features/exceptions.js";

const FEATURES = [DaysFeature, TimerFeature, ExceptionsFeature];

const input       = document.getElementById("site-input");
const addBtn      = document.getElementById("add-btn");
const siteList    = document.getElementById("site-list");
const themeLink   = document.getElementById("theme-css");
const themeSelect = document.getElementById("theme-select");

// ── Theme ────────────────────────────────────────────────────────────────────

function applyTheme(theme) {
  themeLink.href = theme === "sober" ? "theme-sober.css" : "theme-retro.css";
  themeSelect.value = theme;
}

chrome.storage.local.get({ theme: "retro" }, ({ theme }) => applyTheme(theme));

themeSelect.addEventListener("change", () => {
  const theme = themeSelect.value;
  chrome.storage.local.set({ theme });
  applyTheme(theme);
});

// ── Sites ────────────────────────────────────────────────────────────────────

function load() {
  const today = new Date().toISOString().slice(0, 10);
  chrome.storage.sync.get({ blockedSites: [] }, ({ blockedSites }) => {
    chrome.storage.local.get(
      { activeTimers: {}, usedTimerDates: {}, pausedTimers: {} },
      ({ activeTimers, usedTimerDates, pausedTimers }) => {
        render(
          blockedSites.map(BlockedSite.from),
          { activeTimers, usedTimerDates, pausedTimers, today }
        );
      }
    );
  });
}

function save(sites, callback) {
  chrome.storage.sync.set({ blockedSites: sites.map((s) => s.toJSON()) }, callback);
}

function render(sites, timerState) {
  siteList.innerHTML = "";

  if (sites.length === 0) {
    siteList.innerHTML = '<li class="empty">Sin sitios bloqueados</li>';
    return;
  }

  sites.forEach((site) => {
    const ctx = {
      activeTimers:   timerState.activeTimers,
      pausedTimers:   timerState.pausedTimers,
      usedTimerDates: timerState.usedTimerDates,
      today:          timerState.today,
      onUpdate(updatedSite) {
        const updated = sites.map((s) =>
          s.domain === updatedSite.domain ? updatedSite : s
        );
        save(updated, () => {});
      },
      refresh: load,
    };

    siteList.appendChild(createCard(site, sites, ctx));
  });
}

function createCard(site, allSites, ctx) {
  const li = document.createElement("li");

  const win = document.createElement("div");
  win.className = "window site-card";

  const titleBar = document.createElement("div");
  titleBar.className = "title-bar";

  const titleText = document.createElement("div");
  titleText.className = "title-bar-text";
  titleText.textContent = site.domain;

  const titleControls = document.createElement("div");
  titleControls.className = "title-bar-controls";

  const delBtn = document.createElement("button");
  delBtn.setAttribute("aria-label", "Close");
  delBtn.title = "Eliminar";
  delBtn.addEventListener("click", () => removeSite(site.domain, allSites));

  titleControls.appendChild(delBtn);
  titleBar.appendChild(titleText);
  titleBar.appendChild(titleControls);

  const body = document.createElement("div");
  body.className = "window-body";

  const tabRow = document.createElement("div");
  tabRow.className = "tab-row";
  body.appendChild(tabRow);

  const tabBtns = [];
  const panels  = [];

  for (const feature of FEATURES) {
    const tabBtn = document.createElement("button");
    tabBtn.textContent = feature.label;
    tabBtn.className = "tab-btn";
    tabRow.appendChild(tabBtn);
    tabBtns.push(tabBtn);

    const panel = document.createElement("div");
    panel.className = "feature-panel";
    panel.style.display = "none";

    const desc = document.createElement("p");
    desc.className = "feature-desc";
    desc.textContent = feature.description;

    panel.appendChild(desc);
    panel.appendChild(feature.render(site, ctx));
    body.appendChild(panel);
    panels.push(panel);
  }

  tabBtns.forEach((btn, i) => {
    btn.addEventListener("click", () => {
      const isOpen = panels[i].style.display !== "none";
      panels.forEach((p) => { p.style.display = "none"; });
      tabBtns.forEach((b) => b.classList.remove("active"));
      if (!isOpen) {
        panels[i].style.display = "";
        btn.classList.add("active");
      }
    });
  });

  win.appendChild(titleBar);
  win.appendChild(body);
  li.appendChild(win);
  return li;
}

function addSite() {
  const raw = input.value.trim().toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
  if (!raw) return;

  chrome.storage.sync.get({ blockedSites: [] }, ({ blockedSites }) => {
    const sites = blockedSites.map(BlockedSite.from);
    if (!sites.some((s) => s.domain === raw)) {
      const updated = [...sites, new BlockedSite({ domain: raw })];
      save(updated, load);
    }
    input.value = "";
  });
}

function removeSite(domain, currentSites) {
  const updated = currentSites.filter((s) => s.domain !== domain);
  save(updated, () => {
    chrome.runtime.sendMessage({ type: "STOP_TIMER", domain }, load);
  });
}

addBtn.addEventListener("click", addSite);
input.addEventListener("keydown", (e) => { if (e.key === "Enter") addSite(); });

load();
