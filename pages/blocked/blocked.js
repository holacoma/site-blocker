import { initLang, t, getLang } from "../../shared/i18n.js";
import { randomQuote } from "../../shared/quotes.js";

const USELESS_WEB_URL = "https://theuselessweb.com/";
// Timeline: nothing happens (INITIAL_WAIT_MS) -> "¿Aburrido?" fades/rises in
// (BORED_ENTER_MS, matches .bored-visible in blocked.css) -> sits fully shown
// (BORED_SIT_MS) -> the destination window grows in, pushing "¿Aburrido?"
// upward as it does (REVEAL_MS, matches .bored-hidden and revealPanelHeight).
const INITIAL_WAIT_MS = 10000;
const BORED_ENTER_MS = 5000;
const BORED_SIT_MS = 10000;
const REVEAL_MS = 5000;
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
  const panel         = /** @type {HTMLElement | null} */ (document.getElementById("redirect-panel"));
  const panelTitle    = document.getElementById("redirect-window-title");
  const boredText     = document.getElementById("bored-text");
  const iframe        = /** @type {HTMLIFrameElement | null} */ (document.getElementById("redirect-iframe"));
  const fallback      = document.getElementById("frame-fallback");
  const quoteEl       = document.getElementById("frame-quote");
  const anotherBtn    = document.getElementById("frame-another-btn");
  const frameToolbar  = document.getElementById("frame-toolbar");
  const reloadBtn     = document.getElementById("frame-reload-btn");
  const newTabBtn     = document.getElementById("frame-newtab-btn");
  const fullscreenBtn = document.getElementById("frame-fullscreen-btn");
  if (
    !panel || !panelTitle || !boredText || !iframe || !fallback || !quoteEl || !anotherBtn ||
    !frameToolbar || !reloadBtn || !newTabBtn || !fullscreenBtn
  ) return;

  boredText.textContent = t("blockBoredLabel");
  anotherBtn.textContent = t("motivationalAnother");
  reloadBtn.title = t("frameReloadTitle");
  newTabBtn.title = t("frameNewTabTitle");
  fullscreenBtn.title = t("frameFullscreenTitle");

  panelTitle.textContent =
    redirectMode === "motivational" ? t("blockRedirectMotivational") :
    redirectMode === "custom" && redirectUrl.trim() ? hostnameOf(normalizeUrl(redirectUrl.trim())) :
    t("blockRedirectWindowUseless");

  /** @type {string | null} */
  let currentUrl = null;

  function showQuote() {
    iframe.hidden = true;
    frameToolbar.hidden = true;
    fallback.hidden = false;
    quoteEl.textContent = randomQuote(/** @type {"es" | "en"} */ (getLang()));
  }

  anotherBtn.addEventListener("click", showQuote);

  reloadBtn.addEventListener("click", () => {
    frameToolbar.hidden = true;
    iframe.hidden = true;
    attemptFrame(iframe, showQuote, () => { frameToolbar.hidden = false; }, withCacheBust(/** @type {string} */ (currentUrl)));
  });

  newTabBtn.addEventListener("click", () => {
    window.open(currentUrl, "_blank", "noopener");
  });

  fullscreenBtn.addEventListener("click", () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      panel.requestFullscreen().catch(() => {});
    }
  });

  document.addEventListener("fullscreenchange", () => {
    const isFull = document.fullscreenElement === panel;
    fullscreenBtn.textContent = isFull ? "🗗" : "⛶";
    fullscreenBtn.title = isFull ? t("frameRestoreTitle") : t("frameFullscreenTitle");
  });

  // Start loading the destination immediately, in the background: the panel
  // is height:0/overflow:hidden until the reveal regardless, so this is
  // invisible either way. This settles whether the toolbar ends up shown
  // (iframe loaded) or not (quote fallback) well before revealPanelHeight
  // measures the panel's content height - otherwise the toolbar could still
  // be pending when we measure, and appearing afterward would silently grow
  // the panel past its already-animated target.
  if (redirectMode === "motivational") {
    showQuote();
  } else {
    currentUrl = redirectMode === "custom" && redirectUrl.trim()
      ? normalizeUrl(redirectUrl.trim())
      : USELESS_WEB_URL;
    attemptFrame(iframe, showQuote, () => { frameToolbar.hidden = false; }, currentUrl);
  }

  // Staged sequence: wait, then "¿Aburrido?" fades in, sits, then fades back
  // out while the destination window grows in below it (pushing it upward).
  setTimeout(() => {
    boredText.classList.add("bored-visible");

    setTimeout(() => {
      boredText.classList.remove("bored-visible");
      boredText.classList.add("bored-hidden");
      setTimeout(() => { boredText.hidden = true; }, REVEAL_MS);

      panel.inert = false;
      revealPanelHeight(panel, REVEAL_MS);
    }, BORED_ENTER_MS + BORED_SIT_MS);
  }, INITIAL_WAIT_MS);
}

/**
 * Grows the panel from height 0 to its natural content height so it visually
 * pushes "¿Aburrido?" (and the vertically-centered layout above it) upward
 * as it appears, instead of popping in. height:auto can't be transitioned
 * directly, so the target is measured in pixels first.
 *
 * The box itself (background/border) fades in together with the height
 * growth, so the first sliver is a soft edge rather than a stark solid bar.
 * Its content (title bar, window-body) stays fully invisible until most of
 * that growth has happened (.content-visible), then fades in on its own -
 * otherwise a thin strip of title-bar text is smeared across the top the
 * instant the box starts growing, before there's enough height to read as
 * a window.
 * @param {HTMLElement} panel
 * @param {number} durationMs
 */
function revealPanelHeight(panel, durationMs) {
  panel.style.transition = "none";
  panel.style.height = "auto";
  const target = panel.scrollHeight;
  panel.style.height = "0px";
  // Force layout so the browser commits the 0px height before animating.
  void panel.offsetHeight;
  panel.style.transition =
    `height ${durationMs}ms cubic-bezier(0.16, 1, 0.3, 1), opacity ${durationMs}ms cubic-bezier(0.16, 1, 0.3, 1)`;
  requestAnimationFrame(() => {
    panel.style.height = `${target}px`;
    panel.style.opacity = "1";
  });

  setTimeout(() => {
    panel.classList.add("content-visible");
  }, Math.round(durationMs * 0.6));

  // Once settled, hand height/opacity back to the stylesheet (.revealed)
  // instead of leaving inline values - an inline height would otherwise
  // outrank the :fullscreen rule's height:100vh when the panel is later
  // maximized.
  setTimeout(() => {
    panel.style.transition = "";
    panel.style.height = "";
    panel.style.opacity = "";
    panel.classList.add("revealed");
  }, durationMs + 50);
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
 * @param {() => void} onLoaded
 * @param {string} url
 */
function attemptFrame(iframe, onBlocked, onLoaded, url) {
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
      onLoaded();
    }
  }, { once: true });

  iframe.src = url;
}

/** @param {string} url */
function normalizeUrl(url) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/**
 * Forces the iframe to actually re-navigate (assigning the same src again is
 * a no-op in Chrome) and, for theuselessweb.com, picks a fresh random page.
 * @param {string} url
 */
function withCacheBust(url) {
  const u = new URL(url);
  u.searchParams.set("_r", String(Date.now()));
  return u.toString();
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
