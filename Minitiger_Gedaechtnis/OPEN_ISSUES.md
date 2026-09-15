# Offene Punkte nach Phase 18.4.0

## Sidecar – als Nächstes testen
1. Phase 18.4.0 auf Branch `minitiger-v12.1` pushen.
2. GitHub Action `Build Minitiger Sidecar` muss grün durchlaufen.
3. Prüfen, ob GHCR `ghcr.io/grunttanamo/minitiger-web:latest` und `:12.1` erzeugt.
4. Sidecar parallel zum normalen Jellyfin starten: normal :8096, Minitiger :8097.
5. Prüfen: Login, Home, virtuelle Bibliotheken, Detailpages, Manga, Trailer, Audioflags, Playback.
6. Prüfen: WebSocket/Session-Updates und längeres Video-Streaming über nginx-Proxy.
7. Sidecar stoppen/löschen und bestätigen, dass normales Jellyfin unverändert weiterläuft.
8. Unraid-Test beim Kollegen.
9. GHCR-Paket ggf. auf Public stellen, damit Laien kein `docker login` benötigen.

## Noch nicht universell bestätigt
- Jellyfin mit nicht-standardmäßiger Base URL wie `/jellyfin`.
- Jellyfin hinter exotischen Auth-/Reverse-Proxy-Konfigurationen.
- HTTPS direkt im Sidecar (empfohlen ist später bestehender Reverse Proxy davor).

## Später
- Optionales Minitiger Virtual Sync Plugin als normale Jellyfin-Plugin-Repository-Installation.
- Minitiger GitHub README / öffentliche Installationsseite aufräumen.
