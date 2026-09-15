# Aktueller Projektstand – Phase 18.4.0

## Bestätigt funktionierend
- Minitiger Web 18.3.7.1 wurde auf Jellyfin Web 12.1 gemerged.
- Offizieller Upstream-Merge `v12.1` lief ohne Konflikte.
- Node 24.21.0 / npm 11.19.0 vorhanden; `npm ci` lief durch.
- Nutzer hat Jellyfin Server selbst auf 12.1 aktualisiert.
- Minitiger wurde gegen Jellyfin 12.1 getestet; Nutzerfeedback: „Scheint alles noch zu gehen“.
- Production-Build/Git-Schritte aus dem vorherigen Schritt wurden laut Nutzer ebenfalls erfolgreich abgeschlossen.
- GitHub Actions / GHCR Full-Server-Docker-Build aus 18.3.7.1 wurde grün; Multi-Arch Docker-Build funktioniert grundsätzlich.
- Phase 18.3.6: Home-Reihenabstand und Manga-Library-Root-Fix bestätigt.

## Phase 18.4.0 – neuer Teststand
- Neuer **Minitiger Web Sidecar** statt Austausch des bestehenden Jellyfin-Containers.
- Sidecar baut nur Minitiger Web und liefert es über nginx unter `/web/` aus.
- Alle anderen Requests werden an `JELLYFIN_URL` reverse-proxied.
- Standardziel: `http://host.docker.internal:8096`.
- Standard-Port außen: 8097 -> Container 80.
- Keine `/config`, `/cache` oder Medien-Volumes.
- Bestehende Jellyfin-Datenbank/Accounts/Appdata bleiben außerhalb des Sidecars.
- Neuer GHCR-Name: `ghcr.io/grunttanamo/minitiger-web`.
- Neuer Workflow: `Build Minitiger Sidecar`, Branch `minitiger-v12.1`, amd64 + arm64.

## Bewusst getrennt
- Das Minitiger Virtual Sync Companion Plugin wird im Sidecar nicht automatisch installiert.
- Ziel: bestehende Jellyfin-Installation nicht verändern.
- Optionales Plugin-Repository / einfache Plugin-Installation ist ein späterer Schritt.

## Nicht verändert
- Minitiger UI-Code.
- Trailer-Pipeline.
- Audioflaggen.
- Manga-Logik.
- Virtuelle Bibliothekslogik im Webclient.
