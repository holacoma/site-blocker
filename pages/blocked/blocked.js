const params = new URLSearchParams(location.search);
const site = params.get("site");
if (site) document.getElementById("site-name").textContent = site;

const themeLink = document.getElementById("theme-css");
const win = document.querySelector(".main-window");

function initBubbles(theme) {
  const isRetro = theme === "retro";
  const base    = isRetro ? "#002828" : "#f0eef8";
  const colors  = isRetro
    ? ["#00d0d0", "#0060ff", "#00d060", "#00a0d0", "#40d0a0"]
    : ["#b0d4ff", "#c4b0ff", "#b0ffcc", "#ffb0cc", "#ffd0b0"];
  const opacity = isRetro ? 0.35 : 0.55;

  // Cada burbuja: posición inicial, tamaño, duración, delay negativo (fase inicial),
  // y waypoints de trayectoria cerrada — 0% y 100% siempre en (0,0)
  // [left%, top%, sz px, dur s, delay s, [[tx vw, ty vh], ...]]
  const defs = [
    [  8,  8, 580,  8,   0, [[ 25, 15], [ 10, 35]              ]],
    [ 60,  5, 500, 15,  -5, [[-20, 20], [-30,  5], [-10, 30]   ]],
    [  5, 50, 560, 22, -10, [[ 30,-20], [ 15,-38]              ]],
    [ 65, 55, 460, 12,  -3, [[-25,-15], [-10,-32]              ]],
    [ 38, 30, 420, 28, -14, [[ 20,-10], [  5,-28], [-18,-12], [-5, 10]]],
  ];

  let css =
    `body{background:${base}!important;}` +
    `#sb-bubbles{position:fixed;inset:0;overflow:hidden;z-index:0;pointer-events:none;` +
    `transform:scale(1.5);transform-origin:50% 50%;}`;

  defs.forEach(([l, t, sz, dur, del, pts], i) => {
    const total = pts.length + 1;
    let kf = `@keyframes sb-b${i}{0%{transform:translate(0,0)}`;
    pts.forEach(([tx, ty], j) => {
      const pct = Math.round(((j + 1) / total) * 100);
      kf += `${pct}%{transform:translate(${tx}vw,${ty}vh)}`;
    });
    kf += `100%{transform:translate(0,0)}}`;

    css += kf +
      `#sb-b${i}{` +
        `position:absolute;left:${l}%;top:${t}%;` +
        `width:${sz}px;height:${sz}px;border-radius:50%;` +
        `background:${colors[i]};filter:blur(90px);opacity:${opacity};` +
        `animation:sb-b${i} ${dur}s ${del}s ease-in-out infinite;` +
      `}`;
  });

  const style = document.createElement("style");
  style.id = "sb-bubbles-css";
  style.textContent = css;
  document.head.appendChild(style);

  const wrap = document.createElement("div");
  wrap.id = "sb-bubbles";
  defs.forEach((_, i) => {
    const el = document.createElement("div");
    el.id = `sb-b${i}`;
    wrap.appendChild(el);
  });
  document.body.prepend(wrap);

  win.style.position = "relative";
  win.style.zIndex   = "1";
}

chrome.storage.local.get(
  { theme: "sober", blockTitle: "Sitio bloqueado", blockMessage: "Lo bloqueaste por una razón.", blockAnimation: "fade" },
  ({ theme, blockTitle, blockMessage, blockAnimation }) => {
    themeLink.href = theme === "retro"
      ? "../options/theme-retro.css"
      : "../options/theme-sober.css";
    document.documentElement.dataset.theme = theme;

    initBubbles(theme);

    document.getElementById("block-title").textContent   = blockTitle;
    document.getElementById("block-message").textContent = blockMessage;

    if (blockAnimation !== "none") win.classList.add("anim-" + blockAnimation);
  }
);

document.getElementById("back-btn").addEventListener("click", () => {
  if (history.length > 1) history.back();
  else window.location.href = "chrome://newtab";
});
