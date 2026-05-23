#!/usr/bin/env bash
set -euo pipefail

cat <<'MESSAGE'
This project is wired for sing-box/libbox but does not vendor a binary core.

Recommended production path:
1. Build Libbox.xcframework from SagerNet/sing-box for iOS arm64 and simulator arm64.
2. Add Libbox.xcframework to ios/Frameworks.
3. Link it with the PacketTunnel target and embed/sign it.
4. Replace ios/PacketTunnel/SingBoxEngine.swift with the concrete Libbox platform interface.

Reference implementation to port from:
https://github.com/SagerNet/sing-box-for-apple/blob/dev/Library/Network/ExtensionProvider.swift
MESSAGE
