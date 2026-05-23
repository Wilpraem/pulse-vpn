#!/usr/bin/env bash
set -euo pipefail

npx expo prebuild -p android
cd android
./gradlew assembleRelease
