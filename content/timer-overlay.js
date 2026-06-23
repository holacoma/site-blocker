(function () {
  const hostname = location.hostname.replace(/^www\./, "");
  if (!hostname) return;

  let started = false;

  function startIfValid(expiry) {
    if (started || !expiry || Date.now() >= expiry) return;
    started = true;
    chrome.storage.onChanged.removeListener(onStorageChange);
    chrome.storage.local.get(
      { overlayBarTheme: "default", overlayBarPosition: "bottom", overlayExpiryTheme: "default" },
      ({ overlayBarTheme, overlayBarPosition, overlayExpiryTheme }) => {
        initNormalPhase(expiry, overlayBarTheme, overlayBarPosition, overlayExpiryTheme);
      }
    );
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

  const DOT_COUNT = 20;

  function initNormalPhase(expiry, barTheme, barPosition, expiryTheme) {
    const totalMs = expiry - Date.now();
    injectStyles(barTheme, barPosition, expiryTheme);

    const bar = createFooterBar(barTheme);
    document.body.appendChild(bar);

    updateBar(bar, barTheme, barPosition, totalMs, totalMs);

    let dismissed = false;
    const closeBtn = bar.querySelector("#sb-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        dismissed = true;
        bar.style.setProperty("display", "none", "important");
      });
    }

    const interval = setInterval(() => {
      const remaining = expiry - Date.now();
      if (remaining <= 0) {
        clearInterval(interval);
        bar.remove();
        startExpiryPhase();
        return;
      }
      if (!dismissed) updateBar(bar, barTheme, barPosition, remaining, totalMs);
    }, 250);
  }

  function updateBar(bar, barTheme, barPosition, remaining, totalMs) {
    const pct = Math.max(0, remaining / totalMs) * 100;
    const isVertical = barPosition === "left" || barPosition === "right";

    const min = Math.floor(remaining / 60000);
    const sec = Math.floor((remaining % 60000) / 1000);
    const timeStr = `${min}:${String(sec).padStart(2, "0")}`;
    const timeEl = bar.querySelector("#sb-time");
    if (timeEl) {
      timeEl.textContent = isVertical ? timeStr : `${timeStr} restantes`;
    }

    let color;
    if (pct > 50)      color = "#1a73e8";
    else if (pct > 25) color = "#f9ab00";
    else               color = "#d93025";

    if (barTheme === "dots") {
      const dots = bar.querySelectorAll(".sb-dot");
      const active = Math.ceil(dots.length * pct / 100);
      dots.forEach((dot, i) => {
        dot.style.setProperty(
          "background",
          i < active ? color : "rgba(0,0,0,0.1)",
          "important"
        );
      });
    } else {
      const fill = bar.querySelector("#sb-fill");
      const axis = isVertical ? "height" : "width";
      fill.style.setProperty(axis, pct + "%", "important");
      fill.style.setProperty("background", color, "important");
    }
  }

  function createFooterBar(barTheme) {
    const bar = document.createElement("div");
    bar.id = "sb-footer";

    if (barTheme === "border") {
      bar.innerHTML = '<div id="sb-track"><div id="sb-fill"></div></div>';
    } else if (barTheme === "dots") {
      let dots = '<div id="sb-dots">';
      for (let i = 0; i < DOT_COUNT; i++) dots += '<span class="sb-dot"></span>';
      dots += "</div>";
      bar.innerHTML =
        dots +
        '<span id="sb-time"></span>' +
        '<button id="sb-close" title="Ocultar">×</button>';
    } else {
      bar.innerHTML =
        '<div id="sb-track"><div id="sb-fill"></div></div>' +
        '<span id="sb-time"></span>' +
        '<button id="sb-close" title="Ocultar">×</button>';
    }
    return bar;
  }

  function injectStyles(barTheme, barPosition, expiryTheme) {
    if (document.getElementById("sb-styles")) return;
    const style = document.createElement("style");
    style.id = "sb-styles";
    style.textContent = getBarCSS(barTheme, barPosition) + getExpiryCSS(expiryTheme);
    document.head.appendChild(style);
  }

  function getBarCSS(theme, position) {
    const isVertical = position === "left" || position === "right";
    return isVertical ? getVerticalCSS(theme, position) : getHorizontalCSS(theme, position);
  }

  function getHorizontalCSS(theme, position) {
    const isTop = position === "top";
    const edge  = isTop ? "top" : "bottom";
    const bord  = `border-${isTop ? "bottom" : "top"}:1px solid #dde1e7!important;`;
    const shad  = `box-shadow:${isTop ? "0 2px 12px" : "0 -2px 12px"} rgba(0,0,0,0.08)!important;`;
    const pos   = `${edge}:0!important;left:0!important;right:0!important;`;

    const timeLabel =
      "#sb-time{color:#666!important;font-size:13px!important;white-space:nowrap!important;" +
      "font-family:monospace!important;min-width:90px!important;text-align:right!important;}";
    const closeBtn =
      "#sb-close{background:none!important;border:none!important;color:#bbb!important;" +
      "cursor:pointer!important;font-size:20px!important;padding:0 2px!important;" +
      "line-height:1!important;flex-shrink:0!important;}" +
      "#sb-close:hover{color:#555!important;}";
    const footerBase =
      `#sb-footer{position:fixed!important;${pos}` +
      `z-index:2147483647!important;height:50px!important;` +
      `background:rgba(248,249,250,0.97)!important;backdrop-filter:blur(10px)!important;` +
      `${bord}${shad}` +
      `display:flex!important;align-items:center!important;` +
      `padding:0 16px!important;gap:14px!important;` +
      `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important;}`;

    if (theme === "border") {
      return (
        `#sb-footer{position:fixed!important;${pos}` +
          `z-index:2147483647!important;height:3px!important;` +
          `background:transparent!important;border:none!important;` +
          `box-shadow:none!important;padding:0!important;display:block!important;}` +
        "#sb-track{width:100%!important;height:3px!important;background:transparent!important;}" +
        "#sb-fill{height:3px!important;width:100%;background:#1a73e8;" +
          "transition:width .25s linear,background .5s!important;}"
      );
    }

    if (theme === "minimal") {
      return [
        `#sb-footer{position:fixed!important;${pos}` +
          `z-index:2147483647!important;height:26px!important;` +
          `background:rgba(255,255,255,0.9)!important;backdrop-filter:blur(10px)!important;` +
          `border-${isTop ? "bottom" : "top"}:1px solid rgba(0,0,0,0.08)!important;` +
          `display:flex!important;align-items:center!important;` +
          `padding:0 14px!important;gap:10px!important;` +
          `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important;}`,
        "#sb-track{flex:1!important;height:3px!important;background:rgba(0,0,0,0.1)!important;" +
          "border-radius:2px!important;overflow:hidden!important;}",
        "#sb-fill{height:100%!important;border-radius:2px!important;width:100%;" +
          "background:#1a73e8;transition:width .25s linear,background .5s!important;}",
        "#sb-time{color:#888!important;font-size:10px!important;white-space:nowrap!important;" +
          "font-family:monospace!important;}",
        "#sb-close{background:none!important;border:none!important;color:rgba(0,0,0,0.25)!important;" +
          "cursor:pointer!important;font-size:14px!important;padding:0!important;" +
          "line-height:1!important;flex-shrink:0!important;}" +
          "#sb-close:hover{color:rgba(0,0,0,0.55)!important;}",
      ].join("");
    }

    if (theme === "dots") {
      return footerBase +
        "#sb-dots{flex:1!important;display:flex!important;align-items:center!important;" +
          "justify-content:space-evenly!important;}" +
        ".sb-dot{width:10px!important;height:10px!important;border-radius:50%!important;" +
          "background:rgba(0,0,0,0.1)!important;flex-shrink:0!important;" +
          "transition:background .4s!important;}" +
        timeLabel + closeBtn;
    }

    if (theme === "segments") {
      return footerBase +
        "#sb-track{flex:1!important;height:10px!important;background:#e8eaed!important;" +
          "position:relative!important;overflow:visible!important;}" +
        "#sb-track::after{content:''!important;position:absolute!important;inset:0!important;" +
          "background:repeating-linear-gradient(90deg,transparent 0,transparent 16px,#f8f9fa 16px,#f8f9fa 19px)!important;" +
          "z-index:2!important;pointer-events:none!important;}" +
        "#sb-fill{height:100%!important;width:100%;background:#1a73e8;" +
          "transition:width .25s linear,background .5s!important;" +
          "position:relative!important;z-index:1!important;}" +
        timeLabel + closeBtn;
    }

    // default
    return footerBase +
      "#sb-track{flex:1!important;height:8px!important;background:#e8eaed!important;" +
        "border-radius:4px!important;overflow:hidden!important;}" +
      "#sb-fill{height:100%!important;border-radius:4px!important;width:100%;" +
        "background:#1a73e8;transition:width .25s linear,background .5s!important;}" +
      timeLabel + closeBtn;
  }

  function getVerticalCSS(theme, position) {
    const isLeft = position === "left";
    const edge   = isLeft ? "left" : "right";
    const bord   = `border-${isLeft ? "right" : "left"}:1px solid #dde1e7!important;`;
    const shad   = `box-shadow:${isLeft ? "2px" : "-2px"} 0 12px rgba(0,0,0,0.08)!important;`;
    const pos    = `top:0!important;bottom:0!important;${edge}:0!important;`;

    // Re-order elements: close on top, then time, then track/dots
    const orderCSS =
      "#sb-close{order:1!important;}" +
      "#sb-time{order:2!important;}" +
      "#sb-track,#sb-dots{order:3!important;}";

    const timeLabel =
      "#sb-time{color:#666!important;font-size:11px!important;" +
      "font-family:monospace!important;text-align:center!important;white-space:nowrap!important;}";
    const closeBtn =
      "#sb-close{background:none!important;border:none!important;color:#bbb!important;" +
      "cursor:pointer!important;font-size:18px!important;padding:2px 0!important;" +
      "line-height:1!important;flex-shrink:0!important;}" +
      "#sb-close:hover{color:#555!important;}";

    if (theme === "border") {
      return (
        `#sb-footer{position:fixed!important;${pos}` +
          `z-index:2147483647!important;width:3px!important;` +
          `background:transparent!important;border:none!important;` +
          `box-shadow:none!important;padding:0!important;display:block!important;}` +
        "#sb-track{width:3px!important;height:100%!important;background:transparent!important;" +
          "position:relative!important;}" +
        "#sb-fill{position:absolute!important;bottom:0!important;left:0!important;right:0!important;" +
          "height:100%;width:100%!important;background:#1a73e8;" +
          "transition:height .25s linear,background .5s!important;}"
      );
    }

    if (theme === "minimal") {
      return [
        `#sb-footer{position:fixed!important;${pos}` +
          `z-index:2147483647!important;width:26px!important;` +
          `background:rgba(255,255,255,0.9)!important;backdrop-filter:blur(10px)!important;` +
          `border-${isLeft ? "right" : "left"}:1px solid rgba(0,0,0,0.08)!important;` +
          `display:flex!important;flex-direction:column!important;align-items:center!important;` +
          `padding:10px 0!important;gap:8px!important;` +
          `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important;}`,
        "#sb-track{width:3px!important;flex:1!important;height:auto!important;" +
          "background:rgba(0,0,0,0.1)!important;" +
          "border-radius:2px!important;position:relative!important;overflow:hidden!important;}",
        "#sb-fill{position:absolute!important;bottom:0!important;left:0!important;right:0!important;" +
          "height:100%!important;width:100%!important;background:#1a73e8;" +
          "border-radius:2px!important;transition:height .25s linear,background .5s!important;}",
        "#sb-time{color:#888!important;font-size:9px!important;font-family:monospace!important;" +
          "text-align:center!important;white-space:nowrap!important;}",
        "#sb-close{background:none!important;border:none!important;color:rgba(0,0,0,0.25)!important;" +
          "cursor:pointer!important;font-size:12px!important;padding:0!important;" +
          "line-height:1!important;flex-shrink:0!important;}" +
          "#sb-close:hover{color:rgba(0,0,0,0.55)!important;}",
        orderCSS,
      ].join("");
    }

    const footerBase =
      `#sb-footer{position:fixed!important;${pos}` +
      `z-index:2147483647!important;width:52px!important;height:auto!important;` +
      `background:rgba(248,249,250,0.97)!important;backdrop-filter:blur(10px)!important;` +
      `${bord}${shad}` +
      `display:flex!important;flex-direction:column!important;align-items:center!important;` +
      `padding:12px 0!important;gap:10px!important;` +
      `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important;}`;

    if (theme === "dots") {
      return footerBase +
        "#sb-dots{flex:1!important;display:flex!important;flex-direction:column!important;" +
          "align-items:center!important;justify-content:space-evenly!important;width:100%!important;}" +
        ".sb-dot{width:10px!important;height:10px!important;border-radius:50%!important;" +
          "background:rgba(0,0,0,0.1)!important;flex-shrink:0!important;" +
          "transition:background .4s!important;}" +
        timeLabel + closeBtn + orderCSS;
    }

    if (theme === "segments") {
      return footerBase +
        "#sb-track{width:10px!important;flex:1!important;height:auto!important;" +
          "background:#e8eaed!important;align-self:center!important;" +
          "position:relative!important;overflow:visible!important;}" +
        "#sb-track::after{content:''!important;position:absolute!important;inset:0!important;" +
          "background:repeating-linear-gradient(0deg,transparent 0,transparent 16px,#f8f9fa 16px,#f8f9fa 19px)!important;" +
          "z-index:2!important;pointer-events:none!important;}" +
        "#sb-fill{position:absolute!important;bottom:0!important;left:0!important;right:0!important;" +
          "height:100%!important;width:100%!important;background:#1a73e8;" +
          "transition:height .25s linear,background .5s!important;z-index:1!important;}" +
        timeLabel + closeBtn + orderCSS;
    }

    // default vertical
    return footerBase +
      "#sb-track{width:8px!important;flex:1!important;height:auto!important;" +
        "background:#e8eaed!important;align-self:center!important;" +
        "border-radius:4px!important;position:relative!important;overflow:hidden!important;}" +
      "#sb-fill{position:absolute!important;bottom:0!important;left:0!important;right:0!important;" +
        "height:100%!important;width:100%!important;background:#1a73e8;" +
        "border-radius:4px!important;transition:height .25s linear,background .5s!important;}" +
      timeLabel + closeBtn + orderCSS;
  }

  function getExpiryCSS(theme) {
    const font = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important;";

    const miniCSS =
      "#sb-mini{position:fixed!important;bottom:20px!important;right:20px!important;" +
      "z-index:2147483648!important;background:rgba(20,20,20,0.88)!important;" +
      "backdrop-filter:blur(8px)!important;border-radius:28px!important;" +
      "padding:12px 24px!important;cursor:pointer!important;" +
      "display:flex!important;align-items:center!important;gap:8px!important;" +
      "box-shadow:0 4px 20px rgba(0,0,0,0.45)!important;user-select:none!important;}" +
      "#sb-mini:hover{transform:scale(1.04)!important;}" +
      "#sb-mini-count{color:#fff!important;font-size:1.4rem!important;" +
      "font-family:monospace!important;font-weight:700!important;line-height:1!important;}";

    const minimizeBtn = (light) =>
      "#sb-minimize{position:absolute!important;top:8px!important;right:8px!important;" +
      "background:none!important;border:none!important;cursor:pointer!important;" +
      "width:34px!important;height:34px!important;border-radius:50%!important;" +
      "display:flex!important;align-items:center!important;justify-content:center!important;" +
      "font-size:22px!important;line-height:1!important;padding:0!important;" +
      "color:" + (light ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.3)") + "!important;" +
      "transition:background .15s,color .15s!important;flex-shrink:0!important;}" +
      "#sb-minimize:hover{" +
      "background:" + (light ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)") + "!important;" +
      "color:" + (light ? "#fff" : "rgba(0,0,0,0.65)") + "!important;}";

    if (theme === "toast") {
      return [
        "@keyframes sb-expiry-enter{from{transform:translateX(calc(100% + 24px));opacity:0}" +
          "to{transform:translateX(0);opacity:1}}",
        "#sb-expiry-overlay{position:fixed!important;bottom:24px!important;right:24px!important;" +
          "left:auto!important;top:auto!important;width:auto!important;height:auto!important;" +
          "z-index:2147483647!important;display:flex!important;flex-direction:column!important;" +
          "align-items:center!important;gap:4px!important;" +
          "background:rgba(255,255,255,0.97)!important;backdrop-filter:blur(12px)!important;" +
          "border:1px solid #dde1e7!important;border-radius:12px!important;" +
          "padding:36px 20px 12px!important;box-shadow:0 4px 24px rgba(0,0,0,0.15)!important;" +
          "pointer-events:all!important;user-select:none!important;" +
          "animation:sb-expiry-enter .8s ease-out forwards!important;}",
        "#sb-countdown{font-size:1.5rem!important;font-family:monospace!important;" +
          "font-weight:900!important;color:#d93025!important;line-height:1!important;}",
        `#sb-expiry-msg{font-size:.75rem!important;color:#666!important;${font}}`,
        minimizeBtn(false),
        miniCSS,
      ].join("");
    }

    if (theme === "subtle") {
      return [
        "@keyframes sb-expiry-enter{from{transform:translateY(100%);opacity:0}" +
          "to{transform:translateY(0);opacity:1}}",
        "#sb-expiry-overlay{position:fixed!important;bottom:0!important;left:0!important;" +
          "right:0!important;height:56px!important;" +
          "z-index:2147483647!important;display:flex!important;flex-direction:row!important;" +
          "align-items:center!important;justify-content:center!important;gap:16px!important;" +
          "background:rgba(90,0,0,0.92)!important;" +
          "pointer-events:all!important;user-select:none!important;" +
          "animation:sb-expiry-enter .8s ease-out forwards!important;}",
        "#sb-countdown{font-size:1.6rem!important;font-family:monospace!important;" +
          "font-weight:900!important;color:#fff!important;line-height:1!important;}",
        `#sb-expiry-msg{font-size:.85rem!important;color:rgba(255,180,180,0.9)!important;` +
          `letter-spacing:.05em!important;${font}}`,
        minimizeBtn(true),
        miniCSS,
      ].join("");
    }

    if (theme === "blur") {
      return [
        "@keyframes sb-expiry-enter{from{opacity:0}to{opacity:1}}",
        "#sb-expiry-overlay{position:fixed!important;inset:0!important;" +
          "z-index:2147483647!important;display:flex!important;flex-direction:column!important;" +
          "align-items:center!important;justify-content:center!important;gap:14px!important;" +
          "background:rgba(0,0,0,0.45)!important;backdrop-filter:blur(10px)!important;" +
          "pointer-events:all!important;user-select:none!important;" +
          "animation:sb-expiry-enter 1s ease-out forwards!important;}",
        "#sb-countdown{font-size:clamp(3rem,10vw,7rem)!important;font-family:monospace!important;" +
          "font-weight:900!important;color:#fff!important;line-height:1!important;" +
          "text-shadow:0 2px 24px rgba(0,0,0,.6)!important;}",
        `#sb-expiry-msg{font-size:clamp(.9rem,2vw,1.3rem)!important;` +
          `color:rgba(255,255,255,0.75)!important;letter-spacing:.06em!important;${font}}`,
        minimizeBtn(true),
        miniCSS,
      ].join("");
    }

    if (theme === "fullscreen") {
      return [
        "@keyframes sb-breathe{0%,100%{background:#0f0f23}50%{background:#1a1a3e}}",
        "@keyframes sb-expiry-enter{from{opacity:0}to{opacity:1}}",
        "#sb-expiry-overlay{position:fixed!important;inset:0!important;" +
          "z-index:2147483647!important;display:flex!important;flex-direction:column!important;" +
          "align-items:center!important;justify-content:center!important;gap:20px!important;" +
          "animation:sb-expiry-enter 1.2s ease-in-out forwards," +
          "sb-breathe 2s ease-in-out 1.2s infinite backwards!important;" +
          "pointer-events:all!important;user-select:none!important;}",
        "#sb-countdown{font-size:clamp(5rem,18vw,15rem)!important;font-family:monospace!important;" +
          "font-weight:900!important;color:#fff!important;line-height:1!important;" +
          "text-shadow:0 0 60px rgba(255,255,255,.15)!important;}",
        `#sb-expiry-msg{font-size:clamp(1rem,3vw,2rem)!important;` +
          `color:rgba(255,255,255,0.5)!important;letter-spacing:.15em!important;${font}}`,
        minimizeBtn(true),
        miniCSS,
      ].join("");
    }

    // default (classic)
    return [
      "@keyframes sb-pulse{0%,100%{background-color:#cc0000}50%{background-color:#ddaa00}}",
      "@keyframes sb-expiry-enter{from{transform:translateY(100%);opacity:0}" +
        "to{transform:translateY(0);opacity:1}}",
      "#sb-expiry-overlay{position:fixed!important;bottom:0!important;left:0!important;" +
        "right:0!important;height:20vh!important;" +
        "z-index:2147483647!important;display:flex!important;flex-direction:row!important;" +
        "align-items:center!important;justify-content:center!important;gap:2vw!important;" +
        "animation:sb-expiry-enter .8s ease-out forwards," +
        "sb-pulse .5s ease-in-out .8s infinite backwards!important;" +
        "pointer-events:all!important;user-select:none!important;}",
      "#sb-countdown{font-size:10vh!important;font-family:monospace!important;" +
        "font-weight:900!important;color:#fff!important;line-height:1!important;" +
        "text-shadow:0 0 40px rgba(0,0,0,.5),0 2px 12px rgba(0,0,0,.9)!important;}",
      `#sb-expiry-msg{font-size:clamp(.8rem,2.5vh,1.5rem)!important;color:#fff!important;` +
        `letter-spacing:.05em!important;text-shadow:0 2px 8px rgba(0,0,0,.8)!important;${font}}`,
      minimizeBtn(true),
      miniCSS,
    ].join("");
  }

  function startExpiryPhase() {
    const expiryEnd = Date.now() + 30_000;

    const overlay = document.createElement("div");
    overlay.id = "sb-expiry-overlay";
    overlay.innerHTML =
      '<button id="sb-minimize" title="Minimizar">−</button>' +
      '<div id="sb-countdown">30.0000</div>' +
      '<div id="sb-expiry-msg">¡Tiempo agotado! Cerrando...</div>';
    document.documentElement.appendChild(overlay);

    const mini = document.createElement("div");
    mini.id = "sb-mini";
    mini.title = "Restaurar";
    mini.innerHTML = '<span id="sb-mini-count">30</span>';
    mini.style.setProperty("display", "none", "important");
    document.documentElement.appendChild(mini);

    const countdown = overlay.querySelector("#sb-countdown");
    const miniCount = mini.querySelector("#sb-mini-count");

    overlay.querySelector("#sb-minimize").addEventListener("click", () => {
      overlay.style.setProperty("display", "none", "important");
      mini.style.removeProperty("display");
    });
    mini.addEventListener("click", () => {
      mini.style.setProperty("display", "none", "important");
      overlay.style.removeProperty("display");
    });

    const ticker = setInterval(() => {
      const msLeft = Math.max(0, expiryEnd - Date.now());
      const secs  = Math.floor(msLeft / 1000);
      const subMs = Math.floor((msLeft % 1000) * 10);
      countdown.textContent =
        String(secs).padStart(2, "0") + "." + String(subMs).padStart(4, "0");
      miniCount.textContent = String(secs).padStart(2, "0");

      if (msLeft <= 0) {
        clearInterval(ticker);
        chrome.runtime.sendMessage({ type: "REDIRECT_TO_BLOCKED", site: location.hostname });
      }
    }, 16);
  }
})();
