#!/usr/bin/env bash
# =============================================================================
# DOPPEL X — reproducible signed Android App Bundle build (no Gradle required)
# =============================================================================
# See build.sh for the required SDK/JDK/signing environment variables.
# Additionally set BUNDLETOOL to a trusted bundletool.jar.
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
  JARSIGNER="$JAVA_HOME/bin/jarsigner"
else
  JAVA="$(command -v java)"
  JAVAC="$(command -v javac)"
  JARSIGNER="$(command -v jarsigner)"
fi

APP="$ROOT/app"
OUT="$ROOT/dist"
BUILD="$ROOT/build"
AAPT2="${AAPT2:-$BUILD_TOOLS/aapt2}"
D8="${D8:-$BUILD_TOOLS/d8}"
BUNDLETOOL="${BUNDLETOOL:?Set BUNDLETOOL to a trusted bundletool.jar.}"

need() { [[ -x "$1" || -f "$1" ]] || { echo "Missing required tool: $1" >&2; exit 2; }; }
need "$AAPT2"; need "$D8"; need "$PLATFORM"; need "$JAVA"; need "$JAVAC"; need "$JARSIGNER"; need "$BUNDLETOOL"
: "${DOPPELX_KEYSTORE:?Set DOPPELX_KEYSTORE to your private release keystore.}"
: "${DOPPELX_KEY_ALIAS:?Set DOPPELX_KEY_ALIAS.}"
: "${DOPPELX_STORE_PASSWORD:?Set DOPPELX_STORE_PASSWORD in the environment.}"
: "${DOPPELX_KEY_PASSWORD:?Set DOPPELX_KEY_PASSWORD in the environment.}"
[[ -f "$DOPPELX_KEYSTORE" ]] || { echo "Keystore does not exist: $DOPPELX_KEYSTORE" >&2; exit 2; }

rm -rf "$BUILD"
mkdir -p "$OUT" "$BUILD"/{bundle,res,gen,classes,dex}

echo "▸ 1/5  aapt2 link (proto)"
"$AAPT2" compile --dir "$APP/res" -o "$BUILD/res/resources.zip"
"$AAPT2" link --proto-format \
  -o "$BUILD/bundle/base-proto.apk" \
  -I "$PLATFORM" \
  --manifest "$APP/AndroidManifest.xml" \
  --java "$BUILD/gen" \
  --min-sdk-version 23 --target-sdk-version 34 \
  --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" \
  --auto-add-overlay \
  "$BUILD/res/resources.zip"

echo "▸ 2/5  compile Java sources → dex"
mapfile -t JAVA_SOURCES < <(find "$APP/java" "$BUILD/gen" -name '*.java' -print | sort)
"$JAVAC" -source 8 -target 8 -encoding UTF-8 -nowarn \
  -bootclasspath "$PLATFORM" -classpath "$PLATFORM" \
  -d "$BUILD/classes" "${JAVA_SOURCES[@]}"
mapfile -t CLASS_FILES < <(find "$BUILD/classes" -name '*.class' -print | sort)
"$D8" --release --min-api 23 --lib "$PLATFORM" --output "$BUILD/dex" "${CLASS_FILES[@]}"

echo "▸ 3/5  assemble base module"
mkdir -p "$BUILD/bundle/base"/{manifest,dex,assets}
python3 - "$BUILD" "$APP" <<'PY'
import os, shutil, sys, zipfile
build, app = sys.argv[1], sys.argv[2]
proto = os.path.join(build, 'bundle', 'base-proto.apk')
base = os.path.join(build, 'bundle', 'base')
with zipfile.ZipFile(proto) as archive:
    for name in archive.namelist():
        if name == 'AndroidManifest.xml':
            target = os.path.join(base, 'manifest', 'AndroidManifest.xml')
        elif name == 'resources.pb':
            target = os.path.join(base, 'resources.pb')
        elif name.startswith('res/'):
            target = os.path.join(base, name)
        else:
            continue
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with archive.open(name) as src, open(target, 'wb') as dst:
            shutil.copyfileobj(src, dst)
for filename in sorted(os.listdir(os.path.join(build, 'dex'))):
    if filename.endswith('.dex'):
        shutil.copy(os.path.join(build, 'dex', filename), os.path.join(base, 'dex', filename))
assets = os.path.join(app, 'assets')
for root, _, files in os.walk(assets):
    for filename in sorted(files):
        source = os.path.join(root, filename)
        target = os.path.join(base, 'assets', os.path.relpath(source, assets))
        os.makedirs(os.path.dirname(target), exist_ok=True)
        shutil.copy(source, target)
print('module ready')
PY

python3 - "$BUILD" <<'PY'
import os, sys, zipfile
build = sys.argv[1]
base = os.path.join(build, 'bundle', 'base')
out = os.path.join(build, 'bundle', 'base.zip')
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as archive:
    for root, _, files in os.walk(base):
        for filename in sorted(files):
            path = os.path.join(root, filename)
            archive.write(path, os.path.relpath(path, base))
print('base.zip', os.path.getsize(out), 'bytes')
PY

echo "▸ 4/5  build bundle"
AAB="$OUT/doppelx-${VERSION_NAME}.aab"
rm -f "$AAB"
"$JAVA" -jar "$BUNDLETOOL" build-bundle \
  --modules="$BUILD/bundle/base.zip" \
  --output="$AAB" \
  --config="$ROOT/bundle-config.json"

echo "▸ 5/5  sign + verify"
"$JARSIGNER" \
  -keystore "$DOPPELX_KEYSTORE" \
  -storepass:env DOPPELX_STORE_PASSWORD \
  -keypass:env DOPPELX_KEY_PASSWORD \
  -sigalg SHA256withRSA -digestalg SHA-256 \
  "$AAB" "$DOPPELX_KEY_ALIAS"
# A developer/Play-upload certificate is normally self-signed, so `-strict`
# would turn that expected trust-chain warning into a false build failure.
# Verify structural signatures here; Android distribution verifies trust through
# the platform/Play signing flow.
"$JARSIGNER" -verify -certs "$AAB"
sha256sum "$AAB" | tee "$AAB.sha256"
echo "✓ Signed AAB: $AAB"
