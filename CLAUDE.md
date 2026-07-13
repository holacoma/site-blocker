# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm test                              # run all tests
npx vitest run tests/foo.test.js      # run a single test file
npx vitest run --reporter=verbose     # run with per-test output
npm run typecheck                     # tsc --checkJs over the JSDoc-typed source (no build, no emit)
npm run lint                          # eslint
npm run check:guardrails              # scripted checks for the rules below (e.g. no em dashes in UI text)
npm run verify                        # lint + typecheck + check:guardrails + test, same as CI
```

To load the extension in Chrome: **chrome://extensions → Cargar descomprimida**, pointing to the project root. No build step required — vanilla JS, no bundler. TypeScript is JSDoc-only (see below): it never compiles anything Chrome loads.

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

UI strings driven by JS (the `t()` function used across `pages/` and `content/`) live in the `MESSAGES` object inside `shared/i18n.js`, hardcoded for `es` and `en`. **Adding a key only to `_locales/*/messages.json` has no effect on `t()`** — that was a real bug in a past session. Always add new UI-string keys to `shared/i18n.js` (`es` and `en` blocks).

`_locales/es/messages.json` and `_locales/en/messages.json` are only used for: `manifest.json` fields (name/description), and static `__MSG_keyName__` / `data-i18n-placeholder` attributes resolved via `chrome.i18n.getMessage`. If you add a key there, it does not become available to `t()`.

### Types

The project has no build step, but it is typechecked: `tsconfig.json` runs `tsc` with `allowJs` + `checkJs` (`noEmit: true`) over `src/`, `shared/`, `content/`, `pages/`. Types are added via JSDoc comments (`@param`, `@type`, `@typedef`) directly in the `.js` files — nothing compiles, Chrome still loads the same `.js` files it always did. Shared shapes (the `BlockedSite` raw shape, the message protocol, timer storage maps, the options-page `Feature`/`FeatureContext` contract) are declared once in `shared/types.d.ts` and imported via `@typedef {import('.../types.js').Foo}`. `strictNullChecks` is intentionally off (too noisy for this DOM-heavy codebase relative to the value); `noImplicitAny` is on, since that's what actually catches real bugs. Run `npm run typecheck` before committing changes that touch function signatures.

### Tests

Tests run in Node with vitest. `tests/vitest.setup.js` stubs the entire `chrome.*` API globally. Tests call `vi.fn().mockImplementation(...)` on storage methods to simulate state. No DOM environment — `vitest.config.js` sets `environment: "node"`.

### Options page UI

The options page uses a Win98 retro card style (default) and a sober theme. Features (Dias, Timer, Excepciones) render inside tab panels via `pages/options/features/`. The selected theme is saved to `chrome.storage.local` as `"retro"` or `"sober"`. This structure (Win98 cards + tab buttons) was deliberately chosen and validated — don't restructure it without being asked.

## Guardrails

Rules that apply to any change in this repo, human or AI. `npm run check:guardrails` enforces the first one automatically; the rest are process rules with no automated check yet.

- **No em dashes (—) in anything user-visible.** Not in `shared/i18n.js`, not in `_locales/*/messages.json`, not in hardcoded UI strings anywhere in `pages/` or `content/`. The user considers them a tell for AI-written text. Use a comma, a colon, or restructure the sentence. (This does not apply to `── section dividers ──` inside code comments — those aren't user-visible.)
- **Branch before you commit.** Never commit directly on `master`. Create a `feature/…`, `fix/…`, or `hotfix/…` branch first — no username prefix in the branch name.
- **Never open or merge a PR without an explicit request.** Don't leave half-finished features on `master` either; finish or don't start.
- **i18n keys go in `shared/i18n.js`**, not `_locales/`. See the i18n section above — this has burned a session before.
- **Don't restructure the options page card/tab layout** (see Options page UI above) without being asked.
- Run `npm run verify` (lint + typecheck + guardrail check + tests) before treating a change as done.
