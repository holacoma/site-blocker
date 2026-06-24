(function () {
  const hostname = location.hostname.replace(/^www\./, "");
  if (!hostname) return;

  let started = false;
  let activeInterval = null;
  let activeBar = null;

  function stopNormalPhase() {
    if (activeInterval !== null) {
      clearInterval(activeInterval);
      activeInterval = null;
    }
    if (activeBar !== null) {
      activeBar.remove();
      activeBar = null;
    }
    started = false;
  }

  function startIfValid(expiry) {
    if (started || !expiry || Date.now() >= expiry) return;
    started = true;
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
      if (!resp?.expiry) {
        stopNormalPhase();
        return;
      }
      startIfValid(resp.expiry);
    });
  }
  chrome.storage.onChanged.addListener(onStorageChange);

  chrome.runtime.sendMessage({ type: "GET_TIMER_STATE", domain: hostname }, (resp) => {
    startIfValid(resp?.expiry);
  });

  const DOT_COUNT = 20;

  // ── Template preload ──────────────────────────────────────────────────────

  const TEMPLATES = {};
  const templatesReady = (() => {
    const names = ["bar-fill", "bar-dots", "bar-border", "expiry-overlay", "expiry-mini"];
    return Promise.all(names.map(async (name) => {
      const url = chrome.runtime.getURL(`content/templates/${name}.html`);
      const html = await fetch(url).then((r) => r.text());
      const tpl = document.createElement("template");
      tpl.innerHTML = html.trim();
      TEMPLATES[name] = tpl;
    }));
  })();

  // ── Bar theme registry ────────────────────────────────────────────────────

  const BAR_RENDERERS = {
    border: {
      template: "bar-border",
      update(bar, pct, color, isVertical) {
        const fill = bar.querySelector("#sb-fill");
        fill.style.setProperty(isVertical ? "height" : "width", pct + "%", "important");
        fill.style.setProperty("background", color, "important");
      },
    },
    minimal: {
      template: "bar-fill",
      update: fillUpdate,
    },
    segments: {
      template: "bar-fill",
      update: fillUpdate,
    },
    dots: {
      template: "bar-dots",
      populateTemplate(bar) {
        const container = bar.querySelector("#sb-dots");
        for (let i = 0; i < DOT_COUNT; i++) {
          container.appendChild(document.createElement("span")).className = "sb-dot";
        }
      },
      update(bar, pct, color) {
        const dots = bar.querySelectorAll(".sb-dot");
        const active = Math.ceil(dots.length * pct / 100);
        dots.forEach((dot, i) => {
          dot.style.setProperty("background", i < active ? color : "rgba(0,0,0,0.1)", "important");
        });
      },
    },
    default: {
      template: "bar-fill",
      update: fillUpdate,
    },
  };

  function fillUpdate(bar, pct, color, isVertical) {
    const fill = bar.querySelector("#sb-fill");
    fill.style.setProperty(isVertical ? "height" : "width", pct + "%", "important");
    fill.style.setProperty("background", color, "important");
  }

  // ── CSS injection ─────────────────────────────────────────────────────────

  function injectCSS(id, path) {
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL(path);
    document.head.appendChild(link);
  }

  // ── Core functions ────────────────────────────────────────────────────────

  async function initNormalPhase(expiry, barTheme, barPosition, expiryTheme) {
    await templatesReady;

    const safeBarTheme = barTheme in BAR_RENDERERS ? barTheme : "default";
    injectCSS("sb-bar-styles",    `content/themes/bar/${safeBarTheme}.css`);
    injectCSS("sb-expiry-styles", `content/themes/expiry/${expiryTheme}.css`);

    const totalMs = expiry - Date.now();
    const bar = createFooterBar(safeBarTheme, barPosition);
    activeBar = bar;
    document.body.appendChild(bar);

    updateBar(bar, safeBarTheme, barPosition, totalMs, totalMs);

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
        activeInterval = null;
        activeBar = null;
        bar.remove();
        startExpiryPhase();
        return;
      }
      if (!dismissed) updateBar(bar, safeBarTheme, barPosition, remaining, totalMs);
    }, 250);
    activeInterval = interval;
  }

  function createFooterBar(barTheme, barPosition) {
    const renderer = BAR_RENDERERS[barTheme] ?? BAR_RENDERERS.default;
    const bar = document.createElement("div");
    bar.id = "sb-footer";
    bar.dataset.pos = barPosition;
    bar.appendChild(TEMPLATES[renderer.template].content.cloneNode(true));
    renderer.populateTemplate?.(bar);
    return bar;
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

    (BAR_RENDERERS[barTheme] ?? BAR_RENDERERS.default).update(bar, pct, color, isVertical);
  }

  function startExpiryPhase() {
    const expiryEnd = Date.now() + 30_000;

    const overlay = document.createElement("div");
    overlay.id = "sb-expiry-overlay";
    overlay.appendChild(TEMPLATES["expiry-overlay"].content.cloneNode(true));
    document.documentElement.appendChild(overlay);

    const mini = document.createElement("div");
    mini.id = "sb-mini";
    mini.title = "Restaurar";
    mini.appendChild(TEMPLATES["expiry-mini"].content.cloneNode(true));
    mini.style.setProperty("display", "none", "important");
    document.documentElement.appendChild(mini);

    const countdown = overlay.querySelector("#sb-countdown");
    const miniCount = mini.querySelector("#sb-mini-count");

    overlay.addEventListener("click", () => {
      overlay.classList.add("sb-minimizing");
      setTimeout(() => {
        mini.classList.add("sb-mini-entering");
        mini.style.removeProperty("display");
      }, 2500);
      setTimeout(() => overlay.style.setProperty("display", "none", "important"), 3000);
    });
    mini.addEventListener("click", () => {
      mini.style.setProperty("display", "none", "important");
      mini.classList.remove("sb-mini-entering");
      overlay.classList.remove("sb-minimizing");
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
        startBlockTransition(hostname);
      }
    }, 16);
  }

  function startBlockTransition(site) {
    const blockedUrl =
      chrome.runtime.getURL("pages/blocked/blocked.html") +
      "?site=" + encodeURIComponent(site);

    const style = document.createElement("style");
    style.textContent = `
      @keyframes sb-tr-bg { from { opacity:0 } to { opacity:1 } }
      @keyframes sb-tr-in { from { opacity:0; transform:scale(0.93) } to { opacity:1; transform:scale(1) } }
      #sb-block-tr {
        position: fixed !important;
        inset: 0 !important;
        z-index: 2147483647 !important;
        background: #0d0d14 !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 22px !important;
        opacity: 0 !important;
        animation: sb-tr-bg 0.9s ease forwards !important;
        pointer-events: all !important;
      }
      #sb-block-tr img {
        width: 132px !important;
        height: auto !important;
        opacity: 0 !important;
        animation: sb-tr-in 0.75s ease 0.8s forwards !important;
      }
      #sb-block-tr span {
        color: rgba(255,255,255,0.38) !important;
        font-family: system-ui, -apple-system, sans-serif !important;
        font-size: 13px !important;
        letter-spacing: 0.05em !important;
        opacity: 0 !important;
        animation: sb-tr-in 0.75s ease 1.3s forwards !important;
      }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement("div");
    overlay.id = "sb-block-tr";

    const img = document.createElement("img");
    img.src = chrome.runtime.getURL("assets/BlockDoze_Original.svg");
    img.alt = "Blockdoze";

    const label = document.createElement("span");
    label.textContent =
      chrome.i18n.getMessage("blockTransitionLabel") || "Sitio bloqueado";

    overlay.appendChild(img);
    overlay.appendChild(label);
    document.documentElement.appendChild(overlay);

    setTimeout(() => window.location.replace(blockedUrl), 3500);
  }

})();
