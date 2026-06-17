import "./handlers.js";
import { getBlockedSites } from "../shared/storage.js";

function updateIcon() {
  getBlockedSites((sites) => {
    const active = sites.some((s) => s.isActiveToday());
    const prefix = active ? "icons/icon_red_" : "icons/icon_";
    chrome.action.setIcon({
      path: { 16: prefix + "16.png", 32: prefix + "32.png", 48: prefix + "48.png", 128: prefix + "128.png" },
    });
  });
}

chrome.storage.onChanged.addListener((_, area) => {
  if (area === "local") updateIcon();
});

updateIcon();
