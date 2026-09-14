# Store listing copy

Paste-ready text for the Chrome Web Store and Microsoft Edge Add-ons. The same copy works for both.

---

## Name (45 char limit on Chrome)

```
Usage Meter for Claude
```

## Short description / summary (132 char limit on Chrome)

```
See the 5-hour and weekly usage limits of every Claude organization in one view. Unofficial; not affiliated with Anthropic.
```

## Category

`Productivity` (Chrome) / `Productivity` (Edge)

## Detailed description

```
Usage Meter for Claude shows the usage limits of every organization on your claude.ai account
side by side, so you never have to switch workspaces and reload the settings page to find out
where you stand.

WHAT YOU SEE
• One card per organization: 5-hour session, weekly all-models, and weekly per-model limits
• Time remaining until each limit resets
• A toolbar badge with the highest figure across every organization — amber at 70%, red at 90%
• Or pin the badge to one organization and to the 5-hour or weekly limit only — or hide it (Options)
• Hover the badge for a per-organization summary
• Light and dark themes, following your browser

HOW IT WORKS
The extension reads your usage from claude.ai using the session your browser already has.
There is no separate login, no API key, and no token to paste. It refreshes every two minutes,
and again each time you open the popup. Organizations are enumerated live, so an organization
you have not opened in weeks still appears.

PRIVACY
• No analytics, no telemetry, no remote code, no developer-operated servers
• The only network destination is https://claude.ai
• Readings and the badge setting are cached in local browser storage and never leave your device
• The "tabs" permission is not requested, so the extension cannot see any tab other than claude.ai

PERMISSIONS
• https://claude.ai/* — read the two usage endpoints
• storage — cache the last reading and the badge setting locally
• alarms — refresh every two minutes
• scripting — fall back to an open claude.ai tab when the direct request is blocked

NOTE
This is an unofficial extension. It is not affiliated with, endorsed by, or sponsored by Anthropic.
"Claude" is a trademark of Anthropic, PBC. Because it relies on claude.ai's own endpoints, a change
on their side can temporarily affect what is displayed.
```

## Single purpose statement (Chrome requires this)

```
Display the current usage limits of the signed-in user's claude.ai organizations.
```

## Permission justifications (Chrome asks per permission)

| Field | Text |
| --- | --- |
| `host_permissions` | Reads https://claude.ai/api/organizations and .../usage to obtain the signed-in user's own usage limits. This is the only host the extension contacts. |
| `storage` | Caches the most recent usage reading locally so the popup renders immediately and the toolbar badge survives a service-worker restart, and stores the user's choice of what the badge shows. |
| `alarms` | Schedules the two-minute background refresh that keeps the toolbar badge current. |
| `scripting` | When the direct request from the service worker is blocked, the same two endpoints are read from an already-open claude.ai tab. No script is injected into any other site. |
| Remote code | Not used. All JavaScript is contained in the package. |
| Data usage | Nothing is collected or transmitted. Disclose as: no data collected. |

## Assets

| Asset | File | Required by |
| --- | --- | --- |
| Icon 128×128 | `icons/icon128.png` | Chrome, Edge |
| Screenshots 1280×800 | `store/screenshots/01-overview.png`, `02-dark.png`, `03-privacy.png` | Chrome (1–5), Edge (1–10) |
| Small promo tile 440×280 | `store/promo-tile-440x280.png` | Chrome (optional) |
| Privacy policy URL | host `store/PRIVACY.md` (GitHub raw or Pages) | Chrome, Edge |
