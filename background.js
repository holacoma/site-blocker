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
      ? { domain: entry, days: [0,1,2,3,4,5,6] }
      : entry
  );
}

function getBlockedSites(callback) {
  chrome.storage.sync.get({ blockedSites: [] }, (data) =>
    callback(normalizeSites(data.blockedSites))
  );
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

function isBlocked(url, blockedSites) {
  try {
    if (isAlwaysAllowed(url)) return false;
    const hostname = new URL(url).hostname.replace(/^www\./, "");
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
  module.exports = { ALWAYS_ALLOWED, normalizeSites, isActiveToday, isAlwaysAllowed, isBlocked };
}

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return;
  if (details.url.startsWith(BLOCKED_PAGE)) return;

  getBlockedSites((sites) => {
    if (isBlocked(details.url, sites)) {
      chrome.tabs.update(details.tabId, {
        url: BLOCKED_PAGE + "?site=" + encodeURIComponent(new URL(details.url).hostname),
      });
    }
  });
});
