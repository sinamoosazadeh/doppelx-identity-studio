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

## v4 optional server-header measurement

User-run v3 passed selected parity and named credential-object gates in the four
realms. This does not remove the duplicated Chrome brand or native/model version
mismatch and is not an all-realm or no-leak certification.

Invoke v4 with `--headers` to navigate the existing test page to a nonce-tagged
https://httpbin.org/anything/doppelx-audit request. It checks the fresh HTTPS echo
and compares selected received low-entropy headers with JavaScript on that page.
Only approved headers are logged; cookie/authorization headers are removed from
the diagnostic request via a temporary route, removed afterwards. No identifying
profile ID is put in the request URL. The third party sees the exit and browser
request metadata. Intermediaries/echo infrastructure may transform headers; this
is evidence of the observed path, not necessarily a browser-only defect.

High-entropy headers are printed only if present, not requested via a controlled
Accept-CH server. They are NOT included in the low-entropy comparison gate.
Missing echo/headers and unexpected responses are UNKNOWN, not PASS. A non-PASS
header gate closes the experimental browser. It does not rotate the proxy, change
credentials, repair brands or modify persistent profiles. No TLS fingerprint,
HTTP/2 fingerprint, WebRTC or storage isolation verdict follows from this probe.

## v5 session-brand repair and request observations

User-run v4 confirmed UA/mobile/platform agreement at the echo endpoint, but strict
language-list equality and brand-list equality failed. The original launcher builds
Sec-CH-UA from only the first two entries, while JS used four (including duplicate
Google Chrome). This is a known launcher/model mismatch. Accept-Language reduction
alone is not proof of leakage or even invalid browser behavior. The strict gate is
kept unchanged but its security interpretation is explicitly limited.

v5 deduplicates identical brand/version entries in an in-memory session copy and
serializes ALL remaining brands to Sec-CH-UA; differing versions for one brand stop
execution. The stored profile and UA/model versions are NOT changed. GREASE is not
removed. No surface feature is disabled. The actual native/model version discrepancy
and platform string remain unresolved. Full high-entropy server CH is not tested.

Header reports now include allowlisted observations from before route.continue and
Playwright's request.allHeaders alongside the echo response and JS. These are not
packet captures and cannot by themselves identify every intermediary rewrite. The
planned Accept-Language remains unchanged; no API is patched to force a green test.
The diagnostic route continues stripping credential/cookie headers as in v4.

Original experimental session data remains in ~/dx-experimental-sessions. Existing
original launcher/export/extension paths are NOT repaired by this experiment.

## v6 sequential storage canaries and exact-version source review

User reports playwright-core 1.65.1. Official v1.65.1 Chromium implementation was
retrieved through GitHub and reviewed around _updateUserAgent (1097-1103):
https://github.com/microsoft/playwright/blob/v1.65.1/packages/playwright-core/src/server/chromium/crPage.ts#L1097-L1103
It sends acceptLanguage: options.locale. This supports the observed de-DE header;
it does not independently prove the installed package has no local modifications.
No language setting or equality gate was changed. Strict language equality remains
unresolved; running another independent gate does not certify it.

`--storage` runs AFTER the main experimental context closes. Four sequential
launches (A, B, A, B) use two NEW persistent directories, identical launch settings
and the same sanitized init script. A locally fulfilled synthetic HTTPS origin
is used; its canary page does not require a real external DNS/TLS server. Each
context closes before the next opens. Unique canaries measure localStorage,
persistent JavaScript cookie, IndexedDB and Cache Storage write/read, separation
and close/reopen persistence. Missing APIs/errors/timeouts are not passes.

This is a mechanism-level scratch test, NOT proof for existing saved profiles,
service workers, browser HTTP cache, OS-level isolation, or atomic proxy switching.
The generated run directory under ~/dx-storage-audits is retained and printed;
no existing profile or session directory is opened or deleted by this subtest.
Browser startup may still have background networking; no no-network claim is made.
The wrapper still first contacts Cloudflare for exit verification. With --storage
alone, httpbin is not contacted and the header gate is not run or cleared.

Use: `HEADED=0 node phone-experimental.mjs --profile prf_295f546cd0e8 --storage`
Do not combine with --keep. The result is separate STORAGE AUDIT output.
Unit tests of the sequencing driver are synthetic; phone results remain required.
