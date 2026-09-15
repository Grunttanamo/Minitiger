# Letztes Nutzerfeedback – 2026-09-15

GitHub-/Docker-Setup:
1. SSH-Zugang vom Raspberry Pi zu GitHub wurde eingerichtet.
2. Der zunächst fehlschlagende Push war durch ein shallow Jellyfin-Web-Repository verursacht; nach `git fetch --unshallow origin` wurde `minitiger-v12` erfolgreich nach `github.com:Grunttanamo/Minitiger.git` gepusht.
3. GitHub Actions war anfangs deaktiviert und wurde anschließend aktiviert.
4. Der Workflow `Build Minitiger Docker` startete nach einem Trigger-Commit.
5. Der erste Docker-Build scheiterte nach ca. 44 Sekunden an:
   `mcr.microsoft.com/dotnet/sdk:10.0-bookworm-slim: not found`.

Phase 18.3.7.1 adressiert ausschließlich diesen konkreten Docker-Buildfehler durch Wechsel auf `mcr.microsoft.com/dotnet/sdk:10.0`.
