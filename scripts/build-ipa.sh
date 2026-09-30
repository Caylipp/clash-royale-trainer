#!/bin/sh
# Baut eine unsignierte iOS-IPA (Release) – z. B. für LiveContainer, SideStore oder AltStore.
# Diese signieren die App beim Import selbst. Ergebnis: dist/ElixierTrainer.ipa
set -eu
cd "$(dirname "$0")/.."

npx expo prebuild --platform ios --no-install >/dev/null
(cd ios && pod install >/dev/null)

WORKSPACE=$(ls -d ios/*.xcworkspace | head -n 1)
SCHEME=$(basename "$WORKSPACE" .xcworkspace)

xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -derivedDataPath ios/build \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" \
  | grep -E "error:|BUILD SUCCEEDED|BUILD FAILED" || true

APP="ios/build/Build/Products/Release-iphoneos/$SCHEME.app"
[ -d "$APP" ] || { echo "Build fehlgeschlagen: $APP fehlt" >&2; exit 1; }

# iOS 27 beendet Apps, die mit dem 27er-SDK gebaut sind, aber noch kein UIScene-Lifecycle haben (Crash beim Start,
# "NoSceneLifecycleAdoption"; Expo/React Native bieten das noch nicht). Umgehung: SDK-Version im Binary auf 26 setzen.
# Entfernen, sobald React Native/Expo den Scene-Lifecycle unterstützen.
vtool -set-build-version 2 16.4 26.0 -replace -output ios/build/patched.bin "$APP/$SCHEME"
cp ios/build/patched.bin "$APP/$SCHEME"

rm -rf dist/ipa && mkdir -p dist/ipa/Payload
cp -R "$APP" dist/ipa/Payload/
(cd dist/ipa && zip -qry ../ElixierTrainer.ipa Payload)
rm -rf dist/ipa
# ZIP-Variante: Eine nackte IPA würde iOS selbst zu installieren versuchen (per iCloud Drive teilen, nicht AirDrop).
(cd dist && rm -f ElixierTrainer.ipa.zip && zip -q ElixierTrainer.ipa.zip ElixierTrainer.ipa)
echo "Fertig: dist/ElixierTrainer.ipa ($(du -h dist/ElixierTrainer.ipa | cut -f1)) und dist/ElixierTrainer.ipa.zip"
