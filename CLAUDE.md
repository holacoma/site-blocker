# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm test                              # run all tests
npx vitest run tests/foo.test.js      # run a single test file
npx vitest run --reporter=verbose     # run with per-test output
```

To load the extension in Chrome: **chrome://extensions → Cargar descomprimida**, pointing to the project root. No build step required — vanilla JS, no bundler.

## Architecture

Blockdoze is a Chrome MV3 extension that blocks distraction sites by domain, schedule, and daily timer. No build pipeline; all JS is loaded directly by the browser.

### Entry points

| File | Role |
|---|---|
| `src/background.js` | Service worker entry; imports `handlers.js` and updates the icon |
| `src/handlers.js` | All Chrome event listeners (webNavigation, tabs, windows, runtime.onMessage) |
| `src/blocking.js` | Pure functions: `isBlocked(url, sites, activeTimers)`, `isAlwaysAllowed(url, exceptions)` |
| `src/timer.js` | `pauseTimerForTab` / `resumeTimerForTab` helpers |
| `shared/BlockedSite.js` | Data model; domain normalization and matching logic |
| `shared/storage.js` | Wrappers for `chrome.storage` reads/writes |
| `content/timer-overlay.js` | Progress bar injected into pages; polls `GET_TIMER_STATE` and sends `REDIRECT_TO_BLOCKED` |
| `pages/options/options.js` | Options page; tabs: Dias / Timer / Excepciones |
| `pages/popup/popup.js` | Popup; shows status for current tab and live countdown |

### Storage layers

| Store | Keys |
|---|---|
| `chrome.storage.sync` | `blockedSites` — full config, synced across devices |
| `chrome.storage.local` | `activeTimers`, `pausedTimers`, `usedTimerDates`, `theme` |
| `chrome.storage.session` | `tabHostnames`, `activeTabPerWindow` — ephemeral service worker state |

### Data model

```js
// BlockedSite shape (stored in chrome.storage.sync)
{ domain: "reddit.com", days: [1,2,3,4,5], timerMinutes: 30, exceptions: ["reddit.com/chat/room/"] }
```

`domain` is always stored without `www.`. `days` uses JS `Date.getDay()` indices (0 = Sunday). `timerMinutes: 0` means no timer.

### Message protocol (content scripts / popup -> service worker)

| `msg.type` | Payload | Response |
|---|---|---|
| `GET_TIMER_STATE` | `{domain}` | `{expiry: timestamp\|null}` |
| `GET_SITE_CONFIG` | `{domain}` | `{entry: BlockedSite\|null}` |
| `START_TIMER` | `{domain, minutes}` | `{ok: true}` |
| `STOP_TIMER` | `{domain}` | `{ok: true}` |
| `REDIRECT_TO_BLOCKED` | `{site}` | — |

### i18n

All UI strings live in `_locales/es/messages.json` and `_locales/en/messages.json`. Always add keys to both files. Use `chrome.i18n.getMessage("keyName")` in JS and `__MSG_keyName__` in HTML attributes.

### Tests

Tests run in Node with vitest. `tests/vitest.setup.js` stubs the entire `chrome.*` API globally. Tests call `vi.fn().mockImplementation(...)` on storage methods to simulate state. No DOM environment — `vitest.config.js` sets `environment: "node"`.

### Options page UI

The options page uses a Win98 retro card style (default) and a sober theme. Features (Dias, Timer, Excepciones) render inside tab panels via `pages/options/features/`. The selected theme is saved to `chrome.storage.local` as `"retro"` or `"sober"`.
