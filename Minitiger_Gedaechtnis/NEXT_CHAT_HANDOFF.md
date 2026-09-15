# Übergabe für neuen Chat

Projekt: Jellyfin 12 Custom Web UI `Minitiger Web`, Branch `minitiger-v12`, Source `~/minitiger-web`, Production nativ über `/opt/minitiger-web/dist` auf Port 8096. Dev-Server bevorzugt auf Port 8080 testen; Production erst nach Nutzerbestätigung.

Aktueller Patch: Phase 18.3.7. Voraussetzung: 18.3.6.

Vom Nutzer bestätigt nach 18.3.6:
- Home-Reihenabstand funktioniert nun auch für virtuelle Bibliotheken korrekt.
- Einzelbände in der Comics/Books-Wurzel zeigen keine fremden `Weitere Bände` mehr.

Phase 18.3.7:
- Entfernt die klickbare Parent-/Bibliothekszeile (z.B. `Comics`) aus Minitiger-Manga/Buch-Detailpages.
- Fügt Docker/GitHub-Verteilung hinzu: `Dockerfile.minitiger`, GHCR GitHub Action, Compose-Beispiel, Startup-Wrapper für Minitiger Virtual Sync und `DOCKER_GITHUB_SETUP.md`.
- Docker-Basis absichtlich `jellyfin/jellyfin:12.0`, nicht `latest`.
- Multi-Arch Ziel: linux/amd64 + linux/arm64.

Wichtige Regeln:
- Trailer-Pipeline und funktionierende Audioflaggen-Sprachlogik nicht unnötig umbauen.
- Jeder Patch nur mit geänderten Dateien + INSTALL/CHANGELOG/files/VERIFY + `Minitiger_Gedaechtnis/`.
- Separates Gedächtnis-ZIP ausgeben.
- Zu jedem Patch den PowerShell-SCP-Befehl vom Windows-Downloads-Ordner zum Raspberry Pi mitgeben.
- Nichts als bestätigt markieren, bevor der Nutzer es getestet hat.
