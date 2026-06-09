function enforceAudioMode() {
  const toggle = document.querySelector("ytmusic-av-toggle");
  if (!toggle) return;

  const videoBtn = toggle.querySelector("button.video-button");
  const songBtn = toggle.querySelector("button.song-button");

  if (videoBtn && videoBtn.getAttribute("aria-pressed") === "true") {
    songBtn?.click();
  }

  if (videoBtn) {
    videoBtn.style.display = "none";
  }
}

const observer = new MutationObserver(enforceAudioMode);
observer.observe(document.documentElement, { childList: true, subtree: true });

enforceAudioMode();
