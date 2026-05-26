#!/usr/bin/env bash
set -euo pipefail

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}"
export PATH="$JAVA_HOME/bin:$PATH"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"

npx expo prebuild -p android --no-install
cd android
./gradlew assembleRelease
cd ..
mkdir -p dist/android
cp android/app/build/outputs/apk/release/app-release.apk dist/android/app-release.apk
ls -lh dist/android/app-release.apk
