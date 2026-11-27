# Experimental privacy audit components

An experimental wrapper and evidence tools; not a production replacement or anonymity certification.

Run: `node --test tools/privacy-audit/*.test.mjs`

`gates.mjs` aggregates scoped measurement statuses. It does not perform the tests.
`runtime-boundary.mjs` projects a JSON profile onto explicit runtime-consumed
fields. It excludes persona, identity labels and upstream proxy credentials;
network.webrtc and network.connection remain. The original input is not mutated.
No profile version, brand, platform, permissions or graphics settings are repaired.
No global markers are hidden and no browser API behavior is modified here.

Unknown fields are intentionally not serialized. This is only safe to integrate
after matching the exact runtime dependency inventory: otherwise a newer runtime
could need an unreviewed field. Null/undefined optional fields are omitted. Invalid
known field types throw rather than coercing or silently disabling behavior.
Allowlists prevent unknown-field copying, not secrets intentionally placed in an
allowed string. Synthetic canary checks do not prove arbitrary data noninterference.

Tests cover credential canaries, nested arrays, non-mutation, type errors, accessors,
prototype keys, a static dot-access dependency tripwire, and generated JSON profile
fixtures across five platform options. These are NOT five device/browser tests.
The regex tripwire cannot prove coverage of computed property access or future code.

Important source mismatch:
- User-reported phone spoof.js SHA256:
  708fa6ccbf6dbedfeabddd7450dc34ec5f7c9729be5cff0eeb0de241bfa4b392
- Current repository spoof.js SHA256:
  48cc3a24a976312892cb313d59e9dc08cf4d1b529a71db4d8c500208efba3b13

The complete attached phone runtime has now been compared: only the two version
comment lines differ; executable code is identical. The archived launcher also
matches the phone-reported hash exactly. This is source comparison, not a phone
browser test.

## Experimental wrapper

`phone-experimental.mjs` reads the existing launcher and runtime and refuses to run
if either known hash differs. It projects runtime data before browser serialization,
uses an exact profile ID, redacts the upstream log, and checks that persona/proxy
objects are absent from the page payload. No globals are hidden; no UA, hints,
graphics, WebRTC or other runtime APIs are changed by the adapter.

It uses `~/dx-experimental-sessions/<profile-id>` instead of the original session
root. Existing cookies are deliberately NOT imported or deleted. This is a separate
persistent test environment, not a replacement for the original saved session.
Do not run concurrent experiments. Keep other project browsers closed while changing
the shared relay. The original launcher's error handling remains and is not a
comprehensive process-cleanup or session-lock implementation.

The wrapper retains --url/--keep and HEADED behavior, but --allow-direct is rejected
for this controlled test. This experimental safety restriction is NOT represented
as full feature equivalence or a final release. No service workers or full storage
isolation gates have been passed. Original exports and extension paths remain
unmodified and may still carry the original credential exposure.

Expected invocation on the reviewed phone, with hub and selected relay running:
`HEADED=0 node phone-experimental.mjs --profile prf_295f546cd0e8`

If hashes differ, stop and inspect; do not bypass the check. Never paste credentials
into a command or issue report. Review logs before sharing. The final scoped message
does not certify all-realm secrecy, anonymity or absence of network leakage.

## v2 realm diagnostic

The v2 wrapper runs selected navigator/UA-CH and named credential-object checks
in main, blank iframe, classic Blob worker and module Blob worker. Errors and
timeouts are explicit; a non-PASS gate closes the context and stops the scoped run.
No additional external test site is contacted: probes run on the existing trace
page. CSP or worker/runtime compatibility may cause an incomplete result.
An iframe navigator is read from the parent; this is not an independent arbitrary
iframe-script execution test. Equality of reported values does not prove that
values are native/authentic. It is not a server-side header measurement.
The same experimental session root is retained across v1/v2, not the original root.

## v3 module-order experiment

The user-run v2 audit passed named credential-object checks but failed module
Blob worker parity. The module worker reported Linux x86_64 and different UA-CH
and languages; this is not proof that the physical phone is x86_64 or that its real
IP leaked. Existing static import executes module dependencies before the bootstrap
body, regardless of its textual position. This accounts for a target observing
pre-installation values even with the profile global already set in the worker.

v3 changes exactly the reviewed module bootstrap return line, in memory, to
`await import(...)` after initialization. No changes to the original runtime file,
classic importScripts path, SharedWorker constructor path, stored UA/brands,
platform model, or other surface settings. Module SharedWorker behavior is not
yet phone-tested. CSP, async import errors, top-level await and worker startup
behavior still require operational regression tests; a unit test is not enough.

Native Node ES module tests reproduce the pre-bootstrap static-import observation
and verify ordered dynamic-import observation. They do NOT simulate Android worker
loading, browser security policies or the complete runtime installation. Run the
same four-realm phone audit to evaluate the attempted fix. Global markers remain
and cannot be treated as undetectable. Model 156/native engine 158 remains unresolved.
