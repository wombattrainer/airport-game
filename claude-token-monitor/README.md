# Claude Token Monitor

A macOS menu bar app that shows your Claude Pro / API token usage directly in the toolbar, updating live like VS Code's context window indicator.

## What it shows

- **Fill bar + percentage** in the menu bar, colored green → yellow → red as tokens deplete
- **Dropdown** with: monthly used / total, visual bar, remaining tokens, billing period reset date, and a per-model breakdown
- **Cross-device**: queries the Anthropic API for account-wide usage across claude.ai web, mobile, and Claude Code

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

## Setting the monthly token limit

The Anthropic API reports raw token counts but does not expose your plan's exact ceiling. Set the limit manually:

| Plan | Suggested limit |
|------|-----------------|
| Claude.ai Free | 5,000,000 (5M) |
| Claude Pro | 50,000,000 (50M) |
| API / Team | Check your usage dashboard |

You can adjust this any time in Preferences.

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
