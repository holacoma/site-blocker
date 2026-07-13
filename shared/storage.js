import { BlockedSite } from "./BlockedSite.js";

/** @typedef {import('./types.js').RawBlockedSite} RawBlockedSite */
/** @typedef {import('./types.js').ActiveTimers} ActiveTimers */
/** @typedef {import('./types.js').PausedTimers} PausedTimers */
/** @typedef {import('./types.js').UsedTimerDates} UsedTimerDates */

/** @param {(sites: BlockedSite[]) => void} callback */
export function getBlockedSites(callback) {
  chrome.storage.sync.get({ blockedSites: [] }, (data) =>
    callback(/** @type {RawBlockedSite[]} */ (data.blockedSites).map(BlockedSite.from))
  );
}

/**
 * @param {BlockedSite[]} sites
 * @param {() => void} [callback]
 */
export function saveBlockedSites(sites, callback) {
  chrome.storage.sync.set({ blockedSites: sites.map((s) => s.toJSON()) }, callback);
}

/**
 * @param {(sites: BlockedSite[], activeTimers: ActiveTimers, usedTimerDates: UsedTimerDates, pausedTimers: PausedTimers) => void} callback
 */
export function getFullState(callback) {
  chrome.storage.sync.get({ blockedSites: [] }, (syncData) => {
    chrome.storage.local.get(
      { activeTimers: {}, usedTimerDates: {}, pausedTimers: {} },
      (localData) => {
        callback(
          /** @type {RawBlockedSite[]} */ (syncData.blockedSites).map(BlockedSite.from),
          /** @type {ActiveTimers} */ (localData.activeTimers),
          /** @type {UsedTimerDates} */ (localData.usedTimerDates),
          /** @type {PausedTimers} */ (localData.pausedTimers)
        );
      }
    );
  });
}
