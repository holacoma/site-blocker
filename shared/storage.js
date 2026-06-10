import { BlockedSite } from "./BlockedSite.js";

export function getBlockedSites(callback) {
  chrome.storage.sync.get({ blockedSites: [] }, (data) =>
    callback(data.blockedSites.map(BlockedSite.from))
  );
}

export function saveBlockedSites(sites, callback) {
  chrome.storage.sync.set({ blockedSites: sites.map((s) => s.toJSON()) }, callback);
}

export function getFullState(callback) {
  chrome.storage.sync.get({ blockedSites: [] }, (syncData) => {
    chrome.storage.local.get(
      { activeTimers: {}, usedTimerDates: {}, pausedTimers: {} },
      (localData) => {
        callback(
          syncData.blockedSites.map(BlockedSite.from),
          localData.activeTimers,
          localData.usedTimerDates,
          localData.pausedTimers
        );
      }
    );
  });
}
