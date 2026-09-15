# Übergabe für neuen Chat

Projekt: Jellyfin Custom Web UI `Minitiger Web`.

Aktueller Stand:
- Jellyfin Server: 12.1.0.
- Aktiver Branch: `minitiger-v12.1`.
- Minitiger funktioniert nach 12.1-Migration.
- Sidecar-Image `ghcr.io/grunttanamo/minitiger-web` baut für amd64 + arm64, ist Public und funktional getestet.
- Lokaler Sidecar: Port 8098; normales Jellyfin: 8096; 8097 = OpenMediaVault.
- Desktop Client über Sidecar funktioniert.
- Login/Home/Bibliotheken/Detailseiten/Playback funktionieren.
- Browser bestätigt über `/web/index.html`.
- Kurzer Browser-Root-Link verliert beim 302 den externen Port; Nutzer akzeptiert vorerst die längere Browser-URL.

Aktueller Patch: Phase 18.4.2 GitHub / GHCR Package Page Polish.
- eigene `README.md`
- bessere OCI Labels
- Multi-Arch Index Annotations für GHCR description/license/source
- GitHub package page danach real prüfen
- danach optional Default Branch auf `minitiger-v12.1` setzen

Regeln:
- Zu jedem Patch PowerShell-SCP-Befehl.
- Patch nur geänderte/neue Dateien + INSTALL/Changelog/files/VERIFY + Memory.
- Separate Memory-ZIP.
- Fix erst nach Nutzer-Test als bestätigt markieren.
