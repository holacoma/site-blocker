import { t, setLang } from "../../shared/i18n.js";
import { BlockedSite } from "../../shared/BlockedSite.js";

const dot           = document.getElementById("dot");
const statusText    = document.getElementById("status-text");
const blockSiteBtn  = document.getElementById("block-site");
const settingsBtn   = document.getElementById("open-settings");

chrome.storage.sync.get({ lang: "es" }, ({ lang }) => {
  setLang(lang);
  settingsBtn.textContent = "⚙ " + t("settingsTitle");
});

settingsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

function formatMs(ms) {
  if (ms <= 0) return "0:00";
  const totalSec = Math.ceil(ms / 1000);
  return `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, "0")}`;
}

function showBlocked(hostname) {
  dot.className = "dot blocked";
  statusText.innerHTML = `<span class="site-label">${hostname}</span><br>${t("blockSiteBlocked")}`;
}

function showTimer(hostname, expiry) {
  dot.className = "dot timer";
  const remaining = () => formatMs(expiry - Date.now());
  statusText.innerHTML =
    `<span class="site-label">${hostname}</span><br>` +
    `<span class="timer-label" id="countdown">${remaining()}</span> restantes`;
  const iv = setInterval(() => {
    const el = document.getElementById("countdown");
    if (!el || Date.now() >= expiry) { clearInterval(iv); return; }
    el.textContent = remaining();
  }, 1000);
}

function showAllowed(hostname) {
  dot.className = "dot allowed";
  statusText.innerHTML = `<span class="site-label">${hostname}</span><br>Not blocked`;
}

function showUnknown() {
  dot.className = "dot unknown";
  statusText.textContent = "No information";
}

function setupBlockButton(hostname) {
  blockSiteBtn.textContent = `(/) ${t("blockSiteLabel")}`;
  blockSiteBtn.style.display = "";

  let pending = false;
  let timer   = null;

  function reset() {
    pending = false;
    clearTimeout(timer);
    blockSiteBtn.textContent = `(/) ${t("blockSiteLabel")}`;
    blockSiteBtn.classList.remove("block-site--pending");
  }

  blockSiteBtn.addEventListener("click", () => {
    if (!pending) {
      pending = true;
      blockSiteBtn.textContent = t("blockSiteConfirm");
      blockSiteBtn.classList.add("block-site--pending");
      timer = setTimeout(reset, 3000);
    } else {
      clearTimeout(timer);
      blockSiteBtn.disabled = true;
      chrome.storage.sync.get({ blockedSites: [], defaultTimerMinutes: 5 }, ({ blockedSites, defaultTimerMinutes }) => {
        const newSite = new BlockedSite({
          domain: hostname,
          timerMinutes: defaultTimerMinutes,
          days: [0, 1, 2, 3, 4, 5, 6],
        });
        const updated = [...blockedSites, newSite.toJSON()];
        chrome.storage.sync.set({ blockedSites: updated }, () => {
          blockSiteBtn.style.display = "none";
          showBlocked(hostname);
        });
      });
    }
  });

  blockSiteBtn.addEventListener("blur", reset);
}

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab?.url) { showUnknown(); return; }

  let hostname;
  try { hostname = new URL(tab.url).hostname.replace(/^www\./, ""); }
  catch { showUnknown(); return; }

  if (!hostname || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
    showUnknown();
    return;
  }

  chrome.runtime.sendMessage({ type: "GET_SITE_CONFIG", domain: hostname }, (resp) => {
    if (!resp?.entry) {
      showAllowed(hostname);
      setupBlockButton(hostname);
      return;
    }

    chrome.runtime.sendMessage({ type: "GET_TIMER_STATE", domain: hostname }, (timerResp) => {
      const expiry = timerResp?.expiry;
      if (expiry && Date.now() < expiry) {
        showTimer(hostname, expiry);
      } else {
        showBlocked(hostname);
      }
    });
  });
});
