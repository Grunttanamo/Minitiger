#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKERFILE="$ROOT_DIR/Dockerfile.minitiger"

printf '[18.3.7.1] Prüfe Dockerfile ... '
test -f "$DOCKERFILE" || { echo 'FEHLER'; echo 'Dockerfile.minitiger fehlt.' >&2; exit 1; }
echo 'OK'

printf '[18.3.7.1] Prüfe entfernten ungültigen .NET-10-Bookworm-Tag ... '
if grep -q 'mcr.microsoft.com/dotnet/sdk:10.0-bookworm-slim' "$DOCKERFILE"; then
  echo 'FEHLER'
  echo 'Der nicht existente .NET-10-Bookworm-Tag ist noch vorhanden.' >&2
  exit 1
fi
echo 'OK'

printf '[18.3.7.1] Prüfe offiziellen .NET-10-SDK-Tag ... '
grep -q 'mcr.microsoft.com/dotnet/sdk:10.0 AS plugin-builder' "$DOCKERFILE" || {
  echo 'FEHLER'
  echo 'Die Plugin-Buildstage verwendet nicht den erwarteten offiziellen .NET-10-SDK-Tag.' >&2
  exit 1
}
echo 'OK'

printf '[18.3.7.1] Prüfe bestehendes Virtual-Sync-Projekt ... '
test -f "$ROOT_DIR/tools/MinitigerVirtualSync/Jellyfin.Plugin.MinitigerVirtualSync.csproj" || {
  echo 'FEHLER'
  echo 'Virtual-Sync-Projekt fehlt im Repo.' >&2
  exit 1
}
echo 'OK'

echo '[18.3.7.1] Docker-Hotfixmarker vollständig.'
