#!/usr/bin/env bash
set -euo pipefail

fail() { echo "[FAIL] $*" >&2; exit 1; }
ok()   { echo "[ OK ] $*"; }

[[ -f package.json ]] || fail "package.json fehlt – Patch im Repo-Root ausführen."
grep -q '"version": "12.1.0"' package.json || fail "Jellyfin-Web-Basis ist nicht 12.1.0."
ok "Jellyfin-Web-Basis 12.1.0 erkannt"

required=(
  Dockerfile.minitiger-sidecar
  Dockerfile.minitiger-sidecar.dockerignore
  .github/workflows/minitiger-sidecar.yml
  docker/minitiger-sidecar.conf.template
  docker-compose.sidecar.example.yml
  SIDECAR_SETUP.md
)
for f in "${required[@]}"; do
  [[ -f "$f" ]] || fail "$f fehlt"
done
ok "Alle Sidecar-Dateien vorhanden"

grep -q 'node:24-bookworm-slim' Dockerfile.minitiger-sidecar || fail "Node-24-Buildstage fehlt"
grep -q 'nginx:1.29-alpine' Dockerfile.minitiger-sidecar || fail "nginx-Runtime fehlt"
grep -q 'JELLYFIN_URL=http://host.docker.internal:8096' Dockerfile.minitiger-sidecar || fail "sicherer Standard-Jellyfin-Endpunkt fehlt"
ok "Sidecar Dockerfile plausibel"

grep -q 'location /web/' docker/minitiger-sidecar.conf.template || fail "/web/-Webroot fehlt"
grep -q 'proxy_pass ${JELLYFIN_URL};' docker/minitiger-sidecar.conf.template || fail "Jellyfin-Reverse-Proxy fehlt"
grep -q 'proxy_set_header Upgrade' docker/minitiger-sidecar.conf.template || fail "WebSocket-Upgrade fehlt"
grep -q 'proxy_buffering off' docker/minitiger-sidecar.conf.template || fail "Streaming-Konfiguration fehlt"
ok "nginx Web/API/WebSocket/Streaming-Routen vorhanden"

grep -q 'minitiger-v12.1' .github/workflows/minitiger-sidecar.yml || fail "Workflow lauscht nicht auf minitiger-v12.1"
grep -q 'minitiger-web' .github/workflows/minitiger-sidecar.yml || fail "GHCR Sidecar-Image fehlt"
grep -q 'linux/amd64,linux/arm64' .github/workflows/minitiger-sidecar.yml || fail "Multi-Arch fehlt"
ok "GitHub Sidecar Workflow plausibel"

if grep -Eq '/config|/cache|:/media' docker-compose.sidecar.example.yml; then
  fail "Sidecar Compose darf keine Jellyfin-Daten-/Medien-Volumes mounten"
fi
grep -q '8097:80' docker-compose.sidecar.example.yml || fail "Sidecar-Port 8097:80 fehlt"
grep -q 'host.docker.internal:host-gateway' docker-compose.sidecar.example.yml || fail "Docker-Host-Gateway fehlt"
ok "Compose ist datenbank-/appdata-frei"

branch=$(git branch --show-current 2>/dev/null || true)
if [[ "$branch" == "minitiger-v12.1" ]]; then
  ok "Branch minitiger-v12.1"
else
  echo "[WARN] Aktueller Branch ist '${branch:-unbekannt}', erwartet wird minitiger-v12.1."
fi

echo
echo "Phase 18.4.0 Sidecar-Dateien sind statisch verifiziert."
echo "Der echte Multi-Arch-Build und der Lauf gegen Jellyfin 12.1 müssen noch getestet werden."
