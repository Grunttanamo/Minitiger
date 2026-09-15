# Projektregeln

- Sprache: Nutzer bevorzugt Deutsch, locker/casual, gern ♥ / xD.
- Für Updates möglichst fertige ZIP-Patches liefern.
- Bei jedem neuen Minitiger-Web-Patch zusätzlich immer den passenden PowerShell-SCP-Befehl vom Windows-Downloads-Ordner zum Raspberry Pi mitsenden.
- Für Minitiger Web Patch-ZIPs mit geänderten Dateien + Changelog + Install + files.txt liefern.
- Ab jetzt zusätzlich IMMER `Minitiger_Gedaechtnis/` im Patch und separate Gedächtnis-ZIP mitliefern.
- Nicht behaupten, ein Fix sei erfolgreich, bevor Nutzer ihn bestätigt.
- Audioflaggen möglichst nicht anfassen.
- Lokale Trailer im Desktop Client sind seit 18.2.6-Familie funktionierend; nicht ohne Grund umbauen.
- Jellyfin Desktop greift auf Production unter Port 8096 zu, nicht auf Dev-Server 8080.
- Voller nativer Build findet auf dem Raspberry Pi statt; lokale Syntaxchecks ersetzen keinen semantischen Webpack-Build.
- Bei Buildfehlern komplette rote Fehlermeldung analysieren, keine blinden Folgepatches stapeln.
- Docker-Minitiger für Jellyfin 12 zunächst auf `jellyfin/jellyfin:12.0` pinnen, nicht ungeprüft `latest` verwenden.
- Docker/GHCR-Variante soll Minitiger Virtual Sync mit enthalten, nicht nur den Webclient.

## Gedächtnis-Paket
- Jeder neue Patch enthält ein `Minitiger_Gedaechtnis/`-Verzeichnis.
- Zusätzlich wird eine separate Gedächtnis-ZIP bereitgestellt.
- Status nur als „bestätigt“ markieren, wenn Nutzer es tatsächlich getestet hat.
