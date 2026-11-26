# ADR-001: Keep the public release offline and source-only

- **Status:** Accepted
- **Date:** 2026-11-26
- **Decision owners:** DOPPEL X maintainers

## Context

The reviewed predecessor archive bundled several materially different products:

1. an offline Android/Web profile-modelling studio;
2. browser-oriented export/runtime fixtures;
3. prebuilt Android binaries and a publicly recoverable signing key; and
4. a local network hub with administrative endpoints, a relay, persistent
   network credentials, and automated third-party network acquisition flows.

Those components had conflicting security and distribution assumptions. In
particular, a public package should not distribute a known signing key or
present an unauthenticated network-administration surface as a safe default.
The network component also conflicted with the Android app's offline/privacy
positioning and would require its own threat model, authentication model,
secret-storage design, consent/terms review, and separate test matrix.

## Decision

`v3.2.1` is a **public, source-only, offline-first release candidate**:

- It includes the Android application source, browser companion source, tests,
  documentation, selected visual assets, and display-only Termux:X11 guidance.
- It includes no APK/AAB, signature sidecar, keystore, password, device state,
  user profile, proxy credential, account, or network-harvesting source.
- The Android application has no `INTERNET` permission and no built-in network
  probe bridge.
- The old network/relay/harvesting component is excluded rather than silently
  shipped under a misleading privacy claim.
- Any future optional network integration must be a separately reviewed
  component with loopback-by-default binding, authentication, credential
  protection, explicit consent, rate/abuse controls, an independent security
  test suite, and documentation that accurately describes its network use.

## Consequences

### Positive

- The public repository has a simple, auditable security boundary.
- The Android privacy claim is testable from the manifest and source.
- No third party can sign an app with a known shared key from this repository.
- GitHub release contents are smaller, easier to review, and less likely to
  accidentally disclose user/device/network data.

### Trade-offs

- The public repository does not reproduce the excluded legacy network module.
- Users who need a networked integration must design or obtain one separately
  for their permitted environment, instead of expecting the app to provide it.
- The project should not claim a complete network-verification workflow until a
  future component passes its own security and product review.

## Revisit criteria

Revisit this decision only when a proposed integration has all of the
following: documented requirements, threat model, authenticated local API,
secret-at-rest strategy, consent UX, dependency/SBOM plan, deterministic mock
tests, abuse/terms review, and an independent security review.
