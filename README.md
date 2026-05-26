# Pulse VPN

React Native + Expo bare/dev-client VPN client for VLESS subscription lists. The app downloads a remote list, parses `vless://` links, probes hosts, ranks candidates, and starts a native VPN bridge.

Default subscription:

```text
https://gitverse.ru/api/repos/zieng2/wl/raw/branch/master/list_universal.txt
```

## Current Build Status

- Android release APK builds locally: `dist/android/app-release.apk`.
- iOS simulator build passes.
- iOS IPA was not produced on this machine because Xcode has a signing certificate in Keychain but no logged-in Apple account/provisioning profiles for `com.pulsevpn.app` and `com.pulsevpn.app.PacketTunnel`.
- Real VPN traffic requires bundling sing-box/libbox. The Android bridge is wired to call `io.nekohasekai.libbox` through `VpnService` when `libbox.aar` is added. The iOS Packet Tunnel target is present, but `Libbox.xcframework` still has to be linked and the platform interface completed.

The app does not fake a connected tunnel: missing core/signing fails with explicit native errors.

## Requirements

- Node.js 20+ and npm.
- Xcode with iOS simulator/device support.
- CocoaPods.
- Android SDK.
- JDK 17. On this machine: `/opt/homebrew/opt/openjdk@17`.
- Optional for real core builds: Go, gomobile, Android NDK, and sing-box/libbox build tooling.

## Install

```bash
npm ci
cd ios && pod install && cd ..
```

## Run

```bash
npm run start
npm run android
npm run ios
```

Expo Go is not supported because the app uses native VPN modules.

## Build Android APK

```bash
npm run build:android:apk
```

Output:

```text
dist/android/app-release.apk
```

For real Android VLESS routing, add official sing-box `libbox.aar` to the Android app classpath so `io.nekohasekai.libbox.*` exists at runtime. Without it, the APK installs and the VPN permission/service path is present, but the tunnel cannot route traffic.

## Build iOS IPA

1. Open Xcode and sign in under Settings -> Accounts.
2. Create explicit App IDs for:
   - `com.pulsevpn.app`
   - `com.pulsevpn.app.PacketTunnel`
3. Enable Network Extensions / Packet Tunnel Provider and App Groups for both targets.
4. Set the same team for `PulseVPN` and `PacketTunnel`.
5. Run:

```bash
APPLE_TEAM_ID=<YOUR_TEAM_ID> npm run build:ios:ipa
```

Output, when signing succeeds:

```text
dist/ios/App.ipa
```

Free Apple accounts usually cannot create/distribute a universal IPA with NetworkExtension. In that case use Xcode to run directly on the connected iPhone with automatic signing.

## Configure Subscription URL

Change it in app settings at runtime or edit:

```text
src/utils/constants.ts
app.config.ts
```

The app caches the last successful list and falls back to it when the remote URL is unavailable.

## Diagnostics

- `npm run test`: parser and ranking tests.
- `npm run typecheck`: TypeScript.
- `npm run lint`: ESLint.
- Android logs: `adb logcat | grep PulseVpn`.
- iOS logs: Xcode Devices and Simulators console, filter `PacketTunnel` or `PulseVpnBridge`.

## Privacy And Security

- VLESS UUIDs and raw URLs are not shown in normal UI logs.
- The app contacts the configured subscription URL and selected VPN server.
- `ipapi.co` is used only after a connection attempt to display external IP metadata.
- Settings and cached public subscription data are in local app storage. Move private paid configs to Keychain/Keystore before production use.

## GitHub

```bash
git remote add origin <MY_GITHUB_REPO_URL>
git branch -M main
git push -u origin main
```

## Troubleshooting

- `PulseVpnBridge is unavailable`: use a native build/dev client, not Expo Go.
- `ClassNotFoundException: io.nekohasekai.libbox.Libbox`: add `libbox.aar`.
- `Libbox.xcframework is not linked`: build/link sing-box libbox for iOS.
- iOS `No Account for Team`: sign into Xcode Accounts and create provisioning profiles.
- VPN dialog does not appear: check Android `VpnService` manifest or iOS NetworkExtension entitlements.
- Empty/broken list: parser keeps errors and the UI should remain usable with zero valid servers.
