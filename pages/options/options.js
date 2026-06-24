import { BlockedSite } from "../../shared/BlockedSite.js";
import { t, initLang } from "../../shared/i18n.js";
import { DaysFeature } from "./features/days.js";
import { TimerFeature } from "./features/timer.js";
import { ExceptionsFeature } from "./features/exceptions.js";
import { renderGeneral } from "./features/general.js";
import { renderAbout } from "./features/about.js";
import { renderBlock } from "./features/block.js";
import { renderAppearance } from "./features/appearance.js";

const FEATURES = [DaysFeature, TimerFeature, ExceptionsFeature];

const SUGGESTED_DOMAINS = ["youtube.com", "facebook.com", "instagram.com", "tiktok.com", "reddit.com"];

const input    = document.getElementById("site-input");
const addBtn   = document.getElementById("add-btn");
const siteList = document.getElementById("site-list");
const themeLink = document.getElementById("theme-css");

// ── i18n ─────────────────────────────────────────────────────────────────────

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const msg = t(el.dataset.i18n);
    if (msg) el.textContent = msg;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const msg = t(el.dataset.i18nPlaceholder);
    if (msg) el.placeholder = msg;
  });
  const title = t("appTitle");
  if (title) document.title = title;
}

// ── Sidebar navigation ───────────────────────────────────────────────────────

function showSection(id) {
  document.querySelectorAll(".nav-item").forEach((b) =>
    b.classList.toggle("active", b.dataset.section === id)
  );
  document.querySelectorAll(".section").forEach((s) =>
    s.classList.toggle("active", s.id === "section-" + id)
  );
}

document.querySelectorAll(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => showSection(btn.dataset.section));
});

// ── Sites ────────────────────────────────────────────────────────────────────

function load() {
  const today = new Date().toISOString().slice(0, 10);
  chrome.storage.sync.get({ blockedSites: [] }, ({ blockedSites }) => {
    chrome.storage.local.get(
      { activeTimers: {}, usedTimerDates: {}, pausedTimers: {}, suggestionsCollapsed: false },
      ({ activeTimers, usedTimerDates, pausedTimers, suggestionsCollapsed }) => {
        render(
          blockedSites.map(BlockedSite.from),
          { activeTimers, usedTimerDates, pausedTimers, today },
          suggestionsCollapsed
        );
      }
    );
  });
}

function save(sites, callback) {
  chrome.storage.sync.set({ blockedSites: sites.map((s) => s.toJSON()) }, callback);
}

function renderSuggestions(sites, collapsed) {
  const wrap = document.getElementById("suggestions-wrap");
  const blocked = new Set(sites.map((s) => s.domain));
  const pending = SUGGESTED_DOMAINS.filter((d) => !blocked.has(d));

  wrap.innerHTML = "";
  if (pending.length === 0) return;

  const header = document.createElement("div");
  header.className = "suggestions-header";

  const label = document.createElement("p");
  label.className = "suggestions-label";
  label.textContent = t("suggestionsLabel");

  const toggleBtn = document.createElement("button");
  toggleBtn.className = "suggestions-toggle";
  toggleBtn.textContent = collapsed ? t("suggestionsShow") : t("suggestionsHide");
  toggleBtn.addEventListener("click", () => {
    const next = !collapsed;
    chrome.storage.local.set({ suggestionsCollapsed: next }, () => {
      chrome.storage.sync.get({ blockedSites: [] }, ({ blockedSites }) => {
        renderSuggestions(blockedSites.map(BlockedSite.from), next);
      });
    });
  });

  header.appendChild(label);
  header.appendChild(toggleBtn);
  wrap.appendChild(header);

  if (!collapsed) {
    const list = document.createElement("div");
    list.className = "suggestions-list";

    for (const domain of pending) {
      const chip = document.createElement("button");
      chip.className = "suggestion-chip";
      chip.textContent = domain;
      chip.addEventListener("click", () => {
        chrome.storage.sync.get({ blockedSites: [], defaultTimerMinutes: 5 }, ({ blockedSites, defaultTimerMinutes }) => {
          const current = blockedSites.map(BlockedSite.from);
          if (!current.some((s) => s.domain === domain)) {
            const updated = [...current, new BlockedSite({ domain, timerMinutes: defaultTimerMinutes })];
            save(updated, load);
          }
        });
      });
      list.appendChild(chip);
    }

    wrap.appendChild(list);
  }
}

function render(sites, timerState, suggestionsCollapsed) {
  renderSuggestions(sites, suggestionsCollapsed);
  siteList.innerHTML = "";

  if (sites.length === 0) {
    siteList.innerHTML = `<li class="empty">${t("emptySites")}</li>`;
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
  delBtn.className = "del-btn";
  delBtn.title = t("deleteSiteTitle");
  delBtn.textContent = "🗑";

  let delPending = false;
  let delTimer = null;

  function resetDel() {
    delPending = false;
    clearTimeout(delTimer);
    delBtn.textContent = "🗑";
    delBtn.classList.remove("del-btn--pending");
  }

  delBtn.addEventListener("click", () => {
    if (!delPending) {
      delPending = true;
      delBtn.textContent = t("deleteConfirm");
      delBtn.classList.add("del-btn--pending");
      delTimer = setTimeout(resetDel, 3000);
    } else {
      clearTimeout(delTimer);
      removeSite(site.domain, allSites);
    }
  });

  delBtn.addEventListener("blur", resetDel);

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

  chrome.storage.sync.get({ blockedSites: [], defaultTimerMinutes: 5 }, ({ blockedSites, defaultTimerMinutes }) => {
    const sites = blockedSites.map(BlockedSite.from);
    if (!sites.some((s) => s.domain === raw)) {
      const updated = [...sites, new BlockedSite({ domain: raw, timerMinutes: defaultTimerMinutes })];
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

// ── Init — load language first, then render everything ───────────────────────

initLang().then(() => {
  applyTranslations();
  renderGeneral(themeLink);
  renderAppearance();
  renderBlock();
  renderAbout();
  load();
});
