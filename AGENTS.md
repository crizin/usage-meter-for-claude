# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, and others) working in this repository.

## What this is

A Manifest V3 browser extension (Chrome / Edge) that shows the 5-hour and weekly usage limits of every
organization on a claude.ai account in one popup, with the highest percentage on the toolbar badge.
It reads two **internal, undocumented** claude.ai endpoints (`/api/organizations` and
`/api/organizations/{uuid}/usage`) using the browser's existing session cookie. Unofficial; the payload
shape can change without notice, which is why the code is written to fail open (see below).

No dependencies, no bundler, no `package.json`. Plain ES modules that must stay loadable by both Chrome
and Node without transpiling.

## Commands

```sh
node test/run.mjs            # the only test command (Node 22+; CI runs the same thing)
```

- The test runner is one flat script with an `eq(name, got, want)` helper that deep-compares via
  `JSON.stringify`. There is no filter for a single test — the whole file runs in well under a second.
  Add new assertions to `test/run.mjs`; add new payload shapes to `test/fixture.json`.
- There is no lint or build step. Manual testing = load the repo folder unpacked at
  `chrome://extensions` (Developer mode → Load unpacked), then hit the extension's reload button after
  editing `background.js` (the popup picks up changes on reopen).

### Releasing

```sh
# 1. bump "version" in manifest.json (the only place a version lives)
# 2. tag and push — .github/workflows/release.yml does the rest
git tag v1.2.3 && git push origin v1.2.3
```

The workflow fails if the tag does not equal `manifest.json` `version`, runs the tests, zips an
**explicit file list** and attaches it to a GitHub Release. If you add a runtime file (a new script,
stylesheet, icon dir), you must also add it to the `zip -r` line in `release.yml` or it will ship broken.

## Architecture

Three runtime contexts share one pure module:

| File | Context | Role |
| --- | --- | --- |
| `background.js` | MV3 service worker (module) | collects usage, writes the snapshot to `chrome.storage.local`, paints the badge |
| `popup.js` / `popup.html` / `popup.css` | popup page | renders the cached snapshot, asks the worker to refresh |
| `lib.js` | imported by **both** of the above **and** by `test/run.mjs` in Node | payload normalization, level mapping, formatters, badge/summary computation |

**`lib.js` must stay pure**: no `chrome.*`, no DOM, no side effects. That is the only reason the test
suite runs in Node with no browser or mocking. Anything that touches an extension API belongs in
`background.js` or `popup.js`.

### The snapshot — the contract between worker and popup

`background.js` writes one object under `chrome.storage.local` key `snapshot`; `popup.js` only ever
reads it (on open, after a refresh, and every 30 s to keep countdowns live):

```js
{
  at: 1757556000000,               // Date.now() of the collection
  source: 'direct' | 'tab' | null,
  error: null | 'LOGIN' | 'NO_TAB' | 'FAILED',   // whole-collection failure only
  orgs: [
    { uuid, name, usage },                      // raw /usage payload, untouched
    { uuid, name, error: 'HTTP 403', status: 403 }, // per-org failure
  ],
}
```

`test/fixture.json` is literally a snapshot in this shape (plus `orgList`, a raw `/api/organizations`
response used by the `hasChatUsage` tests). Two failure tiers are deliberate:

- **Whole snapshot** (`snap.error`): the popup shows a full-panel state (sign in / retry).
- **Per organization** (`org.error` + `org.status`): 401/403/404 are rendered as a muted "no usage
  access" note via `describeError()`; only network faults and 5xx are red. Errored orgs never reach the
  badge (`badgeFor` skips them).

### Collection: two-step fallback in `background.js`

1. `collectDirect()` — `fetch` from the service worker with `credentials: 'include'`. Works with no
   claude.ai tab open.
2. `collectViaTab()` — if (1) throws, `chrome.scripting.executeScript` runs `pageCollector()` in the
   `MAIN` world of an open claude.ai tab.

`pageCollector()` is **serialized and executed inside the page**, so it cannot reference anything
outside its own body — not `lib.js`, not module constants. The `hasChatUsage` rule is duplicated inline
there on purpose (`keep`). If you change the organization filter in `lib.js`, change the inline copy too.

Refreshes are triggered by a `chrome.alarms` alarm every `PERIOD_MIN` (2) minutes, by
`onInstalled`/`onStartup`, and by a `{ type: 'refresh' }` runtime message from the popup. `refresh()`
de-duplicates concurrent calls through the `inFlight` promise.

### Normalization and fail-open rules (`lib.js`)

- `hasChatUsage()` drops Console (API-only) organizations — `capabilities` without `'chat'` — before
  their `/usage` is requested, because it always answers 403. Missing/empty `capabilities` are **kept**
  so a payload change can never empty the popup.
- `normalizeOrg()` prefers `usage.limits[]` (kind `session` / `weekly_all` / `weekly_scoped`). When
  `limits[]` is empty (enterprise orgs) it falls back to the flat `five_hour` / `seven_day*` fields in
  `FALLBACK_FIELDS`. `extra_usage` becomes a separate `credit` object.
- `levelFor()` maps a percentage to `ok | warn | crit` (70 % / 90 %) and lets the server's `severity`
  raise it, never lower it.

The three level names are load-bearing across files: they are CSS class names in `popup.css`
(`.dot.ok`, `.row-pct.warn`, `.bar > i.lv-crit`), keys of `BADGE_BG` in `background.js`, and the
`LEVELS` export. `describeError()` additionally emits `muted`, which exists only as a `.dot` class.
Adding a level means touching all of them.

## Conventions

- Permissions are a deliberate minimum (`storage`, `alarms`, `scripting`, host `https://claude.ai/*`;
  **no** `tabs`). If they change, update the permission tables in `README.md`, `store/LISTING.md`, and
  `store/PRIVACY.md` alongside `manifest.json`.
- `store/` holds paste-ready store listing copy and screenshots; it is not packaged into the release zip.
- Commit messages use short conventional prefixes: `fix:`, `test:`, `chore:`, `ci:`.
