(function () {
  const hostname = location.hostname.replace(/^www\./, "");
  if (!hostname) return;

  let started = false;
  /** @type {number | null} */
  let activeInterval = null;
  /** @type {HTMLElement | null} */
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

  /** @param {number} [expiry] */
  function startIfValid(expiry) {
    if (started || !expiry || Date.now() >= expiry) return;
    started = true;
    chrome.storage.local.get(
      { overlayBarTheme: "border", overlayBarPosition: "bottom", overlayExpiryTheme: "blur" },
      (data) => {
        initNormalPhase(
          expiry,
          /** @type {string} */ (data.overlayBarTheme),
          /** @type {string} */ (data.overlayBarPosition),
          /** @type {string} */ (data.overlayExpiryTheme)
        );
      }
    );
  }

  /**
   * @param {{[key: string]: chrome.storage.StorageChange}} changes
   * @param {string} area
   */
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

  /** @type {{[name: string]: HTMLTemplateElement}} */
  const TEMPLATES = {};
  const templatesReady = (() => {
    const names = ["bar-fill", "bar-dots", "bar-border", "expiry-overlay", "expiry-mini"];
    return Promise.all(names.map(async (name) => {
      const url = chrome.runtime.getURL(`content/templates/${name}.html`);
      const html = await fetch(url).then((r) => r.text());
      const tpl = /** @type {HTMLTemplateElement} */ (document.createElement("template"));
      tpl.innerHTML = html.trim();
      TEMPLATES[name] = tpl;
    }));
  })();

  // ── Bar theme registry ────────────────────────────────────────────────────

  /**
   * @typedef {{
   *   template: string,
   *   update: (bar: HTMLElement, pct: number, color: string, isVertical?: boolean) => void,
   *   populateTemplate?: (bar: HTMLElement) => void,
   * }} BarRenderer
   */

  /** @type {{[theme: string]: BarRenderer}} */
  const BAR_RENDERERS = {
    border: {
      template: "bar-border",
      update(bar, pct, color, isVertical) {
        const fill = /** @type {HTMLElement} */ (bar.querySelector("#sb-fill"));
        fill.style.setProperty(isVertical ? "height" : "width", pct + "%", "important");
        fill.style.setProperty("background", color, "important");
      },
    },
    segments: {
      template: "bar-fill",
      update: fillUpdate,
    },
    dots: {
      template: "bar-dots",
      populateTemplate(bar) {
        const container = /** @type {HTMLElement} */ (bar.querySelector("#sb-dots"));
        for (let i = 0; i < DOT_COUNT; i++) {
          container.appendChild(document.createElement("span")).className = "sb-dot";
        }
      },
      update(bar, pct, color) {
        const dots = bar.querySelectorAll(".sb-dot");
        const active = Math.ceil(dots.length * pct / 100);
        dots.forEach((dot, i) => {
          /** @type {HTMLElement} */ (dot).style.setProperty(
            "background", i < active ? color : "rgba(0,0,0,0.1)", "important"
          );
        });
      },
    },
    default: {
      template: "bar-fill",
      update: fillUpdate,
    },
  };

  /**
   * @param {HTMLElement} bar
   * @param {number} pct
   * @param {string} color
   * @param {boolean} [isVertical]
   */
  function fillUpdate(bar, pct, color, isVertical) {
    const fill = /** @type {HTMLElement} */ (bar.querySelector("#sb-fill"));
    fill.style.setProperty(isVertical ? "height" : "width", pct + "%", "important");
    fill.style.setProperty("background", color, "important");
  }

  // ── CSS injection ─────────────────────────────────────────────────────────

  /**
   * @param {string} id
   * @param {string} path
   */
  function injectCSS(id, path) {
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL(path);
    document.head.appendChild(link);
  }

  // ── Core functions ────────────────────────────────────────────────────────

  /**
   * @param {number} expiry
   * @param {string} barTheme
   * @param {string} barPosition
   * @param {string} expiryTheme
   */
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

  /**
   * @param {string} barTheme
   * @param {string} barPosition
   */
  function createFooterBar(barTheme, barPosition) {
    const renderer = BAR_RENDERERS[barTheme] ?? BAR_RENDERERS.default;
    const bar = document.createElement("div");
    bar.id = "sb-footer";
    bar.dataset.pos = barPosition;
    bar.appendChild(TEMPLATES[renderer.template].content.cloneNode(true));
    renderer.populateTemplate?.(bar);
    return bar;
  }

  /**
   * @param {HTMLElement} bar
   * @param {string} barTheme
   * @param {string} barPosition
   * @param {number} remaining
   * @param {number} totalMs
   */
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

  /** @param {string} site */
  function startBlockTransition(site) {
    chrome.storage.local.get({ darkMode: "device" }, ({ darkMode }) => {
      document.getElementById("sb-expiry-overlay")?.remove();
      document.getElementById("sb-mini")?.remove();

      const setting  = typeof darkMode === "boolean" ? (darkMode ? "device" : "light") : darkMode;
      const sysDark  = matchMedia("(prefers-color-scheme: dark)").matches;
      const isDark   = setting === "dark" || (setting !== "light" && sysDark);
      const bg       = isDark ? "#0d0d14" : "#f5f5f7";
      const txtColor = isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.45)";

      const overlay = document.createElement("div");
      const img     = document.createElement("img");
      const label   = document.createElement("span");

      // Use setProperty (no <style> injection — CSP blocks it on many sites)
      /** @type {(el: HTMLElement, prop: string, val: string) => void} */
      const S = (el, prop, val) => el.style.setProperty(prop, val, "important");

      S(overlay, "position",        "fixed");
      S(overlay, "top",             "0");
      S(overlay, "left",            "0");
      S(overlay, "right",           "0");
      S(overlay, "bottom",          "0");
      S(overlay, "z-index",         "2147483647");
      S(overlay, "background",      bg);
      S(overlay, "display",         "flex");
      S(overlay, "flex-direction",  "column");
      S(overlay, "align-items",     "center");
      S(overlay, "justify-content", "center");
      S(overlay, "gap",             "20px");
      S(overlay, "opacity",         "0");
      S(overlay, "transition",      "opacity 0.8s ease");
      S(overlay, "pointer-events",  "all");

      img.src = chrome.runtime.getURL("assets/BlockDoze_Original.svg");
      img.alt = "Blockdoze";
      S(img, "width",      "160px");
      S(img, "height",     "auto");
      S(img, "display",    "block");
      S(img, "opacity",    "0");
      S(img, "transform",  "scale(0.88)");
      S(img, "transition", "opacity 0.7s ease 0.4s, transform 0.7s ease 0.4s");

      label.textContent =
        chrome.i18n.getMessage("blockTransitionLabel") || "Sitio bloqueado";
      S(label, "color",          txtColor);
      S(label, "font-family",    "system-ui, -apple-system, sans-serif");
      S(label, "font-size",      "13px");
      S(label, "letter-spacing", "0.05em");
      S(label, "opacity",        "0");
      S(label, "transition",     "opacity 0.7s ease 0.9s");

      overlay.appendChild(img);
      overlay.appendChild(label);
      document.documentElement.appendChild(overlay);

      // Double rAF ensures initial state is painted before transitioning
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          S(overlay, "opacity",   "1");
          S(img,     "opacity",   "1");
          S(img,     "transform", "scale(1)");
          S(label,   "opacity",   "1");
        });
      });

      setTimeout(() => {
        chrome.runtime.sendMessage({ type: "REDIRECT_TO_BLOCKED", site });
      }, 3500);
    });
  }

})();
