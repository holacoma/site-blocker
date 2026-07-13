(function () {
  /** @type {number | null} */
  let rafId = null;

  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("bg-canvas"));
  const ctx    = /** @type {CanvasRenderingContext2D} */ (canvas.getContext("2d"));

  const SUITS  = ["♠", "♥", "♦", "♣"];
  const COLORS = ["#ff1493", "#c084fc", "#f472b6", "#a855f7", "#ec4899"];
  const COUNT  = 35;

  /**
   * @typedef {{
   *   x: number, y: number, size: number, suit: string, color: string,
   *   alpha: number, angle: number, vx: number, vy: number, vr: number,
   *   daDir: number, daSpd: number,
   * }} Particle
   */

  /** @type {Particle[]} */
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

  function startCanvas() {
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

  const darkMq = matchMedia("(prefers-color-scheme: dark)");

  /** @param {boolean} isDark */
  function applyDarkMode(isDark) {
    document.documentElement.dataset.darkmode = isDark ? "on" : "off";
    if (isDark) startCanvas();
    else        stopCanvas();
  }

  /** @param {MediaQueryListEvent} e */
  function onMqChange(e) { applyDarkMode(e.matches); }

  /** @param {string | boolean} rawSetting */
  function setDarkMode(rawSetting) {
    const setting = typeof rawSetting === "boolean" ? (rawSetting ? "device" : "light") : rawSetting;
    darkMq.removeEventListener("change", onMqChange);
    if (setting === "dark") {
      applyDarkMode(true);
    } else if (setting === "light") {
      applyDarkMode(false);
    } else {
      applyDarkMode(darkMq.matches);
      darkMq.addEventListener("change", onMqChange);
    }
  }

  chrome.storage.local.get({ darkMode: "device" }, (data) =>
    setDarkMode(/** @type {string | boolean} */ (data.darkMode))
  );

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && "darkMode" in changes) {
      setDarkMode(/** @type {string | boolean} */ (changes.darkMode.newValue));
    }
  });
})();
