# Quality evidence

## Release identity

| Field | Value |
|---|---|
| Candidate | `v3.2.1` |
| Android version code | `321` |
| Package | `com.doppelx.studio` |
| Distribution form | Source-only GitHub release candidate |
| License | MIT |
| Release date | 2026-11-26 |

## Verified source baseline

The source archive used as input was integrity-checked before this repository
was prepared. Its internal manifest was fully verified, and its expanded
Android assets were compared to the assets packaged in the reviewed predecessor
APK. The previous source-level test baseline recorded successful engine, web,
Android preview, and local mock-relay suites.

Those historical checks establish provenance; they are not substituted for the
fresh v3.2.1 quality gate below.

## v3.2.1 quality gate

The following checks were run against the prepared v3.2.1 source on
2026-11-26. Browser E2E used Playwright Chromium; the Android APK/AAB was
built from this source with Android platform 34/build-tools 34 and a temporary
**non-production** test key kept outside this repository.

| Gate | Result | Evidence / limitation |
|---|---:|---|
| Source boundary/version/mirror/syntax | **PASS** | `verify:source`; 31 first-party JS/MJS files parsed |
| Web core | **60/60 PASS** | Deterministic engine and regression suite |
| Web UI | **33/33 PASS** | jsdom smoke suite; expected canvas implementation warnings are non-fatal test-environment limitations |
| Android asset E2E | **21/21 PASS** | Chromium against `android/app/assets` |
| Android preview E2E | **21/21 PASS** | Chromium against generated `android/dist/doppelx-preview.html` |
| Android APK compile/package | **PASS** | aapt2 → javac → d8 → zipalign → apksigner succeeded |
| APK signature schemes | **PASS** | temporary test APK verified with v1, v2, and v3 signatures |
| APK manifest assertion | **PASS** | package `com.doppelx.studio`, code `321`, name `3.2.1`, only `VIBRATE` permission listed |
| Android AAB compile/package | **PASS** | bundletool-built source AAB; `bundletool validate` passed |
| Production signing | **NOT CLAIMED** | production certificate must be created and controlled by the publisher |
| Fresh physical-device install of v3.2.1 | **NOT CLAIMED** | manual final smoke is required after the publisher signs an APK |

Re-run the automated commands below from a clean checkout after `npm ci` and
`npx playwright install chromium`:

```bash
npm run verify:source
npm run test:web:core
npm run build:web
npm run test:web:ui
npm run build:preview
npm run test:android
npm run test:android:preview
```

## What “QC passed” means here

When every automated gate above passes and the release checklist is completed,
the source package may be described as **source-verified / QC-passed**. It does
not mean mathematically defect-free, universally compatible, security-audited
by a third party, or authorised for a particular external service.

See [RELEASE.md](RELEASE.md) and [SECURITY_HARDENING.md](SECURITY_HARDENING.md)
for remaining responsibilities.
