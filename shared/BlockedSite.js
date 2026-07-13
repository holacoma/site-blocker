/** @typedef {import('./types.js').RawBlockedSite} RawBlockedSite */
/** @typedef {import('./types.js').UsedTimerDates} UsedTimerDates */

export class BlockedSite {
  /** @param {RawBlockedSite} site */
  constructor({ domain, days = [0, 1, 2, 3, 4, 5, 6], timerMinutes = 0, exceptions = [] }) {
    this.domain = domain.replace(/^www\./, "");
    this.days = days;
    this.timerMinutes = timerMinutes;
    this.exceptions = exceptions;
  }

  isActiveToday() {
    return this.days.includes(new Date().getDay());
  }

  /**
   * @param {UsedTimerDates} usedTimerDates
   * @param {string} today
   */
  shouldAutoStart(usedTimerDates, today) {
    if (!this.timerMinutes || this.timerMinutes <= 0) return false;
    return usedTimerDates[this.domain] !== today;
  }

  /** @param {string} hostname */
  matches(hostname) {
    const h = hostname.replace(/^www\./, "");
    return h === this.domain || h.endsWith("." + this.domain);
  }

  /** @returns {RawBlockedSite} */
  toJSON() {
    return { domain: this.domain, days: this.days, timerMinutes: this.timerMinutes, exceptions: this.exceptions };
  }

  /** @param {RawBlockedSite | string} raw */
  static from(raw) {
    return new BlockedSite(typeof raw === "string" ? { domain: raw } : raw);
  }

  /**
   * @param {string} hostname
   * @param {BlockedSite[]} sites
   */
  static findMatch(hostname, sites) {
    const h = hostname.replace(/^www\./, "");
    return sites.find((s) => s.matches(h)) ?? null;
  }
}
