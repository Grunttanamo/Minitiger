#!/usr/bin/env bash
set -euo pipefail

fail() { echo "[FAIL] $*" >&2; exit 1; }
ok()   { echo "[ OK ] $*"; }

[[ -f package.json ]] || fail "package.json fehlt – Patch im Repo-Root ausführen."
grep -q '"version": "12.1.0"' package.json || fail "Jellyfin-Web-Basis ist nicht 12.1.0."
ok "Jellyfin-Web-Basis 12.1.0 erkannt"

required=(
  README.md
  Dockerfile.minitiger-sidecar
  .github/workflows/minitiger-sidecar.yml
  SIDECAR_SETUP.md
)
for f in "${required[@]}"; do
  [[ -f "$f" ]] || fail "$f fehlt"
done
ok "GitHub-/Sidecar-Dateien vorhanden"

grep -q '^# 🐯 Minitiger Web' README.md || fail "Neue Minitiger README fehlt"
grep -q 'ghcr.io/grunttanamo/minitiger-web:latest' README.md || fail "README Quick-Start Image fehlt"
grep -q 'GPL-2.0-or-later' README.md || fail "README Lizenzhinweis fehlt"
ok "Minitiger README plausibel"

grep -q 'org.opencontainers.image.description=' Dockerfile.minitiger-sidecar || fail "OCI Description Label fehlt"
grep -q 'org.opencontainers.image.licenses="GPL-2.0-or-later"' Dockerfile.minitiger-sidecar || fail "OCI Lizenz-Label fehlt"
grep -q 'org.opencontainers.image.source=' Dockerfile.minitiger-sidecar || fail "OCI Source Label fehlt"
ok "Dockerfile OCI-Metadaten vorhanden"

grep -q 'docker/metadata-action@v6' .github/workflows/minitiger-sidecar.yml || fail "docker/metadata-action fehlt"
grep -q 'DOCKER_METADATA_ANNOTATIONS_LEVELS: manifest,index' .github/workflows/minitiger-sidecar.yml || fail "Multi-Arch Index Annotation Level fehlt"
grep -q 'annotations:.*' .github/workflows/minitiger-sidecar.yml || fail "Annotations fehlen"
grep -q 'org.opencontainers.image.description=' .github/workflows/minitiger-sidecar.yml || fail "Workflow Description Metadata fehlt"
grep -q 'org.opencontainers.image.licenses=GPL-2.0-or-later' .github/workflows/minitiger-sidecar.yml || fail "Workflow License Metadata fehlt"
grep -q -- "- 'README.md'" .github/workflows/minitiger-sidecar.yml || fail "README triggert Sidecar-Build nicht"
ok "GHCR Multi-Arch-Metadaten Workflow plausibel"

branch=$(git branch --show-current 2>/dev/null || true)
if [[ "$branch" == "minitiger-v12.1" ]]; then
  ok "Branch minitiger-v12.1"
else
  echo "[WARN] Aktueller Branch ist '${branch:-unbekannt}', erwartet wird minitiger-v12.1."
fi

echo
echo "Phase 18.4.2 ist statisch verifiziert."
echo "Die sichtbare GHCR-Beschreibung muss nach dem neuen Multi-Arch-Build noch real geprüft werden."
