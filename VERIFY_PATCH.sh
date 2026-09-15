#!/usr/bin/env bash
set -euo pipefail

fail() { echo "[FAIL] $*" >&2; exit 1; }
ok()   { echo "[ OK ] $*"; }

[[ -f package.json ]] || fail "package.json fehlt – Patch im Repo-Root ausführen."
grep -q '"version": "12.1.0"' package.json || fail "Jellyfin-Web-Basis ist nicht 12.1.0."
ok "Jellyfin-Web-Basis 12.1.0 erkannt"

required=(
  Dockerfile.minitiger-sidecar
  .github/workflows/minitiger-sidecar.yml
  docker/minitiger-sidecar.conf.template
  docker-compose.sidecar.example.yml
  SIDECAR_SETUP.md
)
for f in "${required[@]}"; do
  [[ -f "$f" ]] || fail "$f fehlt"
done
ok "Sidecar-Basis vorhanden"

grep -q 'return 302 /web/index.html;' docker/minitiger-sidecar.conf.template || fail "Browser-Entry-Redirect fehlt"
count=$(grep -c 'return 302 /web/index.html;' docker/minitiger-sidecar.conf.template || true)
[[ "$count" -ge 3 ]] || fail "Nicht alle Einstiege /, /web und /web/ werden normalisiert"
grep -q 'location /web/' docker/minitiger-sidecar.conf.template || fail "/web/-Webroot fehlt"
grep -q 'proxy_pass ${JELLYFIN_URL};' docker/minitiger-sidecar.conf.template || fail "Jellyfin-Reverse-Proxy fehlt"
grep -q 'proxy_set_header Upgrade' docker/minitiger-sidecar.conf.template || fail "WebSocket-Upgrade fehlt"
ok "Browser-Entry + Web/API/WebSocket-Routen vorhanden"

grep -Fq '${MINITIGER_PORT:-8098}:80' docker-compose.sidecar.example.yml || fail "Konfigurierbarer Sidecar-Port fehlt"
if grep -Eq '/config|/cache|:/media' docker-compose.sidecar.example.yml; then
  fail "Sidecar Compose darf keine Jellyfin-Daten-/Medien-Volumes mounten"
fi
ok "Compose bleibt datenbank-/appdata-frei und Port ist konfigurierbar"

grep -q "docker/minitiger-sidecar.conf.template" .github/workflows/minitiger-sidecar.yml || fail "Workflow reagiert nicht auf nginx-Template"
ok "GitHub Workflow wird durch diesen Hotfix ausgelöst"

branch=$(git branch --show-current 2>/dev/null || true)
if [[ "$branch" == "minitiger-v12.1" ]]; then
  ok "Branch minitiger-v12.1"
else
  echo "[WARN] Aktueller Branch ist '${branch:-unbekannt}', erwartet wird minitiger-v12.1."
fi

echo
echo "Phase 18.4.1 ist statisch verifiziert."
echo "Der kurze Browser-Aufruf muss nach dem neuen GHCR-Build noch real getestet werden."
