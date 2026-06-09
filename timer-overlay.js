(function () {
  const hostname = location.hostname.replace(/^www\./, "");
  if (!hostname) return;

  let started = false;

  function startIfValid(expiry) {
    if (started || !expiry || Date.now() >= expiry) return;
    started = true;
    chrome.storage.onChanged.removeListener(onStorageChange);
    initNormalPhase(expiry);
  }

  function onStorageChange(changes, area) {
    if (area !== "local" || !changes.activeTimers) return;
    chrome.runtime.sendMessage({ type: "GET_TIMER_STATE", domain: hostname }, (resp) => {
      startIfValid(resp?.expiry);
    });
  }
  chrome.storage.onChanged.addListener(onStorageChange);

  chrome.runtime.sendMessage({ type: "GET_TIMER_STATE", domain: hostname }, (resp) => {
    startIfValid(resp?.expiry);
  });

  function initNormalPhase(expiry) {
    const totalMs = expiry - Date.now();
    injectStyles();

    const bar = createFooterBar();
    document.body.appendChild(bar);

    const fill      = bar.querySelector("#sb-fill");
    const timeLabel = bar.querySelector("#sb-time");

    updateBar(fill, timeLabel, totalMs, totalMs);

    let dismissed = false;
    bar.querySelector("#sb-close").addEventListener("click", () => {
      dismissed = true;
      bar.style.display = "none";
    });

    const interval = setInterval(() => {
      const remaining = expiry - Date.now();
      if (remaining <= 0) {
        clearInterval(interval);
        bar.remove();
        startExpiryPhase();
        return;
      }
      if (!dismissed) updateBar(fill, timeLabel, remaining, totalMs);
    }, 250);
  }

  function updateBar(fill, timeLabel, remaining, totalMs) {
    const pct = Math.max(0, remaining / totalMs) * 100;
    fill.style.setProperty("width", pct + "%", "important");

    let color;
    if (pct > 50)      color = "#3d8b3d";
    else if (pct > 25) color = "#8b7a00";
    else               color = "#8b0000";
    fill.style.setProperty("background", color, "important");

    const min = Math.floor(remaining / 60000);
    const sec = Math.floor((remaining % 60000) / 1000);
    timeLabel.textContent = `${min}:${String(sec).padStart(2, "0")} restantes`;
  }

  function createFooterBar() {
    const bar = document.createElement("div");
    bar.id = "sb-footer";
    bar.innerHTML =
      '<div id="sb-track"><div id="sb-fill"></div></div>' +
      '<span id="sb-time"></span>' +
      '<button id="sb-close" title="Ocultar">×</button>';
    return bar;
  }

  function injectStyles() {
    if (document.getElementById("sb-styles")) return;
    const style = document.createElement("style");
    style.id = "sb-styles";
    style.textContent = [
      "#sb-footer{position:fixed!important;bottom:0!important;left:0!important;right:0!important;",
        "z-index:2147483647!important;height:50px!important;background:#111!important;",
        "border-top:1px solid #2a2a2a!important;display:flex!important;align-items:center!important;",
        "padding:0 16px!important;gap:14px!important;",
        "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important;",
        "box-shadow:0 -3px 12px rgba(0,0,0,0.5)!important;}",
      "#sb-track{flex:1!important;height:8px!important;background:#2a2a2a!important;",
        "border-radius:4px!important;overflow:hidden!important;}",
      "#sb-fill{height:100%!important;border-radius:4px!important;width:100%;",
        "background:#3d8b3d;transition:width .25s linear,background .5s!important;}",
      "#sb-time{color:#aaa!important;font-size:13px!important;white-space:nowrap!important;",
        "font-family:monospace!important;min-width:90px!important;text-align:right!important;}",
      "#sb-close{background:none!important;border:none!important;color:#444!important;",
        "cursor:pointer!important;font-size:20px!important;padding:0 2px!important;",
        "line-height:1!important;flex-shrink:0!important;}",
      "#sb-close:hover{color:#aaa!important;}",
      "@keyframes sb-pulse{0%,100%{background-color:#cc0000}50%{background-color:#ddaa00}}",
      "#sb-expiry-overlay{position:fixed!important;bottom:0!important;left:0!important;",
        "right:0!important;height:20vh!important;",
        "z-index:2147483647!important;display:flex!important;flex-direction:row!important;",
        "align-items:center!important;justify-content:center!important;gap:2vw!important;",
        "animation:sb-pulse .5s ease-in-out infinite!important;",
        "pointer-events:all!important;user-select:none!important;}",
      "#sb-countdown{font-size:10vh!important;font-family:monospace!important;",
        "font-weight:900!important;color:#fff!important;line-height:1!important;",
        "text-shadow:0 0 40px rgba(0,0,0,.5),0 2px 12px rgba(0,0,0,.9)!important;}",
      "#sb-expiry-msg{font-size:clamp(.8rem,2.5vh,1.5rem)!important;color:#fff!important;",
        "letter-spacing:.05em!important;",
        "text-shadow:0 2px 8px rgba(0,0,0,.8)!important;",
        "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important;}",
    ].join("");
    document.head.appendChild(style);
  }

  function startExpiryPhase() {
    const expiryEnd = Date.now() + 30_000;

    const overlay = document.createElement("div");
    overlay.id = "sb-expiry-overlay";
    overlay.innerHTML =
      '<div id="sb-countdown">0:30.00</div>' +
      '<div id="sb-expiry-msg">¡Tiempo agotado! Cerrando...</div>';
    document.documentElement.appendChild(overlay);

    const countdown = overlay.querySelector("#sb-countdown");

    const ticker = setInterval(() => {
      const msLeft = Math.max(0, expiryEnd - Date.now());
      const secs  = Math.floor(msLeft / 1000);
      const subMs = Math.floor((msLeft % 1000) * 10);
      countdown.textContent =
        String(secs).padStart(2, "0") + "." + String(subMs).padStart(4, "0");

      if (msLeft <= 0) {
        clearInterval(ticker);
        window.location.href = chrome.runtime.getURL(
          "blocked.html?site=" + encodeURIComponent(location.hostname)
        );
      }
    }, 16);
  }
})();
