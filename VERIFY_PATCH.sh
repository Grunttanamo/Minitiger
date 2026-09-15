#!/usr/bin/env bash
set -euo pipefail

fail() { echo "[FAIL] $*" >&2; exit 1; }
ok()   { echo "[ OK ] $*"; }

[[ -f package.json ]] || fail "package.json fehlt – Patch im Repo-Root ausführen."
grep -q '"version": "12.1.0"' package.json || fail "Jellyfin-Web-Basis ist nicht 12.1.0."
ok "Jellyfin-Web-Basis 12.1.0 erkannt"

PROJECT='tools/MinitigerVirtualSync/Jellyfin.Plugin.MinitigerVirtualSync.csproj'
[[ -f "$PROJECT" ]] || fail "Vorhandenes Minitiger Virtual Sync Projekt fehlt"
grep -q '<TargetFramework>net10.0</TargetFramework>' "$PROJECT" || fail "Plugin targetet nicht net10.0"
grep -q '<Version>1.0.3</Version>' "$PROJECT" || echo "[WARN] Plugin-Projektversion ist nicht mehr 1.0.3 – Release-Version bewusst prüfen."
ok "Vorhandenes .NET-10-Pluginprojekt erkannt"

required=(
  README.md
  PLUGIN_SETUP.md
  plugin-repository/manifest.json
  .github/workflows/minitiger-plugin-build.yml
  .github/workflows/minitiger-plugin-release.yml
  .github/scripts/update_plugin_manifest.py
)
for f in "${required[@]}"; do
  [[ -f "$f" ]] || fail "$f fehlt"
done
ok "Plugin-Repository-Dateien vorhanden"

python3 -m json.tool plugin-repository/manifest.json >/dev/null || fail "plugin-repository/manifest.json ist kein gültiges JSON"
python3 -m py_compile .github/scripts/update_plugin_manifest.py || fail "Manifest-Updater hat Python-Syntaxfehler"
ok "Manifest und Updater syntaktisch plausibel"

grep -q 'e4e52bec-56f8-4c38-88e4-4b862a3cb93b' plugin-repository/manifest.json || fail "Plugin GUID fehlt im Manifest"
grep -q '"name": "Minitiger Virtual Sync"' plugin-repository/manifest.json || fail "Plugin Name fehlt im Manifest"
grep -q '"versions": \[\]' plugin-repository/manifest.json || echo "[WARN] Manifest enthält bereits Releases – das ist nach dem ersten Release normal."
ok "Plugin-Metadaten plausibel"

grep -q '^name: Build Minitiger Virtual Sync Plugin' .github/workflows/minitiger-plugin-build.yml || fail "Plugin-Build-Workflow fehlt"
grep -q 'dotnet-version:.*10.0.x' .github/workflows/minitiger-plugin-build.yml || fail ".NET 10 fehlt im Plugin-Build"
grep -q '^name: Release Minitiger Virtual Sync Plugin' .github/workflows/minitiger-plugin-release.yml || fail "Plugin-Release-Workflow fehlt"
grep -q 'workflow_dispatch:' .github/workflows/minitiger-plugin-release.yml || fail "Plugin-Release ist nicht manuell startbar"
grep -q 'TARGET_ABI: 12.0.0.0' .github/workflows/minitiger-plugin-release.yml || fail "Jellyfin 12 Plugin ABI fehlt"
grep -q 'md5sum' .github/workflows/minitiger-plugin-release.yml || fail "MD5-Prüfsumme fehlt"
grep -q 'gh release create' .github/workflows/minitiger-plugin-release.yml || fail "GitHub Release Erstellung fehlt"
grep -q 'update_plugin_manifest.py' .github/workflows/minitiger-plugin-release.yml || fail "Automatische Manifest-Aktualisierung fehlt"
ok "Build-/Release-Workflows plausibel"

grep -q 'https://raw.githubusercontent.com/Grunttanamo/Minitiger/minitiger-v12.1/plugin-repository/manifest.json' PLUGIN_SETUP.md || fail "Repository URL fehlt in PLUGIN_SETUP.md"
grep -q 'Minitiger Virtual Sync' README.md || fail "README verweist nicht auf Companion Plugin"
ok "Plugin-Dokumentation plausibel"

if grep -q "tools/MinitigerVirtualSync" .github/workflows/minitiger-sidecar.yml 2>/dev/null; then
  fail "Plugin-only Änderungen dürfen den langen Sidecar-Build nicht triggern"
fi
ok "Plugin-Release ist vom Sidecar-Build getrennt"

branch=$(git branch --show-current 2>/dev/null || true)
if [[ "$branch" == "minitiger-v12.1" ]]; then
  ok "Branch minitiger-v12.1"
else
  echo "[WARN] Aktueller Branch ist '${branch:-unbekannt}', erwartet wird minitiger-v12.1."
fi

echo
echo "Phase 18.5.0 ist statisch verifiziert."
echo "Nach dem Push erst den Plugin-Build grün abwarten, dann den Release-Workflow manuell starten."
