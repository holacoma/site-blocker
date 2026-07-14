import { initLang, t, getLang } from "../../shared/i18n.js";
import { randomQuote } from "../../shared/quotes.js";

const USELESS_WEB_URL = "https://theuselessweb.com/";
const AUTO_OPEN_DELAY_MS = 5000;
// Matches the .bored-text opacity transition duration in blocked.css
const BORED_FADE_MS = 800;
const FRAME_TIMEOUT_MS = 2500;
// A "load" firing this fast almost always means the site refused to be framed
// (X-Frame-Options / CSP frame-ancestors) rather than actually rendering.
const FRAME_FAST_LOAD_MS = 250;

const params = new URLSearchParams(location.search);
const site = params.get("site");
if (site) {
  const siteNameEl = document.getElementById("site-name");
  if (siteNameEl) siteNameEl.textContent = site;
}

const themeLink = /** @type {HTMLLinkElement} */ (document.getElementById("theme-css"));
const darkMq = matchMedia("(prefers-color-scheme: dark)");

/** @type {string | boolean} */
let darkModeSetting = "device";

function applyDarkMode() {
  let on;
  if (darkModeSetting === "dark")  on = true;
  else if (darkModeSetting === "light") on = false;
  else on = darkMq.matches; // "device"
  document.documentElement.dataset.darkmode = on ? "on" : "off";
}

darkMq.addEventListener("change", applyDarkMode);

initLang().then(() => {
  chrome.storage.local.get(
    {
      theme: "sober",
      blockTitle: "Sitio bloqueado",
      blockMessage: "Lo bloqueaste por una razón.",
      darkMode: "device",
      blockRedirectMode: "useless",
      blockRedirectUrl: "",
    },
    (data) => {
      const theme = /** @type {string} */ (data.theme);
      const blockTitle = /** @type {string} */ (data.blockTitle);
      const blockMessage = /** @type {string} */ (data.blockMessage);
      const redirectMode = /** @type {string} */ (data.blockRedirectMode);
      const redirectUrl = /** @type {string} */ (data.blockRedirectUrl);
      darkModeSetting = /** @type {string | boolean} */ (data.darkMode);
      applyDarkMode();

      themeLink.href = theme === "retro"
        ? "../options/theme-retro.css"
        : "../options/theme-sober.css";
      document.documentElement.dataset.theme = theme;

      const titleEl = document.getElementById("block-title");
      const messageEl = document.getElementById("block-message");
      if (titleEl) titleEl.textContent = blockTitle;
      if (messageEl) messageEl.textContent = blockMessage;

      setupRedirectFrame(redirectMode, redirectUrl);

      runIntroAnimation("slide");
    }
  );
});

/**
 * @param {string} redirectMode
 * @param {string} redirectUrl
 */
function setupRedirectFrame(redirectMode, redirectUrl) {
  const panel       = /** @type {HTMLElement | null} */ (document.getElementById("redirect-panel"));
  const panelTitle  = document.getElementById("redirect-window-title");
  const boredText   = document.getElementById("bored-text");
  const framePanel  = document.getElementById("frame-panel");
  const iframe      = /** @type {HTMLIFrameElement | null} */ (document.getElementById("redirect-iframe"));
  const fallback    = document.getElementById("frame-fallback");
  const quoteEl     = document.getElementById("frame-quote");
  const anotherBtn  = document.getElementById("frame-another-btn");
  if (!panel || !panelTitle || !boredText || !framePanel || !iframe || !fallback || !quoteEl || !anotherBtn) return;

  boredText.textContent = t("blockBoredLabel");
  anotherBtn.textContent = t("motivationalAnother");

  panelTitle.textContent =
    redirectMode === "motivational" ? t("blockRedirectMotivational") :
    redirectMode === "custom" && redirectUrl.trim() ? hostnameOf(normalizeUrl(redirectUrl.trim())) :
    t("blockRedirectWindowUseless");

  function showQuote() {
    iframe.hidden = true;
    fallback.hidden = false;
    quoteEl.textContent = randomQuote(/** @type {"es" | "en"} */ (getLang()));
  }

  anotherBtn.addEventListener("click", showQuote);

  // "¿Aburrido?" floats as plain text first (no card around it). Only once
  // the destination is ready does the window (same style as the block card,
  // in the normal page flow, no fixed/overlay positioning) slide into view.
  setTimeout(() => {
    boredText.classList.add("bored-hidden");
    setTimeout(() => { boredText.hidden = true; }, BORED_FADE_MS);

    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add("anim-slide"));

    framePanel.hidden = false;
    requestAnimationFrame(() => framePanel.classList.add("frame-visible"));

    if (redirectMode === "motivational") {
      showQuote();
    } else {
      const url = redirectMode === "custom" && redirectUrl.trim()
        ? normalizeUrl(redirectUrl.trim())
        : USELESS_WEB_URL;
      attemptFrame(iframe, showQuote, url);
    }
  }, AUTO_OPEN_DELAY_MS);
}

/** @param {string} url */
function hostnameOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * @param {HTMLIFrameElement} iframe
 * @param {() => void} onBlocked
 * @param {string} url
 */
function attemptFrame(iframe, onBlocked, url) {
  const startedAt = Date.now();
  let settled = false;

  const timeoutId = setTimeout(() => {
    if (settled) return;
    settled = true;
    onBlocked();
  }, FRAME_TIMEOUT_MS);

  iframe.addEventListener("load", () => {
    if (settled) return;
    settled = true;
    clearTimeout(timeoutId);
    if (Date.now() - startedAt < FRAME_FAST_LOAD_MS) {
      onBlocked();
    } else {
      iframe.hidden = false;
    }
  }, { once: true });

  iframe.src = url;
}

/** @param {string} url */
function normalizeUrl(url) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** @param {string} blockAnimation */
function runIntroAnimation(blockAnimation) {
  const overlay  = document.getElementById("bt-overlay");
  const floatImg = /** @type {HTMLElement | null} */ (document.getElementById("bt-float-logo"));
  const brandWin = /** @type {HTMLElement} */ (document.querySelector(".brand-window"));
  const mainWin  = /** @type {HTMLElement} */ (document.querySelector(".main-window"));

  if (!overlay || !floatImg) return;

  // Keep both windows hidden until their cue — prevents double-appearance
  brandWin.style.opacity = "0";
  mainWin.style.opacity  = "0";

  // Short pause so the user sees the centered logo (continues from transition anim)
  setTimeout(() => {
    const brandLogo = /** @type {HTMLElement} */ (brandWin.querySelector(".brand-logo"));
    const r     = brandLogo.getBoundingClientRect();
    const dx    = (r.left + r.width  / 2) - window.innerWidth  / 2;
    const dy    = (r.top  + r.height / 2) - window.innerHeight / 2;
    const scale = Math.max(0.1, (r.width || 72) / 160);

    // Lock the inline transform to a 3-function form so the browser can
    // interpolate correctly from the initial centered state
    floatImg.style.transform = "translate(-50%, -50%) translate(0, 0) scale(1)";

    requestAnimationFrame(() => {
      floatImg.style.transition =
        "transform 0.7s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease 0.45s";
      floatImg.style.transform =
        `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(${scale})`;
      floatImg.style.opacity = "0";

      overlay.style.transition = "opacity 0.7s ease";
      overlay.style.opacity    = "0";
    });

    // Reveal brand-window when the logo lands (~0.65s)
    setTimeout(() => {
      brandWin.style.transition = "opacity 0.2s ease";
      brandWin.style.opacity    = "1";
    }, 600);

    // Animate main-window card in (CSS animation overrides the inline opacity:0)
    setTimeout(() => {
      if (blockAnimation !== "none") {
        mainWin.classList.add("anim-" + blockAnimation);
      } else {
        mainWin.style.opacity = "1";
      }
    }, 680);

    // Cleanup
    setTimeout(() => { overlay.remove(); floatImg.remove(); }, 950);

  }, 400);
}
