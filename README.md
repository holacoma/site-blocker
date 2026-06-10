# Site Blocker

Chrome extension (MV3) that blocks distracting websites on a configurable schedule, with optional daily timers.

## Features

- **Block by domain** — add any domain; subdomains are blocked automatically
- **Day schedule** — choose which days of the week each site is blocked
- **Daily timer** — grant yourself N minutes of access per day; the timer pauses when you leave the tab and resumes when you come back
- **Always-allowed exceptions** — specific subdomains/paths are never blocked (e.g. `music.youtube.com`, `reddit.com/chat/room/`)

## How the timer works

When a site has a timer configured (e.g. 30 min), the first visit of the day auto-starts the countdown. A progress bar appears at the bottom of the page. When time runs out, a 30-second grace overlay appears before redirecting to the blocked page.

The timer pauses automatically when you:
- Switch to another tab
- Switch to another app (Alt-Tab)
- Close the tab

It resumes when you come back to the tab.

## Files

| File | Purpose |
|------|---------|
| `background.js` | Service worker — blocking logic, timer state, tab/window event listeners |
| `popup.html/js` | Extension popup — add/remove sites, configure days and timer |
| `blocked.html/js` | Page shown when a site is blocked |
| `timer-overlay.js` | Content script — injects the timer bar into blocked sites during allowed time |
| `ytmusic.js` | Content script — hides the YouTube Music video toggle |
| `manifest.json` | Extension manifest (MV3) |

## Storage

- `chrome.storage.sync` — `blockedSites` list (synced across devices)
- `chrome.storage.local` — `activeTimers`, `pausedTimers`, `usedTimerDates`
- `chrome.storage.session` — `tabHostnames`, `activeTabPerWindow` (per browser session, survives service-worker restarts)

## Development

```bash
npm test        # run Jest tests
```

Load the extension in Chrome via **chrome://extensions → Load unpacked**, pointing to this directory.
