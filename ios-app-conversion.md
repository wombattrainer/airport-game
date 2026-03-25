# iOS App Conversion Plan — Airport Simulator

## Overview

This document describes the recommended path to take the current browser-based TypeScript game and ship it as an iPhone app on the App Store.

### Recommended Strategy: Two-Track Approach

| Track | Technology | Purpose | Effort |
|-------|-----------|---------|--------|
| **A — Quick prototype** | Capacitor (web wrapper) | Running on device fast for gameplay testing | Low |
| **B — Shipping version** | Swift + SpriteKit (native) | App Store quality, performance, native feel | High |

**Why two tracks?** The game's Canvas rendering and TypeScript logic cannot be used directly in a native iOS app. A complete rewrite is required eventually. However, a Capacitor wrapper lets you test the game on a real iPhone immediately — validating feel, touch responsiveness, and layout — while the native port is in progress.

Do not submit the Capacitor version to the App Store. Apple routinely rejects thin web-view wrappers that do not provide meaningful native functionality. The native Swift/SpriteKit version is the App Store target.

---

## Prerequisites

### Hardware and OS
- MacBook Pro running macOS Ventura (13) or later (required to run Xcode 15+)
- Personal iPhone for sideload testing (any iPhone with iOS 16+)

### Accounts and Licenses
- **Apple ID** — free, sufficient for sideloading to a personal device via Xcode (app certificate expires every 7 days)
- **Apple Developer Program** — $99 USD/year. Required for: TestFlight distribution, App Store submission, and certificates that do not expire every 7 days. Enroll at developer.apple.com before Stage 4.

### Software to Install
- **Xcode 15** or later — install from the Mac App Store (large download, ~15 GB)
- **Xcode Command Line Tools** — `xcode-select --install`
- **Node.js 20+** and **npm** — already present for the current project
- **CocoaPods** — `sudo gem install cocoapods` (required by Capacitor's iOS integration)

---

## Stage 1 — Development Environment Setup

**Goal:** Xcode installed, iOS Simulator running, project building cleanly.

### Steps

1. Install Xcode from the Mac App Store and open it once to complete component installation.
2. In Xcode → Settings → Platforms, download the iOS Simulator runtime for the latest iOS version.
3. Verify the command line tools: `xcode-select -p` should return a path inside Xcode.app.
4. Confirm Simulators are available:
   ```
   xcrun simctl list devices
   ```
5. Launch a Simulator manually to confirm it boots:
   ```
   open -a Simulator
   ```

### Done When
- Xcode opens without errors
- At least one iPhone Simulator (e.g. iPhone 16 Pro) boots to the home screen
- `xcode-select -p` returns `/Applications/Xcode.app/Contents/Developer`

---

## Stage 2 — Adapt the Web Game for Touch Input

**Goal:** The game runs correctly under touch events. This is required before the Capacitor wrapper will be usable on a real device, and the changes are small and low-risk.

The current `DragDropManager.ts` uses `mousedown`, `mousemove`, and `mouseup` events. iOS Safari does not fire standard mouse events on touch. The fix is to use the **Pointer Events API**, which works identically for both mouse and touch with no branching.

### Changes Required

**`src/input/DragDropManager.ts`** — replace `mouse*` event names:

| Current event | Replace with |
|--------------|--------------|
| `mousedown` | `pointerdown` |
| `mousemove` | `pointermove` |
| `mouseup` | `pointerup` |

**`src/game/Game.ts`** — any direct `click` or `mousedown` listeners on the canvas (pause button, Cleared to Land button) should be changed to `pointerdown`.

**`index.html`** — prevent the browser pulling/bouncing the page on touch drag:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0,
  maximum-scale=1.0, user-scalable=no" />
```

Add to the `<style>` block:
```css
canvas { touch-action: none; }
```

`touch-action: none` tells the browser not to intercept pointer events for scrolling or zooming, passing all touch input directly to the canvas event listeners.

**Safe area insets** — modern iPhones have a notch or Dynamic Island at the top and a home indicator bar at the bottom. The game fills the full canvas, so no content is clipped, but the canvas should be padded to avoid the home indicator overlapping the HUD. In `index.html`:

```css
body {
  padding: env(safe-area-inset-top) env(safe-area-inset-right)
           env(safe-area-inset-bottom) env(safe-area-inset-left);
}
```

### Orientation

The game is designed in landscape (world 4000 × 3000, queue panel on the right). Lock the app to landscape in the Capacitor project (Stage 3) and in the native app (Stage 5). Do not attempt to support portrait — the layout does not accommodate it.

### Done When
- `npm run dev` still works in the browser
- Mouse drag-reorder of the queue works correctly (pointer events are backwards compatible)
- No console errors

---

## Stage 3 — Capacitor Wrapper (Simulator + Device Prototype)

**Goal:** The game running as a native iOS app shell on the iOS Simulator and sideloaded to a personal iPhone, without rewriting any game code.

Capacitor packages the built web assets into a native iOS project and provides a WKWebView host. The result is a real `.ipa` that can be installed on a device.

### Setup Steps

```bash
# In the airport-game project root
npm install @capacitor/core @capacitor/cli
npx cap init "Airport Simulator" "com.yourname.airportsim" --web-dir dist
npm install @capacitor/ios
npx cap add ios
```

Replace `com.yourname.airportsim` with your chosen reverse-DNS bundle ID. This ID must match what you register in Apple Developer if submitting to the App Store.

### Build and Sync

Every time you change game code, repeat this sequence:

```bash
npm run build          # compile TypeScript → dist/
npx cap sync ios       # copy dist/ into the native Xcode project
```

Then open the project in Xcode:

```bash
npx cap open ios
```

### Configure Xcode Project

Inside Xcode (the `App` target → General tab):

- **Display Name:** Airport Simulator
- **Bundle Identifier:** com.yourname.airportsim
- **Deployment Target:** iOS 16.0
- **Device Orientation:** check Landscape Left and Landscape Right only; uncheck Portrait
- **Status Bar Style:** Hidden (prevents the status bar overlapping the game HUD)

### Run on Simulator

In Xcode, select an iPhone Simulator from the device picker and press Run (⌘R). The Simulator will boot and install the app.

Test specifically:
- Queue drag-and-drop with mouse (simulates touch in the Simulator)
- Cleared to Land button taps
- Pause button
- Landscape locked (rotate the Simulator: Hardware → Rotate Left)

### Sideload to Personal iPhone

1. Connect your iPhone to the MacBook Pro via USB.
2. Trust the computer on the iPhone when prompted.
3. In Xcode, select your iPhone from the device picker.
4. Under Signing & Capabilities, set Team to your personal Apple ID (Xcode will create a free provisioning profile automatically).
5. Press Run (⌘R). Xcode will build and install the app on the device.
6. On the iPhone: Settings → General → VPN & Device Management → trust your developer certificate.

**Note:** Apps sideloaded with a free Apple ID expire after 7 days and must be reinstalled via Xcode. This is sufficient for gameplay testing. For longer-lived builds and TestFlight, enroll in the Apple Developer Program.

### Done When
- App installs and runs on the iOS Simulator in landscape
- Touch drag-and-drop reorders the queue
- App installs and runs on personal iPhone
- No significant frame rate issues (target 60 fps; check Xcode's Instruments → Time Profiler if sluggish)

---

## Stage 4 — Apple Developer Program Enrollment

**Goal:** Paid developer account active, enabling TestFlight and App Store submission.

1. Go to developer.apple.com/programs and enroll. Allow 24–48 hours for approval.
2. In Xcode → Settings → Accounts, add your Apple ID and download the development certificate.
3. In the Capacitor Xcode project → Signing & Capabilities, switch Team from your personal Apple ID to your Developer Program team. Xcode will create a proper provisioning profile.
4. Create an App Store Connect record at appstoreconnect.apple.com:
   - New App → iOS → Bundle ID matches `com.yourname.airportsim`
   - Fill in app name, primary language, category (Games → Simulation)
5. Distribute via TestFlight (optional but recommended before App Store submission):
   - In Xcode → Product → Archive → Distribute App → TestFlight
   - Invite yourself and any testers via App Store Connect

---

## Stage 5 — Native Swift + SpriteKit Port

**Goal:** A fully native iOS app with no web view, suitable for App Store submission.

This is a complete rewrite of the rendering and input layers. The game logic (state machines, systems, config values) maps closely to Swift and can be ported systematically file by file.

### Project Setup

In Xcode: File → New Project → iOS → Game → SpriteKit.

- Product Name: Airport Simulator
- Interface: SwiftUI (for any menus/overlays) or Storyboard (simpler for a single-scene game)
- Game Technology: SpriteKit
- Language: Swift

### Architecture Mapping

The TypeScript architecture maps to Swift/SpriteKit as follows:

| TypeScript | Swift / SpriteKit equivalent |
|-----------|------------------------------|
| `types.ts` enums | Swift `enum` with associated values |
| `config.ts` constants | Swift `enum` with `static let` constants (no instantiation) |
| `Aircraft`, `Airport`, `Runway` entities | Swift `class` or `struct` |
| `Game.ts` main loop | `SKScene.update(_ currentTime: TimeInterval)` |
| `Clock.ts` delta time | Computed from `currentTime - lastUpdateTime` in `update()` |
| Canvas `ctx.fillRect()` / `ctx.arc()` | `SKShapeNode`, `SKSpriteNode`, or `SKNode` with custom `draw()` |
| `AircraftRenderer.ts` silhouettes | Custom `SKShapeNode` paths built with `CGPath` and `UIBezierPath` |
| `DragDropManager.ts` | `touchesBegan/Moved/Ended` on `SKScene` or `UIPanGestureRecognizer` |
| `QueuePanelRenderer.ts` | SwiftUI overlay view or `SKNode` tree for the panel |
| `ExplosionRenderer.ts` | SpriteKit `SKEmitterNode` particle system or animated `SKAction` sequence |

### Porting Order (Recommended)

Port in this order to keep the app runnable after each step:

1. **Config and types** — pure data, no dependencies, easy to verify
2. **Entity classes** (`Aircraft`, `Runway`, `Airport`) — data containers, no rendering
3. **Systems** (`FuelSystem`, `SpawnSystem`, `WeatherSystem`, `QueueSystem`) — pure logic, unit-testable
4. **`HoldingSystem` and `ApproachSystem`** — most complex logic; port and verify visually
5. **`LandingSystem`** — straightforward deceleration math
6. **Rendering** — replace Canvas draw calls with SpriteKit nodes; start with simple shapes and refine
7. **Input** — touch gesture recognition for drag-and-drop and button taps
8. **Queue panel UI** — can be a SwiftUI view overlaid on the SpriteKit scene using `UIHostingController` or built entirely with `SKNode`

### Key SpriteKit Patterns

**Game loop:**
```swift
override func update(_ currentTime: TimeInterval) {
    let dt = currentTime - lastUpdateTime
    lastUpdateTime = currentTime
    holdingSystem.update(dt: dt)
    approachSystem.update(dt: dt)
    // ... etc.
}
```

**Aircraft node (replaces AircraftRenderer):**
Create a custom `SKNode` subclass per aircraft. Override `draw()` or compose child `SKShapeNode` instances for fuselage, wings, and engines. Rotate the node via `zRotation` to match the aircraft heading.

**Drag-and-drop queue panel:**
Use `touchesBegan`, `touchesMoved`, `touchesEnded` on the queue panel node, translating touch Y-position to queue index. This replaces `DragDropManager.ts` directly.

**Explosion:**
SpriteKit's `SKEmitterNode` (`.sks` particle file) is the idiomatic replacement for the custom explosion renderer. Alternatively, drive an animated `SKShapeNode` with an `SKAction` sequence.

### Screen Layout

The game world (4000 × 3000) should be scaled uniformly to fill the left 75% of the iPhone screen in landscape. The right 25% hosts the queue panel. In SpriteKit, use two `SKNode` layers positioned in the scene:

- `gameNode` — all aircraft, runway, holding fix markers; scaled to fit its allocated screen rect
- `panelNode` — queue cards built with either SpriteKit nodes or a SwiftUI overlay

iPhone landscape safe area on a current device is approximately 844 × 390 points (iPhone 14/15 series). The game view portion is about 633 × 390 points.

### iPhone Screen Sizes to Test

| Model | Points (landscape) | Notes |
|-------|-------------------|-------|
| iPhone SE (3rd gen) | 667 × 375 | Smallest current iPhone; test that HUD is legible |
| iPhone 14 / 15 | 844 × 390 | Most common size |
| iPhone 14/15 Plus | 932 × 430 | Larger; more game area |
| iPhone 14/15 Pro Max | 932 × 430 | Same points as Plus |

Target deployment: iOS 16.0+ covers 97%+ of active iPhones.

---

## Stage 6 — App Store Submission

### Required Assets

| Asset | Specification |
|-------|--------------|
| App icon | 1024 × 1024 px PNG, no transparency, no rounded corners (Apple applies the mask) |
| iPhone screenshots | At minimum: one 6.5" (1284 × 2778 px) and one 5.5" (1242 × 2208 px) screenshot |
| App preview video | Optional but increases conversion rate; up to 30 seconds, landscape |
| Privacy policy URL | Required if the app collects any data (even analytics). Host a simple page. |

The game collects no user data, requires no network access, and has no accounts. This simplifies the App Store privacy questionnaire significantly — select "No" for all data collection categories.

### App Store Metadata

- **Category:** Games → Simulation (primary), Games → Strategy (secondary)
- **Age Rating:** 4+ (no objectionable content)
- **Description:** Write a concise description covering the core loop (land aircraft, manage queue, avoid diverts, reach $500k)
- **Keywords:** air traffic control, airport, simulation, landing, queue management

### Submission Checklist

- [ ] App builds with no warnings in Release configuration
- [ ] All device orientations locked to Landscape in Info.plist
- [ ] Status bar hidden
- [ ] Safe area insets handled (no HUD clipped by Dynamic Island or home indicator)
- [ ] App icon set complete (all required sizes generated from the 1024×1024 source)
- [ ] Tested on at least two different Simulator sizes and on a physical device
- [ ] Privacy Nutrition Label completed in App Store Connect
- [ ] No use of private APIs (SpriteKit/UIKit only)
- [ ] Archive built with Distribution certificate (not Development)
- [ ] Uploaded via Xcode → Product → Archive → Distribute App → App Store Connect
- [ ] Build visible in App Store Connect → TestFlight before submitting for review

### Review Timeline

Apple's review typically takes 24–72 hours for new apps. Rejections are common on first submission; address the feedback and resubmit. Common first-submission rejections for games:
- Missing privacy policy URL (add one even if data collection is "none")
- Screenshots not matching device size requirements
- App crashes on launch in the review environment (test on a clean Simulator install first)

---

## Summary Timeline

| Stage | Estimated Effort | Milestone |
|-------|-----------------|-----------|
| 1. Dev environment | 0.5 day | Xcode and Simulator working |
| 2. Touch input adaptation | 0.5 day | Web game works with pointer events |
| 3. Capacitor wrapper | 1 day | Game running on personal iPhone |
| 4. Developer Program enrollment | 1–2 days (Apple review) | TestFlight capable |
| 5. Native Swift/SpriteKit port | 3–6 weeks | Native app, no web view |
| 6. App Store submission | 1 week | App live on App Store |

The Capacitor prototype (Stages 1–3) can be completed in 2 days and gives a real device in your hands quickly. The native port (Stage 5) is the bulk of the work and should be treated as a standard software project with incremental milestones, not a single large task.

---

## Recommended Tools

| Tool | Purpose |
|------|---------|
| Xcode Instruments → Time Profiler | Frame rate and CPU profiling |
| Xcode Instruments → Metal System Trace | GPU rendering analysis |
| SF Symbols app | Icon library for any native UI elements |
| Sketch / Figma | App icon and screenshot design |
| makeappicon.com | Generate all required icon sizes from one 1024×1024 PNG |
| TestFlight | Beta distribution to additional testers before App Store |
