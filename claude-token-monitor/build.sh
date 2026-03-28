#!/bin/bash
# Build and package ClaudeTokenMonitor as a macOS .app bundle
set -e

APP_NAME="ClaudeTokenMonitor"
BUNDLE_ID="com.claudetokenmonitor"
BUILD_DIR=".build/release"
APP_BUNDLE="$APP_NAME.app"

echo "Building $APP_NAME..."

# Build release binary
swift build -c release

echo "Creating app bundle..."

# Create bundle structure
rm -rf "$APP_BUNDLE"
mkdir -p "$APP_BUNDLE/Contents/MacOS"
mkdir -p "$APP_BUNDLE/Contents/Resources"

# Copy binary
cp "$BUILD_DIR/$APP_NAME" "$APP_BUNDLE/Contents/MacOS/$APP_NAME"

# Copy Info.plist
cp "Resources/Info.plist" "$APP_BUNDLE/Contents/Info.plist"

# Make executable
chmod +x "$APP_BUNDLE/Contents/MacOS/$APP_NAME"

echo ""
echo "✓ Built: $APP_BUNDLE"
echo ""
echo "To install, drag $APP_BUNDLE to /Applications"
echo "Then double-click to run. The icon will appear in your menu bar."
echo ""
echo "First launch: click the icon → Preferences → enter your Anthropic API key."
