# Integrated managed audit runner — first phone trial pending

This is an additive QA tool, NOT a production release or undetectability promise.
Original hub, database, account keys, source, profiles, zoom and X11 settings remain
untouched. No harvesting, provider rotation or proxy arming API is called.

## Use

First close the old experimental Chromium normally through its Exit menu. Once
all its windows are closed, Ctrl+C may stop its old waiting Node launcher. Do NOT
stop the hub or X11. Managed preflight refuses to launch if it can observe another
project browser in the established experimental or old session roots. Never start
old launchers in parallel: the managed lock only coordinates managed processes.
Android process visibility and external launchers limit enforcement guarantees.

From the extracted package directory:

- `node managed-runner.mjs --list`: read-only saved profile IDs and expected exits.
- `HEADED=0 node managed-runner.mjs --all`: sequential test of each saved profile.
- `HEADED=0 node managed-runner.mjs --profile prf_295f546cd0e8`: one full audit.
- `DISPLAY=:1 HEADED=1 node managed-runner.mjs --profile prf_295f546cd0e8 --open`:
  headed audit and keep the selected profile open. Close Chromium normally or use
  Ctrl+C in THIS managed launcher for context.close cleanup. No pkill is used.
- Add `--url https://...` with --open only for a target you intend to visit.
- `node managed-runner.mjs --export-reports`: offline ZIP export of generated JSON
  reports into Downloads. Review IP/device/profile-name metadata before sharing.

The managed runner retains ~/dx-experimental-sessions/<exact-id>, preserving the
existing EXPERIMENTAL cookies. It does not import old ~/dx-sessions cookies.
Reports are private JSON files under ~/dx-managed/reports. A global managed lock
is retained if context cleanup is unconfirmed. A stale lock is not auto-deleted;
contact the maintainer rather than risking simultaneous use of saved browser data.

## Tests performed per compatible profile

A Chrome-family session copy is bound to the installed Chromium version (UA,
appVersion, browser metadata and Chromium/Google Chrome UA-CH versions). Stored
profile remains unchanged. Duplicate identical brand entries are removed; GREASE
is retained. This is version consistency, not brand/OS authenticity certification.
Non-Chrome models or unknown version output stop rather than being silently
converted to another browser. The suspicious platform model remains flagged.

The existing runtime is hash-checked and its known module-import order issue is
fixed in memory. Credential-only runtime projection, four-realm observations,
current zoom/viewport observations, browser exit check and fresh third-party HTTPS
header echo run. Header or model disagreement remains a recorded failure. Other
independent tests can continue; this is NOT downgrading or clearing the failed gate.

When not --open, the main context closes and four sequential scratch context runs
measure storage separation/persistence. These are not real-profile isolation proof.
The --open mode does not run scratch storage while a user browser is active.

An exit mismatch or uncertain credential-object boundary prevents target navigation.
The scheduler must be stopped. One mutable relay still exists: do NOT re-arm it
while a browser is open. External/manual relay changes cannot be made atomic by a
launcher alone. In --all mode old profiles do NOT inherit the current IP: mismatches
are reported, not repaired by rewriting their identity. With only one provider
slot, several historical IP records are not several valid live connections.

## Honest limits

Strict language-header equality may still FAIL because Playwright locale sets
acceptLanguage to de-DE while JS reports de-DE,de. This is not proof of identity
leakage. It is not silently ignored or replaced by a green result.

Comprehensive WebRTC/packet/DNS leaks, proxy interruption with controlled-server
logs, service workers, cross-origin realms, TLS/HTTP2 fingerprints, all-surface
regression, exclusive residential IP reputation and OS-level separation remain
UNKNOWN. Overall reports are FAIL or INCOMPLETE while any gate fails or is unknown;
nonzero command exit is expected in that case. No headless/headed equivalence or
zero-leak guarantee is implied. --no-sandbox remains inherited and is a limitation.

Tests shipped in the repository include synthetic driver/process integration for
normal cleanup, exit mismatch, SIGINT, locking and reports; these are NOT phone
browser tests. Phone testing of this integrated runner is still required.
