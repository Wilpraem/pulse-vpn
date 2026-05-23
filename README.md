# Pulse VPN

iOS-first VPN/proxy client built with React Native, Expo, TypeScript and an iOS NetworkExtension foundation.

## Server Source

The app loads:

```text
https://gitverse.ru/api/repos/zieng2/wl/raw/branch/master/list_universal.txt
```

Current analysis: 554 raw `vless://` configs. Observed transports are `tcp`, `xhttp`, `grpc` and `ws`; security is primarily VLESS Reality with some TLS. See `docs/server-format-analysis.md`.

## Architecture

- `ServerListService`: downloads and caches the subscription.
- `ServerParserService`: parses VLESS configs and keeps broken lines as parse errors.
- `ServerProbeService`: runs limited-concurrency probes with retries and timeout.
- `ServerSelectionService`: ranks reachable servers by foreign-country preference, latency, jitter, protocol validity and last successful server fallback.
- `VpnConnectionService`: orchestrates internet check, refresh, parse, probe, rank and native VPN start with fallback candidates.
- `DiagnosticsService`: network state, captive portal signal, parser/probe/connection errors and debug logs.
- `modules/vpn-bridge`: Expo native module for iOS `NETunnelProviderManager` and TCP probe.
- `ios/PacketTunnel`: `NEPacketTunnelProvider` extension source.

## Why sing-box/libbox

The source uses VLESS Reality and xHTTP. These protocols are not safe to implement manually in a mobile app. The production path is sing-box/libbox inside `NEPacketTunnelProvider`, because it supports VLESS, Reality, TLS and multiple transports through a maintained core.

The repository contains the iOS extension and bridge foundation. It intentionally does not fake a connected state: without `Libbox.xcframework` and a concrete libbox platform interface, the Packet Tunnel fails with a clear native error.

## Server Selection

On Connect:

1. Check internet reachability.
2. Download a fresh subscription.
3. Parse all configs and cache the result.
4. Probe servers with limited concurrency.
5. Use median latency from multiple attempts and jitter.
6. Drop unavailable servers.
7. Prefer foreign countries when available.
8. Select the lowest stable latency.
9. Try next ranked candidates if VPN start fails.

If nothing is reachable, the app shows: `Нет интернета или соединение сильно блокируется`.

## Probe Strategy

- iOS custom dev client/native build: native TCP connect probe via `NWConnection`.
- Expo Go/no native bridge: HTTP fallback is attempted, but VLESS endpoints usually require native TCP probing.
- ICMP is not used by default because iOS restricts raw sockets for App Store apps.

## iOS Setup

Install dependencies:

```bash
npm install
```

Prebuild and add the extension target:

```bash
npm run prebuild:ios
```

Run on simulator/device:

```bash
npx expo run:ios
```

For a real device and IPA you need an Apple Developer account, a signing team and these capabilities enabled for app and extension targets:

- Network Extensions.
- Packet Tunnel Provider.
- App Groups: `group.com.pulsevpn.shared`.

Production VPN traffic also requires linking sing-box `Libbox.xcframework` and wiring the platform interface in `ios/PacketTunnel/SingBoxEngine.swift`.

## Build IPA

Local Xcode archive:

```bash
npm run prebuild:ios
open ios/*.xcworkspace
```

In Xcode: select a real device destination, configure signing, archive, then distribute Ad Hoc/TestFlight/App Store.

EAS Build:

```bash
npm install -g eas-cli
eas login
eas build -p ios --profile production
```

## Android APK/AAB

Android is prepared as the second stage. Basic Expo config is present.

```bash
npx expo prebuild -p android
npx expo run:android
eas build -p android --profile production
```

Local APK:

```bash
npm run build:android:local
```

Android real VPN support still needs a platform VPN service using the same sing-box core.

## Tests

```bash
npm test
npm run typecheck
npm run lint
```

Covered:

- VLESS parser.
- Broken config handling.
- Best server ranking.
- Unavailable server filtering.
- Last successful server fallback.

## Troubleshooting

- `PulseVpnBridge is unavailable`: use a custom dev client or native iOS build, not Expo Go.
- `Libbox.xcframework is not linked`: build/link sing-box libbox before starting a real tunnel.
- VPN permission dialog does not appear: check Network Extensions entitlement and signing team.
- No reachable servers: network is offline, blocked, captive portal, or native TCP probe is unavailable.
- EAS signing fails: create explicit App ID for app and extension and enable Network Extensions in Apple Developer.

## Security And Privacy

- Configs are cached locally with AsyncStorage. If paid/private configs are added later, move secrets to Keychain.
- Debug logs avoid storing full raw URIs in UI.
- The app fetches external IP only after a successful connection attempt.
- The subscription URL is public and unauthenticated.

## Known Limitations

- Real iOS packet forwarding requires completing the sing-box/libbox platform interface.
- Apple Network Extension entitlements require Apple Developer approval/signing.
- Expo Go cannot run NetworkExtension or native TCP probes.
- Android VPN implementation is intentionally scoped for the next stage.
