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
• A pace marker on each bar: where steady use since the last reset would stand right now — past it, slow down; short of it, there's room
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
| Store icon 128×128 | `store/store-logo-128x128.png` | Chrome |
| Store logo 300×300 | `store/store-logo-300x300.png` | Edge |
| Screenshots 1280×800 | `store/screenshots/01-overview.png`, `02-dark.png`, `03-privacy.png`, `04-options.png`, `05-pace.png` | Chrome (1–5), Edge (1–6) |
| Small promo tile 440×280 | `store/promo-tile-440x280.png` | Chrome (optional) |
| Marquee promo tile 1400×560 | `store/promo-marquee-1400x560.png` | Chrome (optional, only shown if featured) |
| Privacy policy URL | host `store/PRIVACY.md` (GitHub raw or Pages) | Chrome, Edge |

## Search terms (Edge, optional — max 7 terms, 30 chars each, 21 words total)

```
claude
claude usage
usage limit
rate limit
anthropic
claude.ai
quota
```

## Notes for certification (Edge, "Submit your extension" page)

```
This extension shows the usage limits (5-hour session and weekly) of every claude.ai
organization the signed-in user belongs to. It does nothing useful without a claude.ai session,
so please test with a claude.ai account (a free account is sufficient). No test credentials are
supplied because claude.ai accounts are personal and cannot be shared.

TO TEST
1. Sign in at https://claude.ai in the same browser profile.
2. Click the extension's toolbar icon. The popup lists one card per organization with usage bars
   and the time until each limit resets. The toolbar badge shows the highest percentage
   (amber from 70%, red from 90%).
3. Click "Badge options" at the bottom of the popup (or right-click the icon > Extension options)
   to pin the badge to one organization and/or one limit type, or to hide the badge figure.
4. Without a claude.ai session the popup shows "Sign in required" with an "Open claude.ai" button;
   this is expected.

BEHAVIOUR
- The only host contacted is https://claude.ai: GET /api/organizations and
  GET /api/organizations/{uuid}/usage, using the session cookie already in the browser.
- Nothing is collected or transmitted. The last reading and the badge preference are cached in
  chrome.storage.local and never leave the device.
- No remote code. No content scripts are declared; the "scripting" permission is used only as a
  fallback to run the same two requests inside an already open claude.ai tab when the direct
  request from the service worker is blocked.
- A background alarm refreshes the reading every 2 minutes.
- Unofficial; not affiliated with Anthropic. Source: https://github.com/crizin/usage-meter-for-claude
```

## Chrome listing identity (Developer Dashboard)

| Field | Value |
| --- | --- |
| Item ID | `jlohkbicmcebjejobahelcfbdmhjfdie` |
| Listing URL | `https://chromewebstore.google.com/detail/usage-meter-for-claude/jlohkbicmcebjejobahelcfbdmhjfdie` |

Updates: Developer Dashboard → the item → **Package** → upload the new release zip → **Submit for review**.

## Edge listing identity (Partner Center → Extension overview)

| Field | Value |
| --- | --- |
| Store ID | `0RDCKDJQT7NT` |
| CRX ID | `jehigijhkenldhnbflmkpjefmgjdpgnm` |
| Listing URL | `https://microsoftedge.microsoft.com/addons/detail/jehigijhkenldhnbflmkpjefmgjdpgnm` |

Updates: Partner Center → the extension → **Packages** → upload the new release zip → **Publish**. Every version is re-certified.
