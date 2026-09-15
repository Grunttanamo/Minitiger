# Übergabe für neuen Chat

Projekt: Jellyfin Custom Web UI `Minitiger Web`.

Aktueller Stand:
- Jellyfin Server: 12.1.0.
- Aktiver Entwicklungsbranch: `minitiger-v12.1`.
- Repository Default Branch ist bislang `minitiger-v12`.
- Sidecar `ghcr.io/grunttanamo/minitiger-web` Public, amd64+arm64, funktional getestet.
- Sidecar lokal 8098; Jellyfin 8096; 8097 OpenMediaVault.
- Desktop Client, Login, Home, Bibliotheken, Detailseiten und Playback funktionieren.
- Browser funktioniert über `/web/index.html`.

Aktueller Patch: Phase 18.4.3 GitHub Hero + Fast GHCR Metadata.
- neue README mit Minitiger Hero-Banner
- echtes animiertes GIF + PNG-Fallback
- README-/Doku-Push soll keinen Full Docker Build mehr triggern
- neuer manueller Workflow `Update Minitiger Package Metadata` ohne Image-Neubuild
- nach Push Default Branch auf `minitiger-v12.1` setzen
- danach Package-/Repo-Seite real prüfen

Regeln:
- Zu jedem Patch PowerShell-SCP-Befehl.
- Patch nur geänderte/neue Dateien + INSTALL/Changelog/files/VERIFY + Memory.
- Separate Memory-ZIP.
- Fix erst nach Nutzer-Test als bestätigt markieren.
