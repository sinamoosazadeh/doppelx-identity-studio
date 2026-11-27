#!/usr/bin/env python3
"""Offline release-boundary and version-consistency checks."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from source_archive_check import validate_source_zip

ROOT = Path(__file__).resolve().parent.parent


def fail(message: str) -> None:
    print(f"✗ {message}", file=sys.stderr)
    raise SystemExit(1)


def text(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def version_properties() -> dict[str, str]:
    values: dict[str, str] = {}
    for line in text("android/version.properties").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key] = value
    return values


props = version_properties()
name = props.get("VERSION_NAME")
code = props.get("VERSION_CODE")
if not name or not code:
    fail("android/version.properties must define VERSION_NAME and VERSION_CODE")

manifest = text("android/app/AndroidManifest.xml")
engine = text("android/app/assets/js/engine.js")
root_package = json.loads(text("package.json"))
web_package = json.loads(text("web/package.json"))
extension = json.loads(text("web/doppel-extension/manifest.json"))

checks = {
    "manifest versionName": f'android:versionName="{name}"' in manifest,
    "manifest versionCode": f'android:versionCode="{code}"' in manifest,
    "engine version": f"const VERSION = '{name}'" in engine,
    "root package version": root_package.get("version") == name,
    "web package version": web_package.get("version") == name,
    "extension version": extension.get("version") == name,
    "backup disabled": 'android:allowBackup="false"' in manifest,
    "internet permission absent": "android.permission.INTERNET" not in manifest,
    "cleartext disabled": 'android:usesCleartextTraffic="false"' in manifest,
}
for label, ok in checks.items():
    if not ok:
        fail(label)

forbidden_suffixes = {".apk", ".aab", ".idsig", ".jks", ".keystore", ".p12", ".pem", ".key"}
allowed_binary_images = {".png", ".jpg", ".jpeg", ".svg"}
generated_parts = {".git", "node_modules", "build", "dist", "release", "coverage", "test-results", "__pycache__"}
archive_manifest_path = ROOT / 'downloads' / 'source-manifest.json'
archive_manifest = json.loads(archive_manifest_path.read_text()) if archive_manifest_path.is_file() else {}
for file in ROOT.rglob("*"):
    if not file.is_file() or generated_parts.intersection(file.relative_to(ROOT).parts):
        continue
    if file.suffix.lower() in forbidden_suffixes:
        fail(f"source-only repository contains prohibited release/secret artefact: {file.relative_to(ROOT)}")
    if file.suffix.lower() in allowed_binary_images:
        continue
    try:
        if file.parent == ROOT / 'downloads' and file.suffix == '.zip':
            contents = '\n'.join(validate_source_zip(file, archive_manifest.get(file.name)))
        else:
            contents = file.read_text(encoding="utf-8")
    except (ValueError, OSError) as error:
        fail(f"invalid source file/archive: {file.relative_to(ROOT)} ({type(error).__name__})")
    legacy_password_marker = "doppelx-" + "2026"
    legacy_keystore_marker = "doppelx-" + "release.jks"
    if legacy_password_marker in contents or legacy_keystore_marker in contents:
        fail(f"legacy public signing material reference: {file.relative_to(ROOT)}")
    machine_path_marker = "/home/" + "user/"
    if machine_path_marker in contents:
        fail(f"machine-specific path: {file.relative_to(ROOT)}")

# Generated runtime must match its canonical source. The Node sync check gives a
# useful path-level error; this is a cheap independent guard for release scripts.
canonical = text("android/app/assets/js/spoof.js")
if text("web/doppel-extension/spoof.js") != canonical:
    fail("extension spoof runtime is not synchronized")
embedded = text("android/app/assets/js/spoof-src.js")
if json.dumps(canonical, ensure_ascii=False) not in embedded:
    fail("embedded spoof runtime is not regenerated")

print(f"✓ release boundary: source-only, version {name} ({code}), no legacy signing material")
