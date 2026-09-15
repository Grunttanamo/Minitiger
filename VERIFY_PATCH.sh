#!/usr/bin/env bash
set -euo pipefail

fail() { echo "[FAIL] $*" >&2; exit 1; }
ok()   { echo "[ OK ] $*"; }

[[ -f package.json ]] || fail "package.json fehlt – Patch im Repo-Root ausführen."
grep -q '"version": "12.1.0"' package.json || fail "Jellyfin-Web-Basis ist nicht 12.1.0."
ok "Jellyfin-Web-Basis 12.1.0 erkannt"

WF='.github/workflows/minitiger-plugin-release.yml'
[[ -f "$WF" ]] || fail "$WF fehlt"
grep -q '^name: Release Minitiger Virtual Sync Plugin' "$WF" || fail "Falscher Plugin-Release-Workflow"

grep -q 'ARCHIVE_NAME=Minitiger.VirtualSync_\$VERSION.zip' "$WF" || fail "ARCHIVE_NAME wird nicht gesetzt"
if grep -Eq '(^|[[:space:]])ZIP=' "$WF"; then
  fail "Reservierte Info-ZIP-Umgebungsvariable ZIP wird noch gesetzt"
fi
if grep -q '\$ZIP' "$WF"; then
  fail "Alte \$ZIP-Referenz ist noch vorhanden"
fi
ok "Reservierte ZIP-Variable vollständig entfernt"

grep -q 'zip -9 "\$RUNNER_TEMP/\$ARCHIVE_NAME"' "$WF" || fail "Archiv wird nicht mit ARCHIVE_NAME gebaut"
grep -q 'test -s "\$RUNNER_TEMP/\$ARCHIVE_NAME"' "$WF" || fail "Archiv-Existenzprüfung fehlt"
grep -q 'md5sum "\$RUNNER_TEMP/\$ARCHIVE_NAME"' "$WF" || fail "MD5 nutzt nicht ARCHIVE_NAME"
grep -q 'releases/download/\${TAG}/\${ARCHIVE_NAME}' "$WF" || fail "Source URL nutzt nicht ARCHIVE_NAME"
grep -q 'gh release create "\$TAG" "\$RUNNER_TEMP/\$ARCHIVE_NAME"' "$WF" || fail "GitHub Release nutzt nicht ARCHIVE_NAME"
ok "Release-Archivpfad ist in allen Schritten konsistent"

# Kleine lokale Regression: Info-ZIP reserviert die Variable ZIP. Mit ARCHIVE_NAME
# darf der Workflow-Ansatz trotzdem exakt am gewünschten Pfad erzeugen.
if command -v zip >/dev/null 2>&1; then
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  printf 'test\n' > "$tmp/plugin.dll"
  (
    cd "$tmp"
    export ARCHIVE_NAME='Minitiger.VirtualSync_test.zip'
    zip -q -9 "$tmp/$ARCHIVE_NAME" plugin.dll
  )
  [[ -s "$tmp/Minitiger.VirtualSync_test.zip" ]] || fail "Lokaler ARCHIVE_NAME-ZIP-Test fehlgeschlagen"
  ok "Lokaler ZIP-Pfadtest erfolgreich"
  rm -rf "$tmp"
  trap - EXIT
else
  echo "[WARN] zip lokal nicht installiert; nur Workflow-Textprüfung durchgeführt."
fi

branch=$(git branch --show-current 2>/dev/null || true)
if [[ "$branch" == "minitiger-v12.1" ]]; then
  ok "Branch minitiger-v12.1"
else
  echo "[WARN] Aktueller Branch ist '${branch:-unbekannt}', erwartet wird minitiger-v12.1."
fi

echo
echo "Phase 18.5.1 ist statisch verifiziert."
echo "Der echte GitHub Release-Workflow muss anschließend erneut mit 1.0.3.0 getestet werden."
