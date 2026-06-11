import { BlockedSite } from "../shared/BlockedSite.js";
import { getFullState, getBlockedSites } from "../shared/storage.js";
import { isAlwaysAllowed, isBlocked } from "./blocking.js";
import { pauseTimerForTab, resumeTimerForTab } from "./timer.js";

const BLOCKED_PAGE = chrome.runtime.getURL("pages/blocked/blocked.html");

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return;
  try {
    const hostname = new URL(details.url).hostname.replace(/^www\./, "");
    console.log("[SB] onCommitted tab=" + details.tabId + " hostname=" + hostname);
    chrome.storage.session.get({ tabHostnames: {} }, ({ tabHostnames }) => {
      tabHostnames[String(details.tabId)] = hostname;
      chrome.storage.session.set({ tabHostnames });
    });
  } catch {}
});

chrome.tabs.onRemoved.addListener((tabId) => {
  pauseTimerForTab(tabId);
  chrome.storage.session.get({ tabHostnames: {}, activeTabPerWindow: {} }, (data) => {
    delete data.tabHostnames[String(tabId)];
    for (const [wid, tid] of Object.entries(data.activeTabPerWindow)) {
      if (tid === tabId) delete data.activeTabPerWindow[wid];
    }
    chrome.storage.session.set({
      tabHostnames: data.tabHostnames,
      activeTabPerWindow: data.activeTabPerWindow,
    });
  });
});

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  chrome.storage.session.get({ activeTabPerWindow: {} }, (data) => {
    const prevTabId = data.activeTabPerWindow[String(windowId)];
    data.activeTabPerWindow[String(windowId)] = tabId;
    chrome.storage.session.set({ activeTabPerWindow: data.activeTabPerWindow });
    if (prevTabId && prevTabId !== tabId) pauseTimerForTab(prevTabId);
    resumeTimerForTab(tabId);
  });
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    chrome.storage.local.get({ activeTimers: {}, pausedTimers: {} }, (data) => {
      let changed = false;
      for (const domain of Object.keys(data.activeTimers)) {
        const remaining = data.activeTimers[domain] - Date.now();
        if (remaining > 0) data.pausedTimers[domain] = remaining;
        delete data.activeTimers[domain];
        changed = true;
      }
      if (changed)
        chrome.storage.local.set({
          activeTimers: data.activeTimers,
          pausedTimers: data.pausedTimers,
        });
    });
  } else {
    chrome.storage.session.get({ activeTabPerWindow: {} }, ({ activeTabPerWindow }) => {
      const activeTabId = activeTabPerWindow[String(windowId)];
      if (activeTabId) resumeTimerForTab(activeTabId);
    });
  }
});

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return;
  if (details.url.startsWith(BLOCKED_PAGE)) return;

  let newHostname;
  try {
    newHostname = new URL(details.url).hostname.replace(/^www\./, "");
  } catch {
    return;
  }

  chrome.storage.session.get({ tabHostnames: {} }, ({ tabHostnames }) => {
    const oldHostname = tabHostnames[String(details.tabId)] ?? "";
    console.log(
      "[SB] onBeforeNavigate tab=" + details.tabId +
      " old=" + (oldHostname || "(none)") + " -> new=" + newHostname
    );

    getFullState((sites, activeTimers, usedTimerDates, pausedTimers) => {
      console.log(
        "[SB] state: activeTimers=" + JSON.stringify(activeTimers) +
        " pausedTimers=" + JSON.stringify(pausedTimers)
      );

      const oldSite = oldHostname ? BlockedSite.findMatch(oldHostname, sites) : null;
      const newSite = BlockedSite.findMatch(newHostname, sites);
      // If the destination is always-allowed, treat it as leaving the blocked domain
      // so the timer pauses (e.g. youtube.com → music.youtube.com)
      const effectiveNewSite = isAlwaysAllowed(details.url) ? null : newSite;
      const sameDomain = oldSite && effectiveNewSite && oldSite.domain === effectiveNewSite.domain;

      const oldDomain = oldSite ? oldSite.domain : "";
      const newDomain = effectiveNewSite ? effectiveNewSite.domain : newHostname;

      if (!sameDomain && oldDomain && activeTimers[oldDomain]) {
        const remaining = activeTimers[oldDomain] - Date.now();
        console.log("[SB] PAUSING " + oldDomain + " remaining=" + Math.round(remaining / 1000) + "s");
        if (remaining > 0) pausedTimers[oldDomain] = remaining;
        delete activeTimers[oldDomain];
        chrome.storage.local.set({ activeTimers, pausedTimers });
      } else {
        console.log(
          "[SB] no pause: oldSite=" + !!oldSite +
          " sameDomain=" + sameDomain +
          " activeTimer=" + !!activeTimers[oldDomain]
        );
      }

      if (!isBlocked(details.url, sites, activeTimers)) return;

      if (pausedTimers[newDomain] > 0) {
        console.log("[SB] RESUMING " + newDomain + " remaining=" + Math.round(pausedTimers[newDomain] / 1000) + "s");
        activeTimers[newDomain] = Date.now() + pausedTimers[newDomain];
        delete pausedTimers[newDomain];
        chrome.storage.local.set({ activeTimers, pausedTimers });
        return;
      }

      const today = getToday();

      if (effectiveNewSite && effectiveNewSite.shouldAutoStart(usedTimerDates, today)) {
        activeTimers[newDomain] = Date.now() + newSite.timerMinutes * 60 * 1000;
        usedTimerDates[newDomain] = today;
        chrome.storage.local.set({ activeTimers, usedTimerDates });
        return;
      }

      chrome.tabs.update(details.tabId, {
        url:
          BLOCKED_PAGE +
          "?site=" + encodeURIComponent(new URL(details.url).hostname) +
          "&returnTo=" + encodeURIComponent(details.url),
      });
    });
  });
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "START_TIMER") {
    chrome.storage.local.get({ activeTimers: {}, usedTimerDates: {} }, (data) => {
      data.activeTimers[msg.domain] = Date.now() + msg.minutes * 60 * 1000;
      data.usedTimerDates[msg.domain] = getToday();
      chrome.storage.local.set(
        { activeTimers: data.activeTimers, usedTimerDates: data.usedTimerDates },
        () => sendResponse({ ok: true })
      );
    });
    return true;
  }

  if (msg.type === "STOP_TIMER") {
    chrome.storage.local.get({ activeTimers: {}, usedTimerDates: {}, pausedTimers: {} }, (data) => {
      delete data.activeTimers[msg.domain];
      delete data.usedTimerDates[msg.domain];
      delete data.pausedTimers[msg.domain];
      chrome.storage.local.set(
        {
          activeTimers: data.activeTimers,
          usedTimerDates: data.usedTimerDates,
          pausedTimers: data.pausedTimers,
        },
        () => sendResponse({ ok: true })
      );
    });
    return true;
  }

  if (msg.type === "GET_TIMER_STATE") {
    if (isAlwaysAllowed("https://" + msg.domain + "/")) {
      sendResponse({ expiry: null });
      return true;
    }
    getBlockedSites((sites) => {
      const site = BlockedSite.findMatch(msg.domain, sites);
      if (!site || !site.isActiveToday()) {
        sendResponse({ expiry: null });
        return;
      }
      chrome.storage.local.get({ activeTimers: {} }, ({ activeTimers }) => {
        sendResponse({ expiry: activeTimers[site.domain] ?? null });
      });
    });
    return true;
  }

  if (msg.type === "GET_SITE_CONFIG") {
    getBlockedSites((sites) => {
      const site = sites.find((s) => s.domain === msg.domain) ?? null;
      sendResponse({ entry: site ? site.toJSON() : null });
    });
    return true;
  }
});
