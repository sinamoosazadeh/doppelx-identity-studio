# Provenance and release boundary

This repository was prepared from the user-authorized DOPPEL X v3.2.0 source
archive and its accompanying device-side validation work on 26 November 2026.
The original archive remains unchanged as historical input; this repository is
the new, source-only v3.2.1 release candidate.

## What was independently checked before this repository was prepared

- The source archive passed its own complete SHA-256 manifest verification.
- The expanded Android assets matched the assets packaged in the reviewed APK.
- Source-level suites previously completed successfully for the profile engine,
  web companion, Android preview, and local mock relay.
- A headed Termux:X11 smoke session was completed on a real Android device with
  the UI scaling documented in `integrations/termux-x11/README.md`.

## Deliberate public-release changes

- No APK, AAB, APK signature sidecar, or private signing material is included.
- The Android shell now requests no network permission, disables backups, blocks
  cleartext traffic, enables WebView Safe Browsing, restricts the WebView to
  bundled assets, and narrows its JavaScript bridge.
- Legacy build scripts with embedded passwords and workstation-specific paths
  were replaced by portable scripts that require release signing values from the
  caller's environment.
- The former unauthenticated network/relay/harvesting component is **not part
  of this public source package**. See `docs/ADR-001-PUBLIC-RELEASE-BOUNDARY.md`.

The claims above document review scope. They are not a promise that all future
uses, devices, dependencies, browsers, or user-created profiles will be free
of defects. Re-run the checks in `docs/RELEASE.md` before every release.
