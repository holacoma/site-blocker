(function () {
  let rafId = null;

  /* ── Sober: burbujas ── */

  function initBubbles() {
    if (document.getElementById("sb-bubbles")) return;

    const base   = "#f0eef8";
    const colors = ["#b0d4ff", "#c4b0ff", "#b0ffcc", "#ffb0cc", "#ffd0b0"];
    const opacity = 0.55;

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

    const win = document.querySelector(".main-window");
    if (win) {
      win.style.position = "relative";
      win.style.zIndex   = "1";
    }
  }

  function stopBubbles() {
    document.getElementById("sb-bubbles")?.remove();
    document.getElementById("sb-bubbles-css")?.remove();
  }

  /* ── Retro: canvas con naipes ── */

  const canvas = document.getElementById("bg-canvas");
  const ctx    = canvas.getContext("2d");

  const SUITS  = ["♠", "♥", "♦", "♣"];
  const COLORS = ["#ff1493", "#c084fc", "#f472b6", "#a855f7", "#ec4899"];
  const COUNT  = 35;

  let particles = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function make() {
    return {
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      size:  14 + Math.random() * 26,
      suit:  SUITS[Math.floor(Math.random() * SUITS.length)],
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 0.15 + Math.random() * 0.45,
      angle: Math.random() * Math.PI * 2,
      vx:    (Math.random() - 0.5) * 0.4,
      vy:    (Math.random() - 0.5) * 0.4,
      vr:    (Math.random() - 0.5) * 0.02,
      daDir: Math.random() > 0.5 ? 1 : -1,
      daSpd: 0.002 + Math.random() * 0.003,
    };
  }

  function tick() {
    ctx.fillStyle = "#0d0d0d";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      p.x     += p.vx;
      p.y     += p.vy;
      p.angle += p.vr;
      p.alpha += p.daDir * p.daSpd;
      if (p.alpha > 0.6 || p.alpha < 0.1) p.daDir *= -1;

      if (p.x < -60) p.x = canvas.width  + 60;
      if (p.x > canvas.width  + 60) p.x = -60;
      if (p.y < -60) p.y = canvas.height + 60;
      if (p.y > canvas.height + 60) p.y = -60;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.globalAlpha  = p.alpha;
      ctx.fillStyle    = p.color;
      ctx.shadowColor  = p.color;
      ctx.shadowBlur   = 16;
      ctx.font         = `bold ${p.size}px serif`;
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.suit, 0, 0);
      ctx.restore();
    }

    rafId = requestAnimationFrame(tick);
  }

  function initCanvas() {
    if (rafId) return;
    canvas.style.display = "block";
    resize();
    particles = Array.from({ length: COUNT }, make);
    tick();
    window.addEventListener("resize", () => {
      resize();
      particles = Array.from({ length: COUNT }, make);
    });
  }

  function stopCanvas() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    canvas.style.display = "none";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  /* ── Aplicar fondo según tema ── */

  function applyBackground(theme) {
    if (theme === "sober") {
      stopCanvas();
      initBubbles();
    } else {
      stopBubbles();
      initCanvas();
    }
  }

  chrome.storage.local.get({ theme: "sober" }, ({ theme }) => applyBackground(theme));

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.theme) {
      applyBackground(changes.theme.newValue);
    }
  });
})();
