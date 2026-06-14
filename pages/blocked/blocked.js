const params = new URLSearchParams(location.search);
const site = params.get("site");
if (site) document.getElementById("site-name").textContent = site;

const themeLink = document.getElementById("theme-css");
const win = document.querySelector(".main-window");

chrome.storage.local.get(
  { theme: "sober", blockTitle: "Sitio bloqueado", blockMessage: "Lo bloqueaste por una razón.", blockAnimation: "fade" },
  ({ theme, blockTitle, blockMessage, blockAnimation }) => {
    themeLink.href = theme === "retro"
      ? "../options/theme-retro.css"
      : "../options/theme-sober.css";
    document.documentElement.dataset.theme = theme;

    document.getElementById("block-title").textContent   = blockTitle;
    document.getElementById("block-message").textContent = blockMessage;

    if (blockAnimation !== "none") win.classList.add("anim-" + blockAnimation);
  }
);

document.getElementById("back-btn").addEventListener("click", () => {
  if (history.length > 1) history.back();
  else window.location.href = "chrome://newtab";
});
