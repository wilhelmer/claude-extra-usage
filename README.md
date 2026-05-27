# Claude Extra Usage

A minimal VS Code extension that shows your Claude pay-as-you-go credit usage in the status bar.

## What it shows

| Status bar | Tooltip |
|---|---|
| `43% used` | `$12.94 of $30.00 spent` |

The percentage is calculated from your monthly credit limit and the amount spent so far this billing period.

## Requirements

[Claude Code](https://claude.ai/code) must be installed and have run at least once. The extension reads usage data that Claude Code already fetches and caches locally at `~/.claude/claude-usage-bar-cache.json` — no API keys or network calls required.

The status bar item is only shown when pay-as-you-go extra usage (`extraUsage`) is enabled on your account. It hides itself silently otherwise.

## Usage

- The status bar updates automatically whenever Claude Code refreshes its own cache (checked every 10 seconds).
- Click the status bar item or run **Claude Usage: Refresh Now** from the Command Palette to force an immediate re-read.

## License

MIT
