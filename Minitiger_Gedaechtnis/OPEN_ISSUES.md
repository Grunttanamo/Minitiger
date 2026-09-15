# Offene Punkte nach Phase 18.4.2

## Direkt als Nächstes
1. 18.4.2 patchen, committen und pushen.
2. GitHub Action `Build Minitiger Sidecar` muss erneut grün werden.
3. GHCR Package-Seite neu laden und prüfen, ob Description / Source / License sichtbar sind.
4. Optional GitHub Default Branch von `minitiger-v12` auf `minitiger-v12.1` umstellen, damit die neue Minitiger-README die Repository-Startseite bestimmt.
5. Unraid-Test beim Kollegen.

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
- README später optional mit echten Minitiger-Screenshots/Banner erweitern.
