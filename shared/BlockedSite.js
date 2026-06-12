export class BlockedSite {
  constructor({ domain, days = [0, 1, 2, 3, 4, 5, 6], timerMinutes = 0, exceptions = [] }) {
    this.domain = domain.replace(/^www\./, "");
    this.days = days;
    this.timerMinutes = timerMinutes;
    this.exceptions = exceptions;
  }

  isActiveToday() {
    return this.days.includes(new Date().getDay());
  }

  shouldAutoStart(usedTimerDates, today) {
    if (!this.timerMinutes || this.timerMinutes <= 0) return false;
    return usedTimerDates[this.domain] !== today;
  }

  matches(hostname) {
    const h = hostname.replace(/^www\./, "");
    return h === this.domain || h.endsWith("." + this.domain);
  }

  toJSON() {
    return { domain: this.domain, days: this.days, timerMinutes: this.timerMinutes, exceptions: this.exceptions };
  }

  static from(raw) {
    return new BlockedSite(typeof raw === "string" ? { domain: raw } : raw);
  }

  static findMatch(hostname, sites) {
    const h = hostname.replace(/^www\./, "");
    return sites.find((s) => s.matches(h)) ?? null;
  }
}
