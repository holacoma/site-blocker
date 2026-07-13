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

chrome.storage.local.get(
  { theme: "sober", blockTitle: "Sitio bloqueado", blockMessage: "Lo bloqueaste por una razón.", darkMode: "device" },
  (data) => {
    const theme = /** @type {string} */ (data.theme);
    const blockTitle = /** @type {string} */ (data.blockTitle);
    const blockMessage = /** @type {string} */ (data.blockMessage);
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

    runIntroAnimation("slide");
  }
);

document.getElementById("back-btn")?.addEventListener("click", () => {
  if (history.length > 1) history.back();
  else window.location.href = "chrome://newtab";
});

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
