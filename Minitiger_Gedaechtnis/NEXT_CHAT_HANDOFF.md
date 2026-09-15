# Übergabe für neuen Chat

Projekt: Jellyfin Custom Web UI `Minitiger Web`.

Aktueller Stand:
- Jellyfin Server: 12.1.0.
- Aktiver Branch: `minitiger-v12.1`.
- Minitiger selbst funktioniert nach der 12.1-Migration laut Nutzertest weiterhin.
- Sidecar-Image `ghcr.io/grunttanamo/minitiger-web` baut erfolgreich für amd64 + arm64 und ist Public.
- Lokaler Sidecar läuft auf Port 8098, normales Jellyfin auf 8096; 8097 ist durch OpenMediaVault belegt.

Bestätigter Sidecar-Test:
- Health HTTP 200.
- Jellyfin `/System/Info/Public` über Sidecar HTTP 200 / Version 12.1.0.
- Desktop Client über Sidecar funktioniert.
- Browser über `/web/index.html` funktioniert.
- Browser nur mit Host:Port zeigte vorher Jellyfins rote `Software Failure / Seite nicht gefunden`-Ansicht.

Aktueller Patch: Phase 18.4.1 Browser Entry Hotfix.
- nginx redirectet `/`, `/web`, `/web/` -> `/web/index.html`.
- Compose Host-Port konfigurierbar (`MINITIGER_PORT`, Default 8098).
- Nach Push neuen GHCR-Build abwarten, Image pullen, Container neu starten und kurzen Browser-Link testen.

Regeln:
- Zu jedem Patch PowerShell-SCP-Befehl.
- Patch nur geänderte/neue Dateien + INSTALL/Changelog/files/VERIFY + Memory.
- Separate Memory-ZIP.
- Fix erst nach Nutzer-Test als bestätigt markieren.
