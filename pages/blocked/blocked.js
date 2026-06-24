const params = new URLSearchParams(location.search);
const site = params.get("site");
if (site) document.getElementById("site-name").textContent = site;

const themeLink = document.getElementById("theme-css");
const win = document.querySelector(".main-window");
const darkMq = matchMedia("(prefers-color-scheme: dark)");

let darkModeEnabled = true;

function applyDarkMode() {
  document.documentElement.dataset.darkmode = (darkModeEnabled && darkMq.matches) ? "on" : "off";
}

darkMq.addEventListener("change", applyDarkMode);

chrome.storage.local.get(
  { theme: "sober", blockTitle: "Sitio bloqueado", blockMessage: "Lo bloqueaste por una razón.", blockAnimation: "fade", darkMode: true },
  ({ theme, blockTitle, blockMessage, blockAnimation, darkMode }) => {
    darkModeEnabled = darkMode;
    applyDarkMode();

    themeLink.href = theme === "retro"
      ? "../options/theme-retro.css"
      : "../options/theme-sober.css";
    document.documentElement.dataset.theme = theme;

    document.getElementById("block-title").textContent   = blockTitle;
    document.getElementById("block-message").textContent = blockMessage;

    runIntroAnimation(blockAnimation);
  }
);

document.getElementById("back-btn").addEventListener("click", () => {
  if (history.length > 1) history.back();
  else window.location.href = "chrome://newtab";
});

function runIntroAnimation(blockAnimation) {
  const overlay  = document.getElementById("bt-overlay");
  const floatImg = document.getElementById("bt-float-logo");
  const brandWin = document.querySelector(".brand-window");
  const mainWin  = document.querySelector(".main-window");

  if (!overlay || !floatImg) return;

  // Hide brand-window until the floating logo "arrives" there
  brandWin.style.opacity = "0";

  // Short pause so the user sees the centered logo (continues from transition anim)
  setTimeout(() => {
    const brandLogo = brandWin.querySelector(".brand-logo");
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

    // Animate main-window card in
    setTimeout(() => {
      if (blockAnimation !== "none") mainWin.classList.add("anim-" + blockAnimation);
    }, 680);

    // Cleanup
    setTimeout(() => { overlay.remove(); floatImg.remove(); }, 950);

  }, 400);
}
