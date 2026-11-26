#!/usr/bin/env bash
# Create a reproducible, source-only ZIP from the committed tree.
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -n "$(git status --porcelain --untracked-files=all | grep -vE '^\?\? release/' || true)" ]]; then
  echo "Refusing to archive a dirty tree. Commit, stash, or remove changes first." >&2
  exit 2
fi

npm run verify:source

# shellcheck source=/dev/null
source android/version.properties
NAME="doppelx-identity-studio-v${VERSION_NAME}-source"
OUT_DIR="$ROOT/release"
STAGE="$OUT_DIR/.stage-$NAME"
ARCHIVE="$OUT_DIR/$NAME.zip"
MANIFEST="$OUT_DIR/$NAME.sha256"

rm -rf "$STAGE"
mkdir -p "$STAGE" "$OUT_DIR"
git archive --format=tar --prefix="$NAME/" HEAD | tar -xf - -C "$STAGE"
(
  cd "$STAGE/$NAME"
  find . -type f ! -name 'SHA256SUMS.txt' -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS.txt
)
rm -f "$ARCHIVE" "$MANIFEST"
(
  cd "$STAGE"
  zip -X -q -r "$ARCHIVE" "$NAME"
)
(
  cd "$OUT_DIR"
  sha256sum "$(basename "$ARCHIVE")" > "$(basename "$MANIFEST")"
)
unzip -t "$ARCHIVE" >/dev/null
rm -rf "$STAGE"

echo "✓ Source archive: $ARCHIVE"
echo "✓ SHA-256 file:  $MANIFEST"
