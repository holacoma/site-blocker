const dot        = document.getElementById("dot");
const statusText = document.getElementById("status-text");

document.getElementById("open-settings").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

function formatMs(ms) {
  if (ms <= 0) return "0:00";
  const totalSec = Math.ceil(ms / 1000);
  return `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, "0")}`;
}

function showBlocked(hostname) {
  dot.className = "dot blocked";
  statusText.innerHTML = `<span class="site-label">${hostname}</span><br>Sitio bloqueado`;
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
  statusText.innerHTML = `<span class="site-label">${hostname}</span><br>No bloqueado`;
}

function showUnknown() {
  dot.className = "dot unknown";
  statusText.textContent = "Sin información";
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
    if (!resp?.entry) { showAllowed(hostname); return; }

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
