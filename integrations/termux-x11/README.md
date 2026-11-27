# Termux:X11 display integration

This optional integration documents the visual configuration verified during
pre-release QA on a high-DPI Android handset. It is intentionally limited to
**display ergonomics**. It does not launch a browser, configure a proxy, modify
profiles, or make network requests.

## Why a scaled X11 canvas can be the right choice

A profile with a mobile CSS viewport close to `407 × 904` may open in only a
small portion of a high-density native-resolution X11 desktop. Termux:X11 can
present a smaller logical X11 canvas scaled across the physical screen. For a
roughly `1220 × 2712` display, a 300% scale produces a logical canvas near
`407 × 904`, making a matching mobile viewport comfortably usable without
changing the profile's own dimensions or device-pixel-ratio values.

This is a user-interface choice, not a claim that it changes browser
fingerprinting or network behaviour.

## Prerequisites

1. Install Termux and the official Termux:X11 companion app from trusted
   sources.
2. Install the Termux X11 package and start the X11 app once.
3. Confirm the helper exists:

   ```bash
   command -v termux-x11-preference
   ```

## Apply the tested mobile display preset

```bash
cd integrations/termux-x11
chmod +x configure-display.sh
./configure-display.sh mobile-407x904
./configure-display.sh status
```

Expected relevant values:

```text
"displayResolutionMode"="scaled"
"displayScale"="300"
"fullscreen"="true"
"showAdditionalKbd"="true"
```

Restart the Termux:X11 server and the graphical application after changing a
resolution mode. If the Android soft keyboard covers important UI, dismiss it
with the Android Back gesture; the optional Termux:X11 extra-key bar remains
available.

## Restore native mode

```bash
./configure-display.sh native
```

## Scope and safety

- `termux-x11-preference` uses `key:value` syntax; `key=value` is not valid.
- Keep renderer compatibility flags device-specific. If a device requires
  Termux:X11's legacy renderer, choose that flag in your own X11 start command.
- This directory intentionally contains no user profile, target URL, account,
  credential, relay configuration, or device-specific launcher.
