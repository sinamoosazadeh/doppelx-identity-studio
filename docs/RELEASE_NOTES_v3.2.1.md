# DOPPEL X Identity Studio v3.2.1

**Release type:** source-only public release candidate
**Date:** 2026-11-26
**License:** MIT

## Highlights

This release turns the reviewed v3.2.0 source package into a clean,
GitHub-ready, source-only project with a defensible public-release boundary.

### Security and privacy hardening

- Removed the Android `INTERNET` permission and unused in-app proxy probe.
- Disabled Android backups and cleartext traffic.
- Enabled WebView Safe Browsing and restricted the WebView to bundled assets.
- Disabled mixed content, content access, and file-to-network/file-to-file
  access in the WebView.
- Narrowed the JavaScript bridge to local app features only.
- Replaced collision-prone persistence file names with SHA-256-derived names.
- Corrected Storage Access Framework output handling to use `OutputStream`.

### Supply-chain and release engineering

- Removed prebuilt APK/AAB artifacts, APK sidecars, the legacy keystore, and
  embedded signing credentials from the public tree.
- Replaced hard-coded local build paths with portable environment-driven build
  scripts.
- Require a maintainer-owned keystore and passwords supplied through the
  environment for APK/AAB output.
- Added a canonical version file, version-parity checks, source-boundary tests,
  runtime-mirror generation, source manifest generation, and source archive
  tooling.
- Added GitHub Actions CI, CodeQL, Dependabot, issue templates, contribution,
  conduct, and security policies.

### Documentation and product presentation

- Added a polished GitHub README, architecture document, security limits,
  release playbook, quality evidence, provenance record, and an explicit public
  release boundary ADR.
- Added a display-only Termux:X11 helper and documentation for a high-DPI mobile
  canvas near `407 × 904`.
- Included a curated visual asset set and product screenshots.

## Breaking/package changes

- The former unauthenticated network/relay/harvesting component is not included
  in this public release. Its removal is intentional and documented in
  [ADR-001](ADR-001-PUBLIC-RELEASE-BOUNDARY.md).
- The repository no longer ships any binary. Build a signed APK/AAB locally
  using your own protected key as described in [RELEASE.md](RELEASE.md).
- Generated outputs (`android/dist/`, `android/build/`, `web/doppel.html`) are
  ignored and must not be committed.

## Upgrade guidance from v3.2.0

1. Do not copy a predecessor keystore, password, compiled artifact, user
   profile, or local database into this repository.
2. Create a new signing key under your own control for a public release.
3. Install dependencies with `npm ci`, run the full quality gate, then build
   artifacts locally.
4. Re-check every user-created export in its own authorised test environment.

## Known limits

See [SECURITY_HARDENING.md](SECURITY_HARDENING.md). In particular, profile
consistency is not a claim of browser/network indistinguishability or a licence
to bypass third-party controls.
