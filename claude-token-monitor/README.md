# Claude Token Monitor

A macOS menu bar app that shows your Claude Pro / API token usage directly in the toolbar, updating live like VS Code's context window indicator.

## What it shows

- **Fill bar + percentage** in the menu bar — icon color and percentage track whichever window is most constrained
- **Three usage windows** in the dropdown, each with its own bar:
  - **Monthly** — current billing calendar month (resets on the 1st)
  - **Weekly** — rolling 7-day window
  - **Hourly** — rolling configurable window (default 8 h; matches Claude's short-term rate-limit window)
- **Reset timestamps** for all three windows
- **Per-model breakdown** (from the monthly window)
- **Cross-device**: queries the Anthropic API — reflects usage across claude.ai web, iOS/Android app, and Claude Code CLI

## Requirements

- macOS 13 (Ventura) or later
- Xcode 15+ or Swift 5.9+ toolchain
- An Anthropic API key (same key you use with Claude Code)

## Build & Install

```bash
git clone <this-repo>
cd claude-token-monitor
./build.sh
```

Drag `ClaudeTokenMonitor.app` to `/Applications` and double-click.

## First-time setup

1. Click the `...` icon in your menu bar
2. Select **Preferences...**
3. Paste your Anthropic API key (`sk-ant-...`)
4. Set your **monthly token limit** to match your plan (see note below)
5. Click **Save** — the icon updates immediately

## Setting the token limits

The Anthropic API reports raw token counts but does not expose your plan's hard ceilings. Set all three manually in Preferences after observing a period of typical usage:

| Window | Default | What to set it to |
|--------|---------|-------------------|
| Monthly | 50M | Your billing-period ceiling (check console) |
| Weekly (7 days) | 10M | ~¼ of your monthly limit as a baseline |
| Hourly rolling window | 1M | Matches Claude's short-term burst rate limit |
| Window width | 8 h | Match the hours-long window you notice resets |

Tip: run Claude heavily for a day, check the Anthropic console usage graph, and dial the limits to match where you hit slowdowns.

## How it works

The app calls `GET https://api.anthropic.com/v1/usage` each refresh cycle (default: every 60 seconds) using your API key. It sums all input + output + cache tokens for the current calendar month and computes the percentage against your configured limit.

Because usage is fetched from the Anthropic API (not local files), it reflects **all devices and clients** — claude.ai web, the iOS/Android app, and Claude Code CLI.

## Menu bar icon

| Appearance | Meaning |
|---|---|
| Green bar, high % | Plenty of tokens remaining |
| Yellow bar, ~25–50% | Getting lower |
| Red bar, <25% | Running low |
| `!` icon | API error — check Preferences |
| `...` | Fetching data |

## Privacy & Security

- Your API key is stored in the **macOS Keychain**, not in plain text
- No data is sent anywhere except to `api.anthropic.com`
- The app has no dock icon (`LSUIElement = YES`)

## Project structure

```
claude-token-monitor/
├── Sources/ClaudeTokenMonitor/
│   ├── main.swift                    # Entry point
│   ├── AppDelegate.swift             # App lifecycle
│   ├── StatusBarController.swift     # Menu bar item + menu
│   ├── MenuBarIconRenderer.swift     # Progress bar icon drawing
│   ├── AnthropicAPIClient.swift      # API usage fetch
│   ├── TokenUsageModel.swift         # Data models
│   ├── PreferencesWindowController.swift  # Settings UI
│   ├── KeychainHelper.swift          # Secure API key storage
│   └── Preferences.swift            # UserDefaults wrappers
├── Resources/
│   └── Info.plist                   # App metadata (LSUIElement etc.)
├── Package.swift                    # Swift Package Manager config
└── build.sh                         # Build + bundle script
```

## License

MIT
