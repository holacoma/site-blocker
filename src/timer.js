import { BlockedSite } from "../shared/BlockedSite.js";
import { getFullState } from "../shared/storage.js";

export function pauseTimerForTab(tabId) {
  chrome.storage.session.get({ tabHostnames: {} }, ({ tabHostnames }) => {
    const hostname = tabHostnames[String(tabId)];
    if (!hostname) return;
    getFullState((sites, activeTimers, _used, pausedTimers) => {
      const site = BlockedSite.findMatch(hostname, sites);
      if (!site) return;
      if (!activeTimers[site.domain]) return;
      const remaining = activeTimers[site.domain] - Date.now();
      if (remaining > 0) pausedTimers[site.domain] = remaining;
      delete activeTimers[site.domain];
      chrome.storage.local.set({ activeTimers, pausedTimers });
    });
  });
}

export function resumeTimerForTab(tabId) {
  chrome.storage.session.get({ tabHostnames: {} }, ({ tabHostnames }) => {
    const hostname = tabHostnames[String(tabId)];
    if (!hostname) return;
    getFullState((sites, activeTimers, _used, pausedTimers) => {
      const site = BlockedSite.findMatch(hostname, sites);
      if (!site) return;
      if (!(pausedTimers[site.domain] > 0)) return;
      activeTimers[site.domain] = Date.now() + pausedTimers[site.domain];
      delete pausedTimers[site.domain];
      chrome.storage.local.set({ activeTimers, pausedTimers });
    });
  });
}
