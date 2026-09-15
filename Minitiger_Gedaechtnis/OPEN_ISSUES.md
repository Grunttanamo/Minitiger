# Offene Punkte nach Phase 18.4.3

## Direkt als Nächstes
1. Phase 18.4.3 patchen, verifizieren, committen und pushen.
2. Prüfen, dass README-/Doku-Push keinen langen `Build Minitiger Sidecar` startet.
3. GitHub Default Branch von `minitiger-v12` auf `minitiger-v12.1` umstellen.
4. Repository- und GHCR-Package-Seite neu laden und prüfen, ob Banner + Minitiger-README sichtbar sind.
5. Bei Bedarf `Update Minitiger Package Metadata` manuell starten und Package-Kurzbeschreibung setzen.
6. Unraid-Test beim Kollegen.

## Bekannter, aktuell akzeptierter Komfortpunkt
- Browser kurz `http://IP:8098` funktioniert nicht sauber.
- Bestätigter Browser-Pfad: `http://IP:8098/web/index.html`.
- Desktop Client funktioniert mit `http://IP:8098`.

## Noch nicht universell bestätigt
- Jellyfin mit Base URL wie `/jellyfin`.
- Exotische externe Auth-/Reverse-Proxy-Konfigurationen.
- HTTPS direkt im Sidecar.

## Später
- Optionales Minitiger Virtual Sync Plugin als normale Jellyfin-Plugin-Repository-Installation.
