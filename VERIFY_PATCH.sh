#!/usr/bin/env bash
set -euo pipefail

fail() { echo "[FAIL] $*" >&2; exit 1; }
ok()   { echo "[ OK ] $*"; }

[[ -f package.json ]] || fail "package.json fehlt – Patch im Repo-Root ausführen."
grep -q '"version": "12.1.0"' package.json || fail "Jellyfin-Web-Basis ist nicht 12.1.0."
ok "Jellyfin-Web-Basis 12.1.0 erkannt"

required=(
  README.md
  docs/assets/minitiger-banner.gif
  docs/assets/minitiger-banner.png
  .github/workflows/minitiger-sidecar.yml
  .github/workflows/minitiger-package-metadata.yml
  SIDECAR_SETUP.md
)
for f in "${required[@]}"; do
  [[ -f "$f" ]] || fail "$f fehlt"
done
ok "README, Banner und Workflows vorhanden"

file docs/assets/minitiger-banner.gif | grep -q 'GIF image data' || fail "Banner-GIF ist kein echtes GIF"
file docs/assets/minitiger-banner.png | grep -q 'PNG image data' || fail "Banner-PNG ist kein PNG"
ok "Banner-Dateien plausibel"

grep -q 'minitiger-banner.gif' README.md || fail "GIF-Banner fehlt in README"
grep -q 'ghcr.io/grunttanamo/minitiger-web:latest' README.md || fail "README Quick Start fehlt"
grep -q 'GPL-2.0-or-later' README.md || fail "README Lizenzhinweis fehlt"
ok "Neue Minitiger README plausibel"

if grep -q -- "- 'README.md'" .github/workflows/minitiger-sidecar.yml; then
  fail "README.md darf den langen Sidecar-Build nicht mehr triggern"
fi
if grep -q -- "- 'docs/\*\*'" .github/workflows/minitiger-sidecar.yml; then
  fail "docs/** darf den langen Sidecar-Build nicht triggern"
fi
ok "README/Doku triggern keinen Full Sidecar Build"

grep -q '^name: Update Minitiger Package Metadata' .github/workflows/minitiger-package-metadata.yml || fail "Metadata-Workflow-Name fehlt"
grep -q 'workflow_dispatch:' .github/workflows/minitiger-package-metadata.yml || fail "Metadata-Workflow ist nicht manuell startbar"
grep -q 'docker buildx imagetools create' .github/workflows/minitiger-package-metadata.yml || fail "imagetools Metadata-Update fehlt"
grep -q 'index:org.opencontainers.image.description=' .github/workflows/minitiger-package-metadata.yml || fail "Index Description Annotation fehlt"
if grep -q 'build-push-action' .github/workflows/minitiger-package-metadata.yml; then
  fail "Metadata-Workflow darf keinen Docker-Neubuild enthalten"
fi
ok "Metadata-only Workflow plausibel"

branch=$(git branch --show-current 2>/dev/null || true)
if [[ "$branch" == "minitiger-v12.1" ]]; then
  ok "Branch minitiger-v12.1"
else
  echo "[WARN] Aktueller Branch ist '${branch:-unbekannt}', erwartet wird minitiger-v12.1."
fi

echo
echo "Phase 18.4.3 ist statisch verifiziert."
echo "Nach dem Push Default Branch auf minitiger-v12.1 setzen und Package-Seite neu laden."
