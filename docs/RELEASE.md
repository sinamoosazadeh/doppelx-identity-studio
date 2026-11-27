# Release playbook

This repository publishes **source releases** by default. A production Android
binary must be built and signed by the maintainer who controls the release key.
Never commit the key, its password, an export containing credentials, or a
pre-signed binary back to the repository.

## 1. Preconditions

- Clean working tree on `main`.
- Node.js 20+ and npm 10+.
- Python 3.10+.
- For Android binaries: Android SDK platform `android-34`, build-tools `34.0.0`,
  JDK 17 recommended, and a trusted `bundletool.jar`.
- Your own release keystore in a secret location.
- A GitHub release tag such as `v3.2.1`.

## 2. Fresh-clone quality gate

```bash
git clone https://github.com/YOUR-ACCOUNT/doppelx-identity-studio.git
cd doppelx-identity-studio
npm ci
npx playwright install chromium
npm test
```

Then verify the source boundary again:

```bash
npm run verify:source
```

A passing result verifies source consistency; it does not replace human review
or Android-device testing.

## 3. Build a signed APK and AAB

Create the signing key yourself and store it outside this repository. Example:

```bash
keytool -genkeypair -v \
  -keystore /secure/path/your-release.jks \
  -storetype JKS \
  -alias doppelx-release \
  -keyalg RSA -keysize 4096 -validity 10950 \
  -dname "CN=Your Name, O=Your Organisation, C=DE"
```

Export signing variables from a secret manager or secure CI environment:

```bash
export ANDROID_HOME=/opt/android-sdk
export BUNDLETOOL=/opt/tools/bundletool.jar
export DOPPELX_KEYSTORE=/secure/path/your-release.jks
export DOPPELX_KEY_ALIAS=doppelx-release
export DOPPELX_STORE_PASSWORD='***'
export DOPPELX_KEY_PASSWORD='***'

./android/build.sh
./android/build-aab.sh
```

The scripts write the following ignored artefacts locally:

```text
android/dist/doppelx-<version>.apk
android/dist/doppelx-<version>.apk.sha256
android/dist/doppelx-<version>.aab
android/dist/doppelx-<version>.aab.sha256
```

Inspect signatures and archive content independently before publication. Keep
keystore backups offline and do not rotate a key after users have installed a
release unless you have a documented signing migration plan.

## 4. Produce the source archive

```bash
npm run archive:source
```

The command runs the source-boundary checks, creates a SHA-256 manifest, and
writes `release/doppelx-identity-studio-v<version>-source.zip`. Review the
archive with:

```bash
unzip -t release/doppelx-identity-studio-v<version>-source.zip
(
  cd release
  sha256sum -c doppelx-identity-studio-v<version>-source.sha256
)
```

## 5. GitHub release checklist

- [ ] All CI jobs on the release commit are green.
- [ ] `npm test` is green from a fresh clone.
- [ ] `npm run verify:source` is green.
- [ ] Review `git diff --check` and `git status --ignored` for accidental
      generated output or secrets.
- [ ] Review version parity: `android/version.properties`, manifest, engine,
      package metadata, and extension metadata.
- [ ] Confirm `LICENSE`, `NOTICE`, `SECURITY.md`, `CHANGELOG.md`, and release
      notes are current.
- [ ] Create and push a signed/annotated tag: `git tag -a vX.Y.Z -m "DOPPEL X X.Y.Z"`.
- [ ] Upload the source ZIP and its `.sha256` companion to the GitHub release.
- [ ] If shipping APK/AAB, upload only artifacts signed with your private key;
      record their SHA-256 checksums and signing certificate fingerprint.
- [ ] Test a signed APK manually on a real Android device before any wider
      distribution.

## 6. Rollback

Do not delete a published tag. Mark a faulty GitHub release as pre-release or
withdrawn, publish a clear advisory, then publish a corrected release with a
new version. Preserve checksums and release notes so downstream users can
identify affected builds.
