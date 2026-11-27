# Legacy phone hardening: additive, evidence-based work

Status: design and standalone evidence gates only. NOT a phone patch or release.
The public offline 3.2.1 runtime is not the legacy phone hub. Do not replace the
phone tree with this repository or silently import its credentials/network runtime.

## Observed baseline (user-run, 2026-11-27)

Profile prf_295f546cd0e8 has a dedicated persistent directory. Browser exit matched
the stored exit on Cloudflare. Main page, blank iframe and classic Blob worker
reported equal selected navigator/UA-CH fields. This is not comprehensive parity.
The page could access the injected profile and its persona/proxy credential field
names. Nonempty credential values and actual exfiltration were NOT measured.
Chromium binary 158 differs from model 156; duplicate Chrome brands are present.
Mobile formFactors was correct in this particular test. No undetectability claim.

## Preservation contract

Keep existing launcher, source, database, stored profiles, session directories,
relay and scheduler configuration untouched during preparation. Use a separately
named experimental launcher and a separately located copy of the test session;
copy only with the browser closed. Never run two processes on one user-data-dir.
Do not stop unrelated processes, recycle provider slots, or rotate credentials
without explicit approval. A server-side deletion is not reversible by DB backup.

Inventory and test existing useful behavior: explicit profile selection, persistent
storage, relay routing, exit mismatch rejection, locale/timezone/display/touch,
UA/UA-CH, iframe and worker behavior, canvas/audio/geometry, graphics, geolocation,
permissions, media and speech. Exports, UI, harvesting and scheduling remain
unchanged; they are not silently reimplemented by a browser launcher.
No claimed preservation until the relevant behavior has a baseline and retest.
Secret exposure is a defect, not a feature to preserve.

## Proposed data boundary (not implemented)

Build a reviewed field-level runtime schema, not a recursive blacklist. Exclude
persona, credentials and upstream connection configuration before any browser
serialization; retain only individually audited surface configuration. Merely
deleting globals after injection is insufficient: worker closures and installation
paths must also be audited. Preserve intended behavior using closure-scoped data;
verify page/frame/worker cannot obtain connection secrets. Do not print secrets.
Do not blindly alter stored model version numbers to disguise engine differences.

## Required gates

Each result is PASS, FAIL, UNKNOWN or UNSUPPORTED, with measurement scope and time.
Missing results, swallowed errors and short timeouts are never passes.

- exit-ip: browser-observed exit equals intended exit, including after navigation.
- secret-boundary: synthetic canary secrets absent from page-accessible runtime
  data across tested realms; no real credentials sent to third-party test pages.
- realm-parity: main, blank/same-origin/cross-origin iframe, classic/module worker,
  SharedWorker and Service Worker tested separately. Equality is not authenticity.
- server-headers: controlled HTTPS server receives headers and opt-in high entropy
  hints; compare them with JS. Request interception alone is not server evidence.
- storage-isolation: controlled origin canaries in cookies, localStorage, IndexedDB,
  Cache Storage and service worker state do not cross test profiles.
- storage-persistence: own canaries survive close/reopen in the same profile.
- proxy-failure: approved deliberate relay interruption, controlled destination
  logs and no direct fallback; restore only the explicitly selected connection.
- webrtc: record errors, ICE completion, candidates and approved STUN observations;
  API result filtering alone cannot prove absence of outbound network packets.
- capability-regression: before/after behavior matrix; unsupported remains explicit.

The evaluator in tools/privacy-audit does not perform or certify these measurements.
It does not persist supplied evidence or include raw credential data in its report.
Run its synthetic tests: `node --test tools/privacy-audit/gates.test.mjs`.

## Research, sources and limitations

Direct retrieval of MDN worker/client-hints guides and Playwright API webpage failed
in this environment. No claim of exhaustive Internet review is made.
Official Playwright source documentation was retrieved through GitHub:
https://github.com/microsoft/playwright/blob/main/docs/src/api/class-browsercontext.md
Sections read: context introduction and addInitScript. It documents initialization
on page navigation and child frame attachment/navigation, and undefined ordering
between multiple context/page init scripts. It does not promise worker injection.
A replacement should use one ordered initialization payload, test workers separately,
and never mistake successful page injection for all-realm coverage. Current main
source may differ from the phone's installed version; version-specific review remains.

## Next deliverable

A separately named experimental launcher, prepared only after obtaining the full
local runtime source and its dependency surface safely. Review allowlisted fields,
error cleanup in finally, exact-ID selection, session locks, redacted logging and
regression tests before any phone execution. This document and unit tests do not
constitute that launcher, a fixed phone installation, or operational security proof.

## Progress after exact phone source attachment

The 1027-line phone runtime attachment matches its recorded SHA256. Full diff with
repository runtime shows only two version-comment lines differ. Archived launcher
source matches the recorded phone launcher hash. `phone-experimental.mjs` now wraps
that exact launcher in memory, applies runtime projection and exact-ID selection,
redacts upstream logging and adds a scoped page-payload boundary check. It uses a
separate experimental session root, not a copy of existing browser data. No phone
execution is claimed. Runtime globals and existing model defects intentionally
remain visible; this is a credential-boundary experiment, not the completed plan.
