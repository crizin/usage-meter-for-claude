# Privacy Policy — Usage Meter for Claude

_Last updated: 2026-09-11_

## Summary

This extension does not collect, transmit, sell, or share any personal data.
Everything it reads stays inside your own browser.

## What it accesses

To display your usage, the extension makes authenticated requests to two claude.ai endpoints,
using the session cookie your browser already holds:

- `GET https://claude.ai/api/organizations`
- `GET https://claude.ai/api/organizations/{uuid}/usage`

The responses contain your organization names and your usage percentages with their reset times.

## What it stores

The most recent response is cached in `chrome.storage.local` so the popup can render instantly.
This data:

- stays on your device,
- is never transmitted anywhere,
- is deleted when you uninstall the extension.

## What it does not do

- No analytics, telemetry, crash reporting, or usage tracking of any kind.
- No remote code execution; all code ships inside the extension package.
- No servers operated by the developer. The only network destination is `https://claude.ai`.
- No advertising, and no sale or transfer of data to third parties.
- No access to the content of your conversations.
- The `tabs` permission is not requested, so the extension cannot see the URL or content of any
  tab other than claude.ai.

## Permissions

| Permission | Purpose |
| --- | --- |
| `host_permissions: https://claude.ai/*` | read the two usage endpoints above |
| `storage` | cache the last reading on your device |
| `alarms` | schedule a refresh every 2 minutes |
| `scripting` | when the direct request is blocked, read the same endpoints from an open claude.ai tab |

## Contact

Questions about this policy can be raised as an issue on the project repository.

## Disclaimer

This is an unofficial extension. It is not affiliated with, endorsed by, or sponsored by Anthropic.
"Claude" is a trademark of Anthropic, PBC.
