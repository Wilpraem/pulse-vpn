# iOS Network Extension Notes

The app uses a bare-compatible Expo setup:

- Main app: React Native + Expo custom dev client.
- Native bridge: `modules/vpn-bridge` with `NETunnelProviderManager` and `NWConnection` TCP probe.
- Extension sources: `ios/PacketTunnel`.
- Core engine: sing-box `Libbox.xcframework` must be linked for production traffic.

Required Apple capabilities:

- Network Extensions.
- Packet Tunnel Provider.
- App Groups: `group.com.pulsevpn.shared`.

After `npx expo prebuild -p ios`, run:

```bash
ruby scripts/install_packet_tunnel_target.rb
```

Then open Xcode, enable the capabilities for both the app target and `PacketTunnel` target, and set correct signing teams.
