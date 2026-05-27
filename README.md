# Claude Extra Usage

A minimal VS Code extension that shows your Claude extra credit usage in the status bar.

## What it shows

| Status bar | Tooltip                  |
| ---------- | ------------------------ |
| `43% used` | `$12.94 of $30.00 spent` |

The extension calculates the percentage from your monthly credit limit and the amount spent so far in the billing period.

## Setup

Configure two settings (VS Code Settings → search `Claude Extra Usage`):

| Setting                           | Description                                                                             |
| --------------------------------- | --------------------------------------------------------------------------------------- |
| `claudeExtraUsage.organizationId` | Your org ID — visible in the URL at `claude.ai/settings`                                |
| `claudeExtraUsage.sessionKey`     | Your `sessionKey` cookie — DevTools on claude.ai → Application → Cookies → `sessionKey` |

The status bar item appears only when extra credit usage is active on your account. It does not appear otherwise.

## Usage

- The extension fetches usage from `https://claude.ai/api/organizations/<id>/usage` every five minutes (configurable via `claudeExtraUsage.refreshIntervalMinutes`).
- Click the status bar item or run **Claude Extra Usage: Refresh Now** from the command menu to force an immediate refresh.

## License

MIT
