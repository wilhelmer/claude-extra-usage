# Claude Extra Usage

A minimal VS Code extension that shows your Claude extra credit usage in the status bar.

![Status bar display with tooltip](https://github.com/wilhelmer/claude-extra-usage/blob/main/status-bar.png?raw=true)

This is useful, for example, if you are on an Enterprise plan with only a monthly credit limit and without daily or weekly limits.

The extension calculates the percentage from your monthly credit limit and the amount spent so far in the billing period.

## Setup

Configure two settings (VS Code Settings → search `Claude Extra Usage`):

| Setting                           | Description                                                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `claudeExtraUsage.organizationId` | Your Claude organization ID. See https://claude.ai/settings/account.                                                                             |
| `claudeExtraUsage.sessionKey`     | Your Claude session key. To retrieve it, open https://claude.ai, open dev tools (F12), and go to Application > Storage > Cookies > `sessionKey`. |

The status bar item appears only when extra credit usage is active on your account. It does not appear otherwise.

## Usage

- The extension automatically fetches usage data every 10 minutes (configurable via `claudeExtraUsage.refreshInterval`).
- Click the status bar item or run **Claude Extra Usage: Refresh Now** from the command menu to force an immediate refresh.

## License

MIT
