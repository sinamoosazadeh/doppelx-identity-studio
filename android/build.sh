#!/usr/bin/env bash
# =============================================================================
# DOPPEL X — reproducible signed APK build (no Gradle required)
# =============================================================================
# Prerequisites:
#   ANDROID_HOME pointing to an SDK with platform android-34 and build-tools 34.0.0
#   JAVA_HOME (or javac/java on PATH)
#   DOPPELX_KEYSTORE, DOPPELX_KEY_ALIAS, DOPPELX_STORE_PASSWORD,
#   DOPPELX_KEY_PASSWORD set to a release signing key you control
#
# The repository intentionally ships no keystore, passwords, APK, AAB, or idsig.
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$ROOT/version.properties"

SDK="${ANDROID_HOME:?Set ANDROID_HOME to your Android SDK directory.}"
BUILD_TOOLS="${ANDROID_BUILD_TOOLS:-$SDK/build-tools/34.0.0}"
PLATFORM="${ANDROID_PLATFORM:-$SDK/platforms/android-34/android.jar}"
if [[ -n "${JAVA_HOME:-}" ]]; then
  JAVA="$JAVA_HOME/bin/java"
  JAVAC="$JAVA_HOME/bin/javac"
else
  JAVA="$(command -v java)"
  JAVAC="$(command -v javac)"
fi

APP="$ROOT/app"
OUT="$ROOT/dist"
BUILD="$ROOT/build"
APKSIGNER="${APKSIGNER:-$BUILD_TOOLS/apksigner}"
ZIPALIGN="${ZIPALIGN:-$BUILD_TOOLS/zipalign}"
AAPT2="${AAPT2:-$BUILD_TOOLS/aapt2}"
D8="${D8:-$BUILD_TOOLS/d8}"

need() { [[ -x "$1" || -f "$1" ]] || { echo "Missing required tool: $1" >&2; exit 2; }; }
need "$AAPT2"; need "$D8"; need "$ZIPALIGN"; need "$APKSIGNER"; need "$PLATFORM"; need "$JAVA"; need "$JAVAC"
: "${DOPPELX_KEYSTORE:?Set DOPPELX_KEYSTORE to your private release keystore.}"
: "${DOPPELX_KEY_ALIAS:?Set DOPPELX_KEY_ALIAS.}"
: "${DOPPELX_STORE_PASSWORD:?Set DOPPELX_STORE_PASSWORD in the environment.}"
: "${DOPPELX_KEY_PASSWORD:?Set DOPPELX_KEY_PASSWORD in the environment.}"
[[ -f "$DOPPELX_KEYSTORE" ]] || { echo "Keystore does not exist: $DOPPELX_KEYSTORE" >&2; exit 2; }

rm -rf "$BUILD"
mkdir -p "$OUT" "$BUILD"/{res,gen,classes,dex,zip}

echo "▸ 1/7  aapt2 compile resources"
"$AAPT2" compile --dir "$APP/res" -o "$BUILD/res/resources.zip"

echo "▸ 2/7  aapt2 link"
"$AAPT2" link \
  -o "$BUILD/base.apk" \
  -I "$PLATFORM" \
  --manifest "$APP/AndroidManifest.xml" \
  --java "$BUILD/gen" \
  --min-sdk-version 23 \
  --target-sdk-version 34 \
  --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" \
  --auto-add-overlay \
  "$BUILD/res/resources.zip"

echo "▸ 3/7  javac"
mapfile -t JAVA_SOURCES < <(find "$APP/java" "$BUILD/gen" -name '*.java' -print | sort)
"$JAVAC" -source 8 -target 8 -encoding UTF-8 -nowarn \
  -bootclasspath "$PLATFORM" -classpath "$PLATFORM" \
  -d "$BUILD/classes" "${JAVA_SOURCES[@]}"

echo "▸ 4/7  d8 → dex"
mapfile -t CLASS_FILES < <(find "$BUILD/classes" -name '*.class' -print | sort)
"$D8" --release --min-api 23 --lib "$PLATFORM" --output "$BUILD/dex" "${CLASS_FILES[@]}"

echo "▸ 5/7  package assets + dex"
cp "$BUILD/base.apk" "$BUILD/zip/app.apk"
python3 - "$BUILD" "$APP" <<'PY'
import os, sys, zipfile
build, app = sys.argv[1], sys.argv[2]
out = os.path.join(build, 'zip', 'app.apk')
with zipfile.ZipFile(out, 'a', zipfile.ZIP_DEFLATED) as archive:
    for filename in sorted(os.listdir(os.path.join(build, 'dex'))):
        if filename.endswith('.dex'):
            archive.write(os.path.join(build, 'dex', filename), filename)
    assets = os.path.join(app, 'assets')
    for root, _, files in os.walk(assets):
        for filename in sorted(files):
            path = os.path.join(root, filename)
            archive.write(path, 'assets/' + os.path.relpath(path, assets))
print('packaged', out, os.path.getsize(out), 'bytes')
PY

echo "▸ 6/7  zipalign"
"$ZIPALIGN" -f -p 4 "$BUILD/zip/app.apk" "$BUILD/zip/app-aligned.apk"

echo "▸ 7/7  sign + verify"
APK="$OUT/doppelx-${VERSION_NAME}.apk"
"$APKSIGNER" sign \
  --ks "$DOPPELX_KEYSTORE" \
  --ks-key-alias "$DOPPELX_KEY_ALIAS" \
  --ks-pass env:DOPPELX_STORE_PASSWORD \
  --key-pass env:DOPPELX_KEY_PASSWORD \
  --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true \
  --out "$APK" "$BUILD/zip/app-aligned.apk"
"$APKSIGNER" verify --verbose --print-certs "$APK"

sha256sum "$APK" | tee "$APK.sha256"
echo "✓ Signed APK: $APK"
