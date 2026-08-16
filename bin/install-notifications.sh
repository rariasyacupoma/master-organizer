#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
UI_DIR="$REPO_DIR/master-organizer-ui"
SVG="$UI_DIR/logo-holo-b.svg"
APP_DIR="$HOME/Applications/MasterOrganizer.app"
BUNDLE_ID="com.rarias.master-organizer-2"

echo "==> Checking dependencies..."

if ! command -v brew &>/dev/null; then
  echo "ERROR: Homebrew not found. Install it first: https://brew.sh"
  exit 1
fi

if ! command -v rsvg-convert &>/dev/null; then
  echo "    Installing librsvg..."
  brew install librsvg
fi

if ! command -v terminal-notifier &>/dev/null; then
  echo "    Installing terminal-notifier..."
  brew install terminal-notifier
fi

echo "==> Building app bundle at $APP_DIR..."
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"

# Info.plist
cat > "$APP_DIR/Contents/Info.plist" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key>
  <string>$BUNDLE_ID</string>
  <key>CFBundleName</key>
  <string>MasterOrganizer</string>
  <key>CFBundleDisplayName</key>
  <string>Master Organizer</string>
  <key>CFBundleExecutable</key>
  <string>MasterOrganizer</string>
  <key>CFBundleIconFile</key>
  <string>AppIcon</string>
  <key>CFBundleVersion</key>
  <string>1.0</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>LSUIElement</key>
  <true/>
  <key>NSUserNotificationAlertStyle</key>
  <string>alert</string>
</dict>
</plist>
PLIST

echo "==> Compiling notification helper..."
cat > /tmp/mo-notify.swift << 'SWIFT'
import Foundation
import UserNotifications
import AppKit

let args = CommandLine.arguments
guard args.count >= 4 else {
    print("Usage: MasterOrganizer <title> <subtitle> <message>")
    exit(1)
}

let title    = args[1]
let subtitle = args[2]
let message  = args[3]

class AppDelegate: NSObject, NSApplicationDelegate, UNUserNotificationCenterDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        let center = UNUserNotificationCenter.current()
        center.delegate = self
        center.requestAuthorization(options: [.alert]) { granted, _ in
            guard granted else {
                print("Notification permission denied — enable in System Settings → Notifications → MasterOrganizer")
                DispatchQueue.main.async { NSApp.terminate(nil) }
                return
            }
            let content = UNMutableNotificationContent()
            content.title    = title
            content.subtitle = subtitle
            content.body     = message
            content.sound    = nil
            let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
            center.add(request) { error in
                if let error = error { print("Error: \(error)") }
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { NSApp.terminate(nil) }
            }
        }
    }
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                 willPresent notification: UNNotification,
                                 withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner])
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.prohibited)
app.run()
SWIFT

swiftc /tmp/mo-notify.swift \
  -framework AppKit \
  -framework UserNotifications \
  -o "$APP_DIR/Contents/MacOS/MasterOrganizer"

echo "==> Building app icon..."
ICONSET="$(mktemp -d)/AppIcon.iconset"
mkdir "$ICONSET"
for size in 16 32 64 128 256; do
  rsvg-convert -w $size -h $size "$SVG" -o "$ICONSET/icon_${size}x${size}.png"
  rsvg-convert -w $((size*2)) -h $((size*2)) "$SVG" -o "$ICONSET/icon_${size}x${size}@2x.png"
done
iconutil -c icns "$ICONSET" -o "$APP_DIR/Contents/Resources/AppIcon.icns"

echo "==> Signing and registering app..."
codesign --sign - --force --deep "$APP_DIR" 2>&1
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$APP_DIR"

echo ""
echo "==> Sending a test notification to trigger the permission prompt..."
echo "    When macOS asks, click 'Allow'."
echo ""
"$APP_DIR/Contents/MacOS/MasterOrganizer" \
  "Master Organizer" "Installation complete" "Notifications are working!"

echo ""
echo "Done! If you didn't see a notification, go to:"
echo "  System Settings → Notifications → MasterOrganizer → Allow Notifications"
echo "Then run this script again or trigger a notification from the dashboard."
