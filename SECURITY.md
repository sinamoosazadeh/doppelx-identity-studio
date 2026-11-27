# Security policy

## Supported release line

| Version | Supported |
|---|---|
| `3.2.x` | Yes |
| `< 3.2.1` public predecessor package | No public security support |

## Reporting a vulnerability

Please **do not** disclose an unpatched vulnerability in a public GitHub issue.

Until a dedicated security contact is configured, report it privately to the
repository owner through GitHub's private reporting feature (enable it in the
repository settings) or the contact address documented in the published GitHub
release. Include:

- a concise impact statement;
- affected file(s), version, Android/browser/device details;
- minimal reproduction steps or a proof of concept that does not target an
  unrelated third party;
- suggested remediation if available; and
- any relevant logs with secrets, personal data, and credentials removed.

A maintainer should acknowledge a valid report within seven days, share a
triage status within fourteen days, and coordinate a fix/advisory timeline with
the reporter. These are targets, not a legal service-level agreement.

## Scope

In scope:

- Android WebView navigation or JavaScript bridge exposure;
- unsafe persistence/export behaviour;
- accidental signing material or secret disclosure;
- supply-chain / build script defects;
- data validation issues that cause unsafe file handling;
- CI workflow vulnerabilities.

Out of scope:

- requests to bypass browser, account, payment, identity, or platform controls;
- vulnerabilities in a third-party browser, Android device, proxy, or service
  without a DOPPEL X-specific reproducer;
- social engineering or denial-of-service tests against infrastructure you do
  not own or lack written permission to test.

## Security design references

- [Security hardening and limitations](docs/SECURITY_HARDENING.md)
- [Public release boundary ADR](docs/ADR-001-PUBLIC-RELEASE-BOUNDARY.md)
- [Release playbook](docs/RELEASE.md)
