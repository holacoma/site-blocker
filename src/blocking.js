export const ALWAYS_ALLOWED = [
  "music.youtube.com",
  "accounts.google.com",
  "accounts.youtube.com",
  "reddit.com/chat/room/",
];

export function isAlwaysAllowed(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");
    return ALWAYS_ALLOWED.some((allowed) => {
      const slashIdx = allowed.indexOf("/");
      if (slashIdx !== -1) {
        const allowedHost = allowed.slice(0, slashIdx).replace(/^www\./, "");
        const allowedPath = "/" + allowed.slice(slashIdx + 1);
        return (
          (hostname === allowedHost || hostname.endsWith("." + allowedHost)) &&
          parsed.pathname.startsWith(allowedPath)
        );
      }
      return hostname === allowed || hostname.endsWith("." + allowed);
    });
  } catch {
    return false;
  }
}

export function isBlocked(url, sites, activeTimers = {}) {
  try {
    if (isAlwaysAllowed(url)) return false;
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return sites.some((site) => {
      if (!site.isActiveToday()) return false;
      if (!site.matches(hostname)) return false;
      const expiry = activeTimers[site.domain];
      return !(expiry && Date.now() < expiry);
    });
  } catch {
    return false;
  }
}
