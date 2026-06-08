const BLOCKED_PAGE = chrome.runtime.getURL("blocked.html");

// Subdomains listed here are never blocked, even if their parent domain is in the blocked list.
const ALWAYS_ALLOWED = [
  "music.youtube.com",
  "accounts.google.com",
  "accounts.youtube.com",
  "reddit.com/chat/room/",
];

function normalizeSites(raw) {
  return raw.map(entry =>
    typeof entry === "string"
      ? { domain: entry, days: [0,1,2,3,4,5,6], timerMinutes: 0 }
      : { timerMinutes: 0, ...entry }
  );
}

function getBlockedSites(callback) {
  chrome.storage.sync.get({ blockedSites: [] }, (data) =>
    callback(normalizeSites(data.blockedSites))
  );
}

function getFullState(callback) {
  chrome.storage.sync.get({ blockedSites: [] }, (syncData) => {
    chrome.storage.local.get({ activeTimers: {}, usedTimerDates: {}, pausedTimers: {} }, (localData) => {
      callback(
        normalizeSites(syncData.blockedSites),
        localData.activeTimers,
        localData.usedTimerDates,
        localData.pausedTimers
      );
    });
  });
}

function findSiteEntry(hostname, sites) {
  return sites.find(e => {
    const clean = e.domain.replace(/^www\./, "");
    return hostname === clean || hostname.endsWith("." + clean);
  }) ?? null;
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function shouldAutoStart(hostname, siteEntry, usedTimerDates, today) {
  if (!siteEntry || !siteEntry.timerMinutes || siteEntry.timerMinutes <= 0) return false;
  return usedTimerDates[hostname] !== today;
}

function isActiveToday(entry) {
  return entry.days.includes(new Date().getDay());
}

function isAlwaysAllowed(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");
    return ALWAYS_ALLOWED.some((allowed) => {
      const slashIdx = allowed.indexOf("/");
      if (slashIdx !== -1) {
        const allowedHost = allowed.slice(0, slashIdx).replace(/^www\./, "");
        const allowedPath = "/" + allowed.slice(slashIdx + 1);
        return (hostname === allowedHost || hostname.endsWith("." + allowedHost))
          && parsed.pathname.startsWith(allowedPath);
      }
      return hostname === allowed || hostname.endsWith("." + allowed);
    });
  } catch {
    return false;
  }
}

function isBlocked(url, blockedSites, activeTimers = {}) {
  try {
    if (isAlwaysAllowed(url)) return false;
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    const expiry = activeTimers[hostname];
    if (expiry && Date.now() < expiry) return false;
    return blockedSites.some((entry) => {
      if (!isActiveToday(entry)) return false;
      const clean = entry.domain.replace(/^www\./, "");
      return hostname === clean || hostname.endsWith("." + clean);
    });
  } catch {
    return false;
  }
}


if (typeof module !== "undefined") {
  module.exports = {
    ALWAYS_ALLOWED, normalizeSites, isActiveToday, isAlwaysAllowed, isBlocked,
    getBlockedSites, findSiteEntry, getToday, shouldAutoStart,
  };
}

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return;
  if (details.url.startsWith(BLOCKED_PAGE)) return;

  let newHostname;
  try { newHostname = new URL(details.url).hostname.replace(/^www\./, ""); }
  catch { return; }

  chrome.tabs.get(details.tabId, (tab) => {
    let oldHostname = "";
    try { if (tab?.url) oldHostname = new URL(tab.url).hostname.replace(/^www\./, ""); }
    catch {}

    getFullState((sites, activeTimers, usedTimerDates, pausedTimers) => {
      // Pause timer when leaving a timed domain for a different domain
      const oldEntry = oldHostname ? findSiteEntry(oldHostname, sites) : null;
      const newEntry = findSiteEntry(newHostname, sites);
      const sameDomain = oldEntry && newEntry && oldEntry.domain === newEntry.domain;

      if (!sameDomain && oldEntry && activeTimers[oldHostname]) {
        const remaining = activeTimers[oldHostname] - Date.now();
        if (remaining > 0) pausedTimers[oldHostname] = remaining;
        delete activeTimers[oldHostname];
        chrome.storage.local.set({ activeTimers, pausedTimers });
      }

      if (!isBlocked(details.url, sites, activeTimers)) return;

      // Resume a paused timer
      if (pausedTimers[newHostname] > 0) {
        activeTimers[newHostname] = Date.now() + pausedTimers[newHostname];
        delete pausedTimers[newHostname];
        chrome.storage.local.set({ activeTimers, pausedTimers });
        return;
      }

      // Auto-start or block
      const siteEntry = findSiteEntry(newHostname, sites);
      const today = getToday();

      if (shouldAutoStart(newHostname, siteEntry, usedTimerDates, today)) {
        activeTimers[newHostname] = Date.now() + siteEntry.timerMinutes * 60 * 1000;
        usedTimerDates[newHostname] = today;
        chrome.storage.local.set({ activeTimers, usedTimerDates });
        return;
      }

      chrome.tabs.update(details.tabId, {
        url: BLOCKED_PAGE + "?site=" + encodeURIComponent(new URL(details.url).hostname)
          + "&returnTo=" + encodeURIComponent(details.url),
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
        { activeTimers: data.activeTimers, usedTimerDates: data.usedTimerDates, pausedTimers: data.pausedTimers },
        () => sendResponse({ ok: true })
      );
    });
    return true;
  }
  if (msg.type === "GET_TIMER_STATE") {
    chrome.storage.local.get({ activeTimers: {} }, ({ activeTimers }) => {
      sendResponse({ expiry: activeTimers[msg.domain] ?? null });
    });
    return true;
  }
  if (msg.type === "GET_SITE_CONFIG") {
    chrome.storage.sync.get({ blockedSites: [] }, ({ blockedSites }) => {
      const sites = normalizeSites(blockedSites);
      const entry = sites.find(e => e.domain === msg.domain) ?? null;
      sendResponse({ entry });
    });
    return true;
  }
});
