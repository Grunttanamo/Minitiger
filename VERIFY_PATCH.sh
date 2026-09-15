#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANGA="$ROOT_DIR/src/apps/modern/routes/minitiger/details/MinitigerMangaDetails.tsx"

printf '[18.3.7] Prüfe Manga-Parentzeile ... '
if grep -q "minitigerDetailsParentTitle" "$MANGA"; then
  echo 'FEHLER'
  echo 'Die Parent-/Bibliothekszeile ist in MinitigerMangaDetails.tsx noch vorhanden.' >&2
  exit 1
fi
echo 'OK'

printf '[18.3.7] Prüfe Docker-Dateien ... '
for f in \
  Dockerfile.minitiger \
  Dockerfile.minitiger.dockerignore \
  docker-compose.example.yml \
  docker/minitiger-entrypoint.sh \
  .github/workflows/minitiger-docker.yml \
  DOCKER_GITHUB_SETUP.md; do
  test -f "$ROOT_DIR/$f" || { echo "FEHLER: $f fehlt" >&2; exit 1; }
done
echo 'OK'

printf '[18.3.7] Prüfe Plugin-Quellprojekt im bestehenden Repo ... '
if [[ ! -f "$ROOT_DIR/tools/MinitigerVirtualSync/Jellyfin.Plugin.MinitigerVirtualSync.csproj" ]]; then
  echo 'FEHLER'
  echo 'Das Virtual-Sync-Projekt aus Phase 18.3.1 fehlt. Docker-Build wäre unvollständig.' >&2
  exit 1
fi
echo 'OK'

printf '[18.3.7] Prüfe EntryPoint-Shellsyntax ... '
sh -n "$ROOT_DIR/docker/minitiger-entrypoint.sh"
echo 'OK'

echo '[18.3.7] Patchmarker vollständig.'
