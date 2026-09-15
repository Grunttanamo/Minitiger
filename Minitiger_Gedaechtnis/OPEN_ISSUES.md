# Offene Punkte nach Phase 18.4.1

## Direkt als Nächstes
1. 18.4.1 patchen, committen und pushen.
2. GitHub Action `Build Minitiger Sidecar` muss erneut grün werden.
3. `docker pull ghcr.io/grunttanamo/minitiger-web:latest` und Container auf 8098 neu erstellen.
4. Browser nur mit `http://IP:8098` testen; `/web/index.html` darf nicht mehr manuell nötig sein.
5. Login/Home/Detailseiten/Playback kurz erneut prüfen.
6. Längeres Playback und WebSocket/Session-Updates testen.
7. Sidecar stoppen/löschen und bestätigen, dass normales Jellyfin :8096 unverändert läuft.
8. Unraid-Test beim Kollegen.

## Noch nicht universell bestätigt
- Jellyfin mit Base URL wie `/jellyfin`.
- Exotische externe Auth-/Reverse-Proxy-Konfigurationen.
- HTTPS direkt im Sidecar.

## Später
- Optionales Minitiger Virtual Sync Plugin als normale Jellyfin-Plugin-Repository-Installation.
- GitHub README / öffentliche Installationsseite komplett auf Minitiger umstellen.
