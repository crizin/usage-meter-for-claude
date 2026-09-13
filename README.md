# Usage Meter for Claude

See the **5-hour and weekly usage limits of every Claude organization in a single view**.
If you belong to more than one organization (workspace), you no longer have to switch between them
and reload the settings page to find out where you stand.

> Unofficial. Not affiliated with, endorsed by, or sponsored by Anthropic.
> "Claude" is a trademark of Anthropic, PBC, used here only to describe what this extension works with.

## Install

### From a store

- Chrome Web Store: _(add link after publishing)_
- Microsoft Edge Add-ons: _(add link after publishing)_

### From source (unpacked)

1. Download and unzip this repository.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Turn on **Developer mode**.
4. Choose **Load unpacked** and select the unzipped folder.
5. Pin the extension from the puzzle-piece menu so it stays on the toolbar.

Keep the folder where it is — moving or deleting it breaks the installed extension.
You must be signed in to claude.ai; there is no separate login or token to enter.

## How it works

The extension reads two endpoints using the claude.ai session cookie your browser already has.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/organizations` | every organization on the account (uuid, name, capabilities) |
| `GET /api/organizations/{uuid}/usage` | that organization's limits |

### Which organizations are shown

`/api/organizations` lists two kinds of organization, and only one of them has chat usage:

| `capabilities` | Kind | Shown? |
| --- | --- | --- |
| contains `chat` (e.g. `["chat","claude_max"]`) | claude.ai organization | yes |
| `["api"]` only | Claude Console organization (API keys, no chat) | no |

Asking a Console organization for `/usage` answers `403 permission_error — Invalid authorization for
organization`, so those are filtered out before the request is made rather than rendered as a failed
card. The filter **fails open**: an organization with no `capabilities` array is kept, so a change to
the payload shape can never empty the popup.

An organization that still answers 401/403/404 is reported as "no usage access / no usage data" with
the status attached, not as an error — only network faults and 5xx are.

`usage.limits[]` carries the same values the settings page renders:

```jsonc
{
  "kind": "session",        // session | weekly_all | weekly_scoped
  "group": "session",       // session | weekly
  "percent": 50,
  "severity": "normal",     // normal | warning | ...
  "resets_at": "2026-09-11T03:00:00Z",
  "scope": { "model": { "display_name": "Fable" }, "surface": null },
  "is_active": false
}
```

Organizations that return an empty `limits[]` (enterprise, for example) fall back automatically to the
`five_hour` / `seven_day` / `extra_usage` fields.

**Collection uses a two-step fallback:**

1. Called directly from the service worker — works even with no claude.ai tab open.
2. If that fails, called from the page context of an open claude.ai tab.

If both paths fail, the popup explains why (sign-in needed / no tab / network).

## What you see

- **Toolbar badge** — the **highest** figure across every organization and every limit. Amber at 70%, red at 90%. Hover for a per-organization summary.
- **Popup** — one card per organization with 5-hour session, weekly all-models and weekly per-model bars, plus time until reset. Light and dark themes.
- Refreshes every 2 minutes via `chrome.alarms`, and once more each time you open the popup.

## Permissions and privacy

This is the complete list of what it asks for:

| Permission | Why |
| --- | --- |
| `host_permissions: https://claude.ai/*` | read the two usage endpoints |
| `storage` | cache the last reading locally |
| `alarms` | refresh every 2 minutes |
| `scripting` | fall back to an open claude.ai tab when the direct call is blocked |

It does **not** request `tabs`. `chrome.tabs.query({url:'https://claude.ai/*'})` works with the host
permission alone, which means the extension **cannot see the URL of any tab other than claude.ai**.

- The only outbound request is to `https://claude.ai`. No analytics, no telemetry, no remote code.
- No credentials are collected; it reuses the session cookie already in the browser.
- Readings stay in `chrome.storage.local` and never leave the device.

## Layout

```
manifest.json    MV3 configuration
background.js    collection + badge (service worker)
lib.js           payload normalization / formatters (shared by background and popup)
popup.html/.css/.js
icons/
store/           listing copy, privacy policy, screenshots
test/            fixture.json + run.mjs  ->  node test/run.mjs
```

## Customizing

- Refresh interval: `PERIOD_MIN` in `background.js`
- Warning thresholds: `levelFor()` in `lib.js` (70% / 90% by default)
- To badge only the 5-hour session, add an `r.group === 'session'` filter in `badgeFor()` in `lib.js`

## Caveat

This relies on claude.ai's internal endpoints, whose shape can change without notice.
When that happens the `limits[]` fallback keeps the popup showing an explanation rather than a blank panel.

## License

MIT
