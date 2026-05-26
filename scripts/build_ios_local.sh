#!/usr/bin/env bash
set -euo pipefail

TEAM_ID="${APPLE_TEAM_ID:-5Q4FP8VNAQ}"
ARCHIVE_PATH="build/PulseVPN.xcarchive"
EXPORT_PATH="build/ios-export"

npx expo prebuild -p ios --no-install
ruby scripts/install_packet_tunnel_target.rb
(cd ios && pod install)

rm -rf "$ARCHIVE_PATH" "$EXPORT_PATH" dist/ios
mkdir -p build dist/ios

xcodebuild \
  -workspace ios/PulseVPN.xcworkspace \
  -scheme PulseVPN \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE_PATH" \
  DEVELOPMENT_TEAM="$TEAM_ID" \
  CODE_SIGN_STYLE=Automatic \
  -allowProvisioningUpdates \
  archive

cat > build/ExportOptions.plist <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>development</string>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>teamID</key>
  <string>$TEAM_ID</string>
</dict>
</plist>
PLIST

xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_PATH" \
  -exportOptionsPlist build/ExportOptions.plist \
  -allowProvisioningUpdates

IPA_PATH="$(find "$EXPORT_PATH" -name '*.ipa' -print -quit)"
if [[ -z "$IPA_PATH" ]]; then
  echo "IPA was not produced by xcodebuild export." >&2
  exit 1
fi

cp "$IPA_PATH" dist/ios/App.ipa
ls -lh dist/ios/App.ipa
