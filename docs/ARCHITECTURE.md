# Architecture

## Product boundary

DOPPEL X Identity Studio is an offline-first modelling and QA application. Its
primary job is to create a structured test profile, validate internal
relationships, show those relationships in a visual studio, and export data or
fixtures selected by the user.

```text
┌──────────────────────────────────────────────────────────────────┐
│ Android native shell                                              │
│  MainActivity                                                     │
│  • bundles and loads local assets only                            │
│  • app-private persistence bridge                                │
│  • Storage Access Framework exports                              │
│  • no INTERNET permission in v3.2.1                              │
└──────────────────────────────┬───────────────────────────────────┘
                               │ DXBridge (narrow local interface)
┌──────────────────────────────▼───────────────────────────────────┐
│ Offline studio assets                                             │
│  catalog.js → engine.js → store.js → UI/screens                   │
│  • deterministic generation and repair                           │
│  • profile consistency audit                                     │
│  • local backup/export and visual QA lab                         │
└──────────────────────────────┬───────────────────────────────────┘
                               │ shared models / generated fixtures
┌──────────────────────────────▼───────────────────────────────────┐
│ Browser companion                                                 │
│  editable source • standalone build • core/UI regression tests    │
└──────────────────────────────────────────────────────────────────┘
```

## Source-of-truth rules

| Asset | Canonical source | Validation |
|---|---|---|
| Profile engine version | `android/app/assets/js/engine.js` | `scripts/verify-release.py` |
| Android app version | `android/version.properties` | Manifest and script parity check |
| Browser extension runtime | `android/app/assets/js/spoof.js` | `scripts/sync-runtime.mjs --check` |
| Embedded runtime string | generated from canonical runtime | `scripts/sync-runtime.mjs --check` |
| Browser companion bundle | `web/src/` | `node web/tools/build.js` |
| Android preview HTML | Android asset modules | `node android/tools/build-preview.mjs` |

No generated `dist/` output is committed. CI creates it when needed and the
release procedure records a checksum for an approved, user-signed binary.

## Android shell security model

The native shell uses `file:///android_asset/` because the app is a bundled
offline WebView product. JavaScript is necessary for the studio itself, so the
security design focuses on origin and bridge confinement:

1. only the bundled asset prefix can remain inside the WebView;
2. external `http`/`https` links, if any, are handed to the user-selected
   browser and never retain access to `DXBridge`;
3. `data:`, generic `file:`, `content:`, and other unsupported navigations are
   blocked;
4. file-to-file and file-to-network WebView access is disabled;
5. the bridge exposes only persistence, explicit local export/share, clipboard,
   haptic feedback, and an inert readiness hook;
6. backups, cleartext traffic, and app network access are disabled.

This is defence in depth, not a replacement for code review. Do not load
untrusted web content in the app WebView or add a bridge method without adding
a test and updating the threat model.

## Profile-data model

The engine’s coherent-profile model is useful for test fixtures because a small
set of anchors drives dependent fields:

```text
country / city ──► locale, time zone, daylight-saving offset
platform / device ──► display, DPR, touch model, hardware family
browser family ──► user-agent family, client hints, feature expectations
privacy preferences ──► application-level policy fields
```

The validator checks whether those generated fields agree. It is a **data
consistency** system; it is not an assertion that a real browser, network,
remote service, or person will be indistinguishable from the model.

## Deliberately excluded network component

The former network hub is not in this repository. Its exclusion and acceptance
criteria for a future separately reviewed integration are defined in
[ADR-001](ADR-001-PUBLIC-RELEASE-BOUNDARY.md).
