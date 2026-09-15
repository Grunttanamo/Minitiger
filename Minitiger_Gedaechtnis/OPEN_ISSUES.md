# Offene Punkte nach Phase 18.5.0

## Direkt als Nächstes
1. Phase 18.5.0 auf `minitiger-v12.1` patchen, verifizieren, committen und pushen.
2. GitHub Action `Build Minitiger Virtual Sync Plugin` abwarten.
3. Nur wenn der Build grün ist: `Release Minitiger Virtual Sync Plugin` manuell mit Version `1.0.3.0` starten.
4. Prüfen, dass GitHub Release + ZIP + MD5 + Manifest-Eintrag automatisch entstanden sind.
5. Repository URL in Jellyfin hinzufügen, Plugin aus dem Catalog installieren und Jellyfin neu starten.
6. Minitiger Virtual-Library-Sync über den Sidecar real testen.

## Bekannter Komfortpunkt
- Browser kurz `http://IP:8098` funktioniert nicht sauber; bestätigter Browser-Pfad bleibt `/web/index.html`.
- Desktop Client funktioniert mit `http://IP:8098`.

## Noch nicht universell bestätigt
- Unraid Sidecar bei externem Tester.
- Jellyfin mit Base URL wie `/jellyfin`.
- Exotische externe Auth-/Reverse-Proxy-Konfigurationen.
- Plugin Installation/Update auf weiteren Jellyfin-12.x-Systemen.
