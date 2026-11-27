# Contributing to DOPPEL X Identity Studio

Thank you for helping improve a transparent, offline-first QA tool.

## Before you start

1. Read [README.md](README.md), [SECURITY.md](SECURITY.md), and
   [docs/SECURITY_HARDENING.md](docs/SECURITY_HARDENING.md).
2. Keep contributions within the project’s authorised-QA boundary. Do not add
   account harvesting, third-party credential handling, stealth claims,
   enforcement evasion features, or unauthenticated network administration.
3. Never commit secrets, private keys, signing material, device profiles,
   databases, user exports, paid endpoints, or binaries.

## Development setup

```bash
git clone https://github.com/YOUR-ACCOUNT/doppelx-identity-studio.git
cd doppelx-identity-studio
npm install
npx playwright install chromium
npm test
```

## Contribution workflow

1. Create a focused branch from `main`.
2. Make one logical change per pull request.
3. Update documentation and tests with the code change.
4. Run:

   ```bash
   npm run verify:source
   npm test
   git diff --check
   ```

5. Explain the user-visible change, threat-boundary effect, and test output in
   the pull request description.

## Code guidelines

- Preserve offline-first behaviour in the Android app.
- Treat `android/app/assets/js/spoof.js` as the canonical runtime. Run
  `npm run sync:runtime` after modifying it; do not hand-edit its mirrors.
- Keep generated files out of Git unless the repository explicitly documents
  them as source.
- Use clear, deterministic data transformations where possible.
- Add a test for a bug fix; include a regression name that describes the
  previously broken behaviour.
- Avoid adding a dependency when native platform or standard-library code is
  sufficient.

## Pull-request checklist

- [ ] I have not included a key, token, password, user profile, database,
      binary, or machine-specific path.
- [ ] I ran `npm run verify:source`.
- [ ] I ran the affected automated tests.
- [ ] I updated docs and release notes where needed.
- [ ] I considered security and authorised-use implications.
- [ ] I agree to license my contribution under the MIT License.

## Reporting bugs

Use the bug-report issue template for reproducible non-security bugs. For a
security problem, follow [SECURITY.md](SECURITY.md) instead of opening a public
issue.
