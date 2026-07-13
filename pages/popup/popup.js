import { t, initLang } from "../../shared/i18n.js";

const dot           = /** @type {HTMLElement} */ (document.getElementById("dot"));
const statusText    = /** @type {HTMLElement} */ (document.getElementById("status-text"));
const blockSiteBtn  = /** @type {HTMLButtonElement} */ (document.getElementById("block-site"));
const settingsBtn   = /** @type {HTMLElement} */ (document.getElementById("open-settings"));

initLang().then(() => {
  settingsBtn.textContent = "⚙ " + t("settingsTitle");
});

settingsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

/** @param {number} ms */
function formatMs(ms) {
  if (ms <= 0) return "0:00";
  const totalSec = Math.ceil(ms / 1000);
  return `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, "0")}`;
}

/** @param {string} hostname */
function showBlocked(hostname) {
  dot.className = "dot blocked";
  statusText.innerHTML = `<span class="site-label">${hostname}</span><br>${t("blockSiteBlocked")}`;
}

/**
 * @param {string} hostname
 * @param {number} expiry
 */
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

/** @param {string} hostname */
function showAllowed(hostname) {
  dot.className = "dot allowed";
  statusText.innerHTML = `<span class="site-label">${hostname}</span><br>Not blocked`;
}

function showUnknown() {
  dot.className = "dot unknown";
  statusText.textContent = "No information";
}

/**
 * @param {string} hostname
 * @param {number} [tabId]
 */
function setupBlockButton(hostname, tabId) {
  blockSiteBtn.textContent = `⊘ ${t("blockSiteLabel")}`;
  blockSiteBtn.style.display = "";

  let pending = false;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timer = null;

  function reset() {
    pending = false;
    clearTimeout(timer);
    blockSiteBtn.textContent = `⊘ ${t("blockSiteLabel")}`;
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
      chrome.storage.sync.get({ defaultTimerMinutes: 5 }, (data) => {
        const defaultTimerMinutes = /** @type {number} */ (data.defaultTimerMinutes);
        chrome.runtime.sendMessage(
          { type: "BLOCK_SITE", domain: hostname, timerMinutes: defaultTimerMinutes, days: [0, 1, 2, 3, 4, 5, 6] },
          ({ ok }) => {
            if (!ok) return;
            if (defaultTimerMinutes > 0) {
              const expiry = Date.now() + defaultTimerMinutes * 60 * 1000;
              chrome.runtime.sendMessage(
                { type: "START_TIMER", domain: hostname, minutes: defaultTimerMinutes },
                () => {
                  blockSiteBtn.style.display = "none";
                  showTimer(hostname, expiry);
                }
              );
            } else {
              chrome.tabs.reload(tabId);
            }
          }
        );
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
      setupBlockButton(hostname, tab.id);
      return;
    }

    chrome.runtime.sendMessage({ type: "GET_TIMER_STATE", domain: hostname }, (timerResp) => {
      const expiry = timerResp?.expiry;
      const pausedRemaining = timerResp?.pausedRemaining;
      if (expiry && Date.now() < expiry) {
        showTimer(hostname, expiry);
      } else if (pausedRemaining > 0) {
        showTimer(hostname, Date.now() + pausedRemaining);
      } else {
        showBlocked(hostname);
      }
    });
  });
});
