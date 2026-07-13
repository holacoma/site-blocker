/** @typedef {import('../shared/BlockedSite.js').BlockedSite} BlockedSite */
/** @typedef {import('../shared/types.js').ActiveTimers} ActiveTimers */

/**
 * @param {string} url
 * @param {string[]} [userExceptions]
 */
export function isAlwaysAllowed(url, userExceptions = []) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");
    return userExceptions.some((allowed) => {
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

/**
 * @param {string} url
 * @param {BlockedSite[]} sites
 * @param {ActiveTimers} [activeTimers]
 */
export function isBlocked(url, sites, activeTimers = {}) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return sites.some((site) => {
      if (!site.isActiveToday()) return false;
      if (!site.matches(hostname)) return false;
      if (isAlwaysAllowed(url, site.exceptions)) return false;
      const expiry = activeTimers[site.domain];
      return !(expiry && Date.now() < expiry);
    });
  } catch {
    return false;
  }
}
