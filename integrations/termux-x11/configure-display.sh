#!/data/data/com.termux/files/usr/bin/bash
# Configure only Termux:X11 display usability. This script never starts a
# browser, changes proxy settings, or reads/writes DOPPEL X profiles.
set -Eeuo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./configure-display.sh mobile-407x904  # tested high-DPI mobile scaling
  ./configure-display.sh native          # restore native X11 resolution
  ./configure-display.sh status          # print relevant Termux:X11 settings

Termux:X11's helper accepts key:value arguments (not key=value).
EOF
}

command -v termux-x11-preference >/dev/null 2>&1 || {
  echo "Missing termux-x11-preference. Install/configure Termux:X11 first." >&2
  exit 2
}

case "${1:-status}" in
  mobile-407x904)
    termux-x11-preference \
      'displayResolutionMode:scaled' \
      'displayScale:300' \
      'fullscreen:true' \
      'showAdditionalKbd:true'
    ;;
  native)
    termux-x11-preference \
      'displayResolutionMode:native' \
      'fullscreen:true' \
      'showAdditionalKbd:true'
    ;;
  status)
    termux-x11-preference list | grep -E 'displayResolutionMode|displayScale|fullscreen|showAdditionalKbd' || true
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac
