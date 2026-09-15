# Offene Punkte nach Phase 18.5.1

## Direkt als Nächstes
1. Phase 18.5.1 auf `minitiger-v12.1` patchen, verifizieren, committen und pushen.
2. `Release Minitiger Virtual Sync Plugin` erneut manuell mit Version `1.0.3.0` starten.
3. Prüfen, dass der Workflow komplett grün wird.
4. Prüfen, dass GitHub Release `plugin-v1.0.3.0` und `Minitiger.VirtualSync_1.0.3.0.zip` existieren.
5. Prüfen, dass `plugin-repository/manifest.json` automatisch Version `1.0.3.0` enthält.
6. Repository URL in Jellyfin hinzufügen, Plugin aus Catalog installieren und Jellyfin neu starten.
7. Minitiger Virtual-Library-Sync über Sidecar real testen.

## Bekannter Komfortpunkt
- Browser kurz `http://IP:8098` funktioniert nicht sauber; bestätigter Browser-Pfad bleibt `/web/index.html`.
- Desktop Client funktioniert mit `http://IP:8098`.

## Noch nicht universell bestätigt
- Unraid Sidecar bei externem Tester.
- Jellyfin mit Base URL wie `/jellyfin`.
- Exotische externe Auth-/Reverse-Proxy-Konfigurationen.
- Plugin Installation/Update auf weiteren Jellyfin-12.x-Systemen.
