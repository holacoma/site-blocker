import { BlockedSite } from "../../shared/BlockedSite.js";
import { DaysFeature } from "./features/days.js";
import { TimerFeature } from "./features/timer.js";
import { ExceptionsFeature } from "./features/exceptions.js";

const FEATURES = [DaysFeature, TimerFeature, ExceptionsFeature];

const input   = document.getElementById("site-input");
const addBtn  = document.getElementById("add-btn");
const siteList = document.getElementById("site-list");

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
        // Merge the updated site back into the list and save
        const updated = sites.map((s) =>
          s.domain === updatedSite.domain ? updatedSite : s
        );
        save(updated, () => {});
      },
      refresh: load,
    };

    const card = createCard(site, sites, ctx);
    siteList.appendChild(card);
  });
}

function createCard(site, allSites, ctx) {
  const li = document.createElement("li");
  li.className = "site-card";

  // ── Header row: domain name + delete ───────────────────────────────────────
  const header = document.createElement("div");
  header.className = "card-header";

  const nameSpan = document.createElement("span");
  nameSpan.className = "domain-name";
  nameSpan.textContent = site.domain;

  const delBtn = document.createElement("button");
  delBtn.className = "delete-btn";
  delBtn.textContent = "×";
  delBtn.title = "Eliminar";
  delBtn.addEventListener("click", () => removeSite(site.domain, allSites));

  header.appendChild(nameSpan);
  header.appendChild(delBtn);
  li.appendChild(header);

  // ── Feature boxes ───────────────────────────────────────────────────────────
  for (const feature of FEATURES) {
    const separator = document.createElement("div");
    separator.className = "card-separator";
    li.appendChild(separator);
    li.appendChild(feature.render(site, ctx));
  }

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
