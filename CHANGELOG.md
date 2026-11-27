# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project uses [Semantic Versioning](https://semver.org/).

## [3.2.1] - 2026-11-26

### Added

- GitHub-ready repository structure, CI, CodeQL, Dependabot, policies, release
  playbook, quality documentation, source archive tooling, and visual assets.
- Portable Android signing flow driven by caller-owned environment secrets.
- Deterministic canonical-runtime mirror generator and verification gate.
- Optional display-only Termux:X11 configuration helper/documentation.

### Changed

- Converted the distribution to a source-only public release candidate.
- Hardened Android backup, cleartext, WebView navigation, JavaScript bridge,
  persistence filename, and Storage Access Framework handling.
- Centralised release version metadata as `3.2.1` / Android code `321`.

### Removed

- Prebuilt APK/AAB/idsig artifacts, legacy keystore, embedded passwords,
  machine-specific build paths, and duplicate generated release files.
- The previous unauthenticated network/relay/harvesting component from the
  public distribution; see `docs/ADR-001-PUBLIC-RELEASE-BOUNDARY.md`.

## [3.2.0] - 2026-11-26

Historical reviewed source baseline from which the source-only public release
was prepared. It is documented for provenance rather than republished as a
production-ready public binary release.
