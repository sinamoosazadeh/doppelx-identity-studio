# Security hardening and known limits

## Security posture of v3.2.1

This is a source-only release designed to be easy to inspect before a maintainer
signs a binary with their own key.

| Area | v3.2.1 decision |
|---|---|
| Android network | No `INTERNET` permission; the bundled app has no in-app network probe |
| Cleartext | `android:usesCleartextTraffic="false"` |
| Backup | `android:allowBackup="false"` |
| WebView navigation | Bundled assets only; external HTTP(S) opens outside the app WebView |
| WebView hardening | Safe Browsing enabled; mixed content, content access, and file-to-network access disabled |
| JS bridge | Local persistence, explicit export/share, clipboard, haptics, readiness only |
| Persistence names | SHA-256-derived file names rather than `hashCode()`-derived names |
| Document export | Uses `OutputStream`, which works with Storage Access Framework providers |
| Signing | No key, password, or prebuilt binary in source control |
| CI | Syntax, mirror consistency, source-boundary checks, tests, CodeQL, Dependabot |

## What this project does **not** guarantee

No tool in this repository can truthfully guarantee any of the following:

- anonymity, invisibility, or immunity from browser/service detection;
- changing TLS, TCP/IP, GPU-driver, font-rasterisation, kernel, cellular,
  account-reputation, behavioural, payment, or identity-verification signals;
- correctness of any user-supplied network endpoint, location, address,
  credential, or third-party policy decision;
- compatibility with a particular website, automation platform, device, or
  browser version;
- authorisation to use an exported fixture on any third-party service.

The profile audit checks relationships in data. Treat it as a QA tool and
verify real behaviour only in a system you own or are authorised to test.

## Data handling

The Android app stores user-created profile data in its app-private directory.
That is isolated from other ordinary apps, but it is not a substitute for
full-device encryption, a lock screen, secure backups, or appropriate data
classification. Avoid storing secrets or third-party credentials in profiles.
Use the device's encryption and delete/export data intentionally.

The project makes no automatic app network requests in v3.2.1. User-generated
exports are code or data files; their behaviour depends on where a user runs
them and is outside the Android app's network boundary.

## Maintainer rules

Before merging a feature that affects WebView, exports, persistence, build,
or networking:

1. add or update an automated test;
2. document the trust boundary and user-visible effect;
3. do not add a secret, key, token, account, endpoint credential, or device
   profile to the repository;
4. do not weaken asset-origin navigation or the narrow JavaScript bridge;
5. if network access is proposed, create a separate ADR and security review;
6. run the full release quality gate in `docs/RELEASE.md`.

## Reporting a vulnerability

Please follow [SECURITY.md](../SECURITY.md). Do not open a public issue for an
unpatched vulnerability.
