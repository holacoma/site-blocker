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
    return blockedSites.some((entry) => {
      if (!isActiveToday(entry)) return false;
      const clean = entry.domain.replace(/^www\./, "");
      if (hostname !== clean && !hostname.endsWith("." + clean)) return false;
      const expiry = activeTimers[clean];
      return !(expiry && Date.now() < expiry);
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

function pauseTimerForTab(tabId) {
  chrome.storage.session.get({ tabHostnames: {} }, ({ tabHostnames }) => {
    const hostname = tabHostnames[String(tabId)];
    if (!hostname) return;
    getFullState((sites, activeTimers, _used, pausedTimers) => {
      const entry = findSiteEntry(hostname, sites);
      if (!entry) return;
      const domain = entry.domain.replace(/^www\./, "");
      if (!activeTimers[domain]) return;
      const remaining = activeTimers[domain] - Date.now();
      if (remaining > 0) pausedTimers[domain] = remaining;
      delete activeTimers[domain];
      chrome.storage.local.set({ activeTimers, pausedTimers });
    });
  });
}

function resumeTimerForTab(tabId) {
  chrome.storage.session.get({ tabHostnames: {} }, ({ tabHostnames }) => {
    const hostname = tabHostnames[String(tabId)];
    if (!hostname) return;
    getFullState((sites, activeTimers, _used, pausedTimers) => {
      const entry = findSiteEntry(hostname, sites);
      if (!entry) return;
      const domain = entry.domain.replace(/^www\./, "");
      if (!(pausedTimers[domain] > 0)) return;
      activeTimers[domain] = Date.now() + pausedTimers[domain];
      delete pausedTimers[domain];
      chrome.storage.local.set({ activeTimers, pausedTimers });
    });
  });
}

// Track the last committed hostname per tab in storage.session so the value
// survives service-worker restarts within the same browser session.
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
    chrome.storage.session.set({ tabHostnames: data.tabHostnames, activeTabPerWindow: data.activeTabPerWindow });
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
      if (changed) chrome.storage.local.set({ activeTimers: data.activeTimers, pausedTimers: data.pausedTimers });
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
  try { newHostname = new URL(details.url).hostname.replace(/^www\./, ""); }
  catch { return; }

  chrome.storage.session.get({ tabHostnames: {} }, ({ tabHostnames }) => {
    const oldHostname = tabHostnames[String(details.tabId)] ?? "";
    console.log("[SB] onBeforeNavigate tab=" + details.tabId + " old=" + (oldHostname || "(none)") + " -> new=" + newHostname);

    getFullState((sites, activeTimers, usedTimerDates, pausedTimers) => {
      console.log("[SB] state: activeTimers=" + JSON.stringify(activeTimers) + " pausedTimers=" + JSON.stringify(pausedTimers));

      const oldEntry = oldHostname ? findSiteEntry(oldHostname, sites) : null;
      const newEntry = findSiteEntry(newHostname, sites);
      const sameDomain = oldEntry && newEntry && oldEntry.domain === newEntry.domain;

      // Use the canonical domain from the blocked list as the storage key,
      // so that subdomains (e.g. web.facebook.com) share the same timer as facebook.com.
      const oldDomain = oldEntry ? oldEntry.domain.replace(/^www\./, "") : "";
      const newDomain = newEntry ? newEntry.domain.replace(/^www\./, "") : newHostname;

      if (!sameDomain && oldDomain && activeTimers[oldDomain]) {
        const remaining = activeTimers[oldDomain] - Date.now();
        console.log("[SB] PAUSING " + oldDomain + " remaining=" + Math.round(remaining / 1000) + "s");
        if (remaining > 0) pausedTimers[oldDomain] = remaining;
        delete activeTimers[oldDomain];
        chrome.storage.local.set({ activeTimers, pausedTimers });
      } else {
        console.log("[SB] no pause: oldEntry=" + !!oldEntry + " sameDomain=" + sameDomain + " activeTimer=" + !!activeTimers[oldDomain]);
      }

      if (!isBlocked(details.url, sites, activeTimers)) return;

      // Resume a paused timer
      if (pausedTimers[newDomain] > 0) {
        console.log("[SB] RESUMING " + newDomain + " remaining=" + Math.round(pausedTimers[newDomain] / 1000) + "s");
        activeTimers[newDomain] = Date.now() + pausedTimers[newDomain];
        delete pausedTimers[newDomain];
        chrome.storage.local.set({ activeTimers, pausedTimers });
        return;
      }

      // Auto-start or block
      const today = getToday();

      if (shouldAutoStart(newDomain, newEntry, usedTimerDates, today)) {
        activeTimers[newDomain] = Date.now() + newEntry.timerMinutes * 60 * 1000;
        usedTimerDates[newDomain] = today;
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
    chrome.storage.sync.get({ blockedSites: [] }, ({ blockedSites }) => {
      const sites = normalizeSites(blockedSites);
      const entry = findSiteEntry(msg.domain, sites);
      const domain = entry ? entry.domain.replace(/^www\./, "") : msg.domain;
      chrome.storage.local.get({ activeTimers: {} }, ({ activeTimers }) => {
        sendResponse({ expiry: activeTimers[domain] ?? null });
      });
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
