# Übergabe für neuen Chat

Projekt: Jellyfin 12 Custom Web UI `Minitiger Web`, Branch `minitiger-v12`, Source `~/minitiger-web`, Production nativ über `/opt/minitiger-web/dist` auf Port 8096.

Aktueller Patch: Phase 18.3.7.1. Voraussetzung: 18.3.7.

Wichtiger Docker/GitHub-Stand:
- GitHub-Repo: `Grunttanamo/Minitiger`, Branch `minitiger-v12`.
- SSH-Push vom Raspberry Pi funktioniert.
- Das Repo war ursprünglich shallow; nach `git fetch --unshallow origin` funktionierte der erste vollständige Push (~200 MiB).
- GitHub Actions wurde aktiviert.
- Workflow `Build Minitiger Docker` startet.
- Erster Lauf scheiterte konkret an `mcr.microsoft.com/dotnet/sdk:10.0-bookworm-slim: not found`.
- Ursache: .NET 10 hat keine Debian/Bookworm-Images.
- Phase 18.3.7.1 setzt die Plugin-Buildstage auf `mcr.microsoft.com/dotnet/sdk:10.0`.

Noch nicht bestätigt:
- 18.3.7 Manga-Parent-Cleanup.
- Vollständig grüner Docker/GHCR-Build.
- Docker-Lauf beim Kollegen.

Regeln:
- Zu jedem Patch PowerShell-SCP-Befehl mitsenden.
- Patch-ZIP nur geänderte Dateien + INSTALL/CHANGELOG/files/VERIFY + `Minitiger_Gedaechtnis/`.
- Separate Gedächtnis-ZIP ausgeben.
- Nichts als bestätigt markieren, bevor der Nutzer es getestet hat.
