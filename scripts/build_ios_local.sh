#!/usr/bin/env bash
set -euo pipefail

npx expo prebuild -p ios
ruby scripts/install_packet_tunnel_target.rb
npx expo run:ios
